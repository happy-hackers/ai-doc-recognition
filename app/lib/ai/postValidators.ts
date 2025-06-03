import type { z } from "zod";
import { OwnerListOutput } from "@/app/lib/ai/schemas";
import {
  extractOwnerListMarkdown,
  extractOwnerListDirectmistral,
} from "@/app/lib/ai/mistralClient";
import {
  extractOwnerListDirectopenai,
  llmParseOwnerBlock,
} from "@/app/lib/ai/openAiFileClient";

// Map digits to letters
const DIGIT_TO_LETTER: Record<string, string> = {
  "5": "S",
  "0": "O",
  "3": "J",
  "7": "J",
};

// Fix known OCR words
const STRING_TO_FIX: Record<string, string> = {
  NUNYIP: "BUNYIP",
};

// Match all digits
const DIGIT_REGEX = new RegExp(
  `[${Object.keys(DIGIT_TO_LETTER).join("")}]`,
  "g"
);

// Match fixable strings (case-insensitive)
const STRING_REGEX = new RegExp(Object.keys(STRING_TO_FIX).join("|"), "gi");

// Fix full name OCR errors
export function fixOwnerFullName(fullName: string): {
  corrected: string;
  changed: boolean;
} {
  // Replace digits with letters
  let corrected = fullName.replace(DIGIT_REGEX, (d) => DIGIT_TO_LETTER[d]);

  // Replace known incorrect words
  corrected = corrected.replace(STRING_REGEX, (s) => {
    const fixed = STRING_TO_FIX[s.toUpperCase()];
    return s[0] === s[0].toLowerCase()
      ? fixed[0].toLowerCase() + fixed.slice(1)
      : fixed;
  });

  return { corrected, changed: corrected !== fullName };
}

// Fix Lots[0].OwnerInformation.FullName
export function fixLetterOfAcquisitionLots(parsed: any) {
  const lot = parsed?.Lots?.[0];
  const oi = lot?.OwnerInformation;
  if (!oi?.FullName) return;

  const { corrected, changed } = fixOwnerFullName(oi.FullName);
  if (changed) {
    console.log(
      `[LetterOfAcquisition] 修正 FullName: "${oi.FullName}" → "${corrected}"`
    );
    oi.FullName = corrected;
  }
}

export function scrubImplicitDelivery(lots: any | any[], source: string) {
  const lotArray = Array.isArray(lots) ? lots : [lots];

  const hasLevyField = /Levy\s+Delivery\s+Method/i.test(source);
  const hasCorrField = /Correspondence\s+Delivery\s+Method/i.test(source);
  const bothFieldsMissing = !hasLevyField && !hasCorrField;

  if (!bothFieldsMissing) {
    console.info(
      "At least one delivery method field found - keeping all values."
    );
    return;
  }

  for (const lot of lotArray) {
    const info = lot?.OwnerInformation;
    if (!info) continue;

    if ("Levy Delivery Method" in info) {
      info["Levy Delivery Method"] = "";
    }

    if ("Correspondence Method" in info) {
      info["Correspondence Method"] = "";
    }

    console.warn(
      `Cleared both delivery method fields for lot ${info.LotNumber} — neither field name found in markdown.`
    );
  }
}

export function normalizePSNumber(
  parsed: z.infer<typeof OwnerListOutput>
): z.infer<typeof OwnerListOutput> {
  if (!parsed?.Lots?.length) return parsed;

  const firstPS = parsed.Lots.find((lot) => lot?.OwnerInformation?.PSNumber)
    ?.OwnerInformation?.PSNumber;
  if (!firstPS) return parsed;

  for (const lot of parsed.Lots) {
    if (lot?.OwnerInformation) {
      lot.OwnerInformation.PSNumber = firstPS;
    }
  }

  return parsed;
}

export function deduplicateOwnerEmails(
  parsed: z.infer<typeof OwnerListOutput>
): z.infer<typeof OwnerListOutput> {
  if (!parsed?.Lots) return parsed;

  for (const lot of parsed.Lots) {
    const info = lot.OwnerInformation;
    if (!info) continue;

    const emails = [
      info.AccountEmail ?? "",
      info.OtherContactEmails1 ?? "",
      info.OtherContactEmails2 ?? "",
      info.OtherContactEmails3 ?? "",
    ];

    const unique = Array.from(
      new Set(emails.filter((e) => e && e.trim() !== ""))
    );

    info.AccountEmail = unique[0] || "";

    info.OtherContactEmails1 = unique[1] || "";
    info.OtherContactEmails2 = unique[2] || "";
    info.OtherContactEmails3 = unique[3] || "";

    if (unique.length < emails.filter((e) => e && e.trim() !== "").length) {
      console.log(`[EmailDedup] Lot ${info.LotNumber}: deduped emails →`, {
        AccountEmail: info.AccountEmail,
        OtherContactEmails1: info.OtherContactEmails1,
        OtherContactEmails2: info.OtherContactEmails2,
        OtherContactEmails3: info.OtherContactEmails3,
      });
    }
  }

  return parsed;
}

export async function processOwnerList(
  buf: Buffer,
  prompt: string,
  chunkPrompt?: string
): Promise<{ parsed: any; markdown: string }> {
  const markdown = await extractOwnerListMarkdown(buf);
  let parsed: any = null;

  if (markdown.includes("CALLI OWNERS CORPORATION PTY LTD")) {
    console.log("[processOwnerList] deterministic row-pair parse (CALLI)");

    const rows = markdownToRows(markdown);
    const blocks = groupRows(rows);

    const psNumber = markdown.match(/O\/Corp\s+(PS\d+[A-Z]?)/i)?.[1] ?? "";

    const lots = await Promise.all(
      blocks.map((b, idx) => {
        console.log(`[processOwnerList] LLM owner ${idx + 1}/${blocks.length}`); // DEBUG
        return parseOwnerBlockLLM(b, psNumber);
      })
    );

    parsed = { Lots: lots };
  } else if (/Levy\s+Delivery\s+Method/i.test(markdown)) {
    // mistral
    console.log(
      "[processOwnerList] using mistral direct parse (Levy Delivery Method detected)"
    );
    parsed = await extractOwnerListDirectmistral(buf, prompt);
  } else {
    // openai
    console.log(
      "[processOwnerList] using openai direct parse (default fallback)"
    );
    parsed = await extractOwnerListDirectopenai(buf, prompt);
  }
  if (parsed?.Lots) {
    normalizePSNumber(parsed);
    scrubImplicitDelivery(parsed.Lots, markdown);
    deduplicateOwnerEmails(parsed);
  }

  return { parsed, markdown };
}

// Owner-List deterministic helpers

// row
export interface RawRow {
  lotOrCrn: string;
  unit: string;
  ownerCell: string;
  corrCell: string;
  levyCell: string;
  phoneCell: string;
}

// Lot+CRN
export interface OwnerBlock {
  first: RawRow; // Lot
  second: RawRow; // CRN
}

function normalizeMarkdown(md: string): string {
  // 行首不是 | ，但紧跟 CRN 或数字/G 前缀，且后面带竖线，就补一个 |
  return md.replace(/^(?!(\s*\|))/gm, (line) => {
    return /^(?:\s*(?:CRN|[A-Z]?\d+[A-Z]?))\s*\|/.test(line) ? `| ${line.trim()}` : line;
  });
}

export function markdownToRows(md: string): RawRow[] {
  // const lines = md.split("\n");
  const lines = normalizeMarkdown(md).split("\n");

  const rows: RawRow[] = [];
  let current: RawRow | null = null;

  for (const raw of lines) {
    if (!raw.trim().startsWith("|")) continue;

    // devide by pipe, remove spaces
    const cells = raw
      .replace(/`/g, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .split("|")
      .map((s) => s.trim());

    // first two cells are Lot/CRN and Unit
    const lot = cells[1] || "";
    const unit = cells[2] || "";

    // lot / CRN
    if (/^(?:[A-Z]*\d+[A-Z]*|CRN)$/i.test(lot)) {
      if (current) rows.push(current);
      current = {
        lotOrCrn: lot,
        unit: unit,
        ownerCell: cells[3] || "",
        corrCell: cells[4] || "",
        levyCell: cells[5] || "",
        phoneCell: cells[6] || "",
      };
      continue;
    }
    if (current) {
      current.ownerCell += "\n" + (cells[3] || "");
      current.corrCell += "\n" + (cells[4] || "");
      current.levyCell += "\n" + (cells[5] || "");
      current.phoneCell += "\n" + (cells[6] || "");
    }
  }
  if (current) rows.push(current);

  // DEBUG
  rows.forEach((r, i) =>
    console.log(
      `[RowParse] #${i} |${r.lotOrCrn}|${r.unit}|${r.ownerCell.slice(0, 40)}`
    )
  );
  return rows;
}

export function groupRows(rows: RawRow[]): OwnerBlock[] {
  const blocks: OwnerBlock[] = [];
  for (let i = 0; i < rows.length; ) {
    const first = rows[i];

    // 如果当前行就是 CRN（OCR 错位），跳过
    if (first.lotOrCrn.toUpperCase() === "CRN") {
      console.warn(`[GroupRows] stray CRN row @${i} – skipped`);
      i += 1;
      continue;
    }

    const second = rows[i + 1] && rows[i + 1].lotOrCrn.toUpperCase() === "CRN"
      ? rows[i + 1]
      : // 若缺失 CRN 行，用一个空占位，保证后续字段解析不报错
        { lotOrCrn: "CRN", unit: "", ownerCell: "", corrCell: "", levyCell: "", phoneCell: "" };

    blocks.push({ first, second });
    i += second === rows[i + 1] ? 2 : 1;      // 有配对跳 2，没配对跳 1
  }
  console.log(`[GroupRows] total owner blocks: ${blocks.length}`);
  return blocks;
}

//  ownerCell -> email
const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function extractOwnerEmails(ownerText: string): string[] {
  return Array.from(new Set(ownerText.match(EMAIL_REGEX) || []));
}

// address
const STATE = "(?:ACT|NSW|NT|QLD|SA|TAS|VIC|WA)";
const POSTCODE = "\\d{4}";
const STATE_POST_RX = new RegExp(
  `\\b${STATE}\\b[^\\d]*\\b(${POSTCODE})\\b`,
  "i"
);

// General Correspondence -> address
function parseCorrAddress(lines: string[]): null | {
  Street: string;
  City: string;
  State: string;
  PostalCode: string;
} {
  // 1) delete br
  const cleanLines = lines
    .map((l) =>
      l
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  if (!cleanLines.length) return null;

  // 2) get first number from first line
  const firstLine = cleanLines[0];
  const numIdx = firstLine.search(/\d/);
  if (numIdx === -1) return null;

  let combined = firstLine.slice(numIdx).trim();

  // 3) combine with second line
  if (cleanLines[1] && STATE_POST_RX.test(cleanLines[1])) {
    combined += " " + cleanLines[1];
  }

  // 4) parse
  const rx = new RegExp(
    `^(.*?\\d+\\s+[^,\\d]+?)\\s+([A-Za-z ]+)\\s+(${STATE})\\s+(${POSTCODE})$`,
    "i"
  );
  const m = combined.match(rx);
  if (!m) return null;

  const [, street, city, state, pc] = m;
  return {
    Street: street.trim(),
    City: city.trim().toUpperCase(),
    State: state.toUpperCase(),
    PostalCode: pc,
  };
}
async function parseOwnerBlockLLM(block: OwnerBlock, psNumber: string) {
  const lotJson = await llmParseOwnerBlock(
    psNumber,
    block.first.lotOrCrn,
    block.first.unit,
    [block.first.corrCell, block.second.corrCell],
    [block.first.phoneCell, block.second.phoneCell]
  );

  if (!lotJson) throw new Error("LLM 返回空 lot");

  // rewrite email
  const emails = extractOwnerEmails(
    `${block.first.ownerCell}\n${block.second.ownerCell}`
  );
  const info = lotJson.OwnerInformation;
  info.AccountEmail = emails[0] || "";
  info.OtherContactEmails1 = emails[1] || "";
  info.OtherContactEmails2 = emails[2] || "";
  info.OtherContactEmails3 = emails[3] || "";

  // check and combine address
  const addr = parseCorrAddress([block.first.corrCell, block.second.corrCell]);
  if (addr) info.OwnerPostalAddress = addr;

  return lotJson;
}
