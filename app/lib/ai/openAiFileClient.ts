import fs from "fs";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
import { zodResponseFormat } from "openai/helpers/zod";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import {
  LetterOfAcquisitionOutput,
  LetterOfAcquisitionResult,
  PlanOfSubdivisionOutput,
  PlanOfSubdivisionResult,
  ManagingAuthorityFormOutput,
  InsuranceInvoiceOutput,
  InsuranceCoCOutput,
  InsuranceValuationReportOutput,
  OwnerListOutput,
  InvoiceOutput,
  InvoiceResult,
  InsuranceQuotationOutput,
  InsuranceQuotationResult,
  MarkdownAnalysisOutput,
} from "@/app/lib/ai/schemas";

export async function uploadPdfAndGetFileId(
  buffer: Buffer,
  fileName = "document.pdf"
): Promise<string> {
  const uid = uuidv4();
  const tempPath = path.join("/tmp", `${uid}-${fileName}`);
  await fs.promises.writeFile(tempPath, buffer);
  const file = await openai.files.create({
    file: fs.createReadStream(tempPath),
    purpose: "user_data",
  });
  fs.promises.unlink(tempPath).catch(() => {});

  return file.id;
}
export async function extractPlanOfSubdivisionDirect(
  buffer: Buffer,
  prompt: string
): Promise<PlanOfSubdivisionResult | null> {
  const fileId = await uploadPdfAndGetFileId(buffer);
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            file: {
              file_id: fileId,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: zodResponseFormat(PlanOfSubdivisionOutput, "plan"),
    temperature: 0,
  });
  console.log("openai pdf parsed:", completion);
  return JSON.parse(completion.choices[0]?.message?.content ?? "null");
}

export async function extractLetterOfAcquisitionDirect(
  buffer: Buffer,
  prompt: string
): Promise<LetterOfAcquisitionResult | null> {
  const fileId = await uploadPdfAndGetFileId(buffer);
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "file", file: { file_id: fileId } },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: zodResponseFormat(LetterOfAcquisitionOutput, "letter"),
    temperature: 0,
  });
  return completion.choices[0]?.message?.parsed ?? null;
}

export async function extractManagingAuthorityFormDirect(
  buffer: Buffer,
  prompt: string
) {
  const fileId = await uploadPdfAndGetFileId(buffer);
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "file", file: { file_id: fileId } },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: zodResponseFormat(
      ManagingAuthorityFormOutput,
      "authority"
    ),
    temperature: 0,
  });
  return completion.choices[0]?.message?.parsed ?? null;
}

export async function extractInsuranceInvoiceDirect(
  buffer: Buffer,
  prompt: string
) {
  const fileId = await uploadPdfAndGetFileId(buffer);
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "file", file: { file_id: fileId } },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: zodResponseFormat(InsuranceInvoiceOutput, "invoice"),
    temperature: 0,
  });
  return completion.choices[0]?.message?.parsed ?? null;
}

export async function extractInsuranceCoCDirect(
  buffer: Buffer,
  prompt: string
) {
  const fileId = await uploadPdfAndGetFileId(buffer);
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "file", file: { file_id: fileId } },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: zodResponseFormat(InsuranceCoCOutput, "coc"),
    temperature: 0,
  });
  return completion.choices[0]?.message?.parsed ?? null;
}

export async function extractInsuranceValuationReportDirect(
  buffer: Buffer,
  prompt: string
) {
  const fileId = await uploadPdfAndGetFileId(buffer);
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "file", file: { file_id: fileId } },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: zodResponseFormat(
      InsuranceValuationReportOutput,
      "valuation"
    ),
    temperature: 0,
  });
  return completion.choices[0]?.message?.parsed ?? null;
}

export async function extractOwnerListDirectopenai(
  buffer: Buffer,
  prompt: string
) {
  const fileId = await uploadPdfAndGetFileId(buffer);
  const completion = await openai.beta.chat.completions.parse({
    // model: "o4-mini",
    // model:"o3",
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "file", file: { file_id: fileId } },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: zodResponseFormat(OwnerListOutput, "ownerlist"),
    // temperature: 0,
  });
  //   console.log("openai pdf parsed:", completion.choices[0]?.message);
  return completion.choices[0]?.message?.parsed ?? null;
}

export async function extractInvoiceDirect(
  buffer: Buffer,
  prompt: string
): Promise<InvoiceResult | null> {
  const fileId = await uploadPdfAndGetFileId(buffer);
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "file", file: { file_id: fileId } },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: zodResponseFormat(InvoiceOutput, "invoice"),
    temperature: 0,
  });
  return completion.choices[0]?.message?.parsed ?? null;
}

export async function extractInsuranceQuotationDirect(
  buffer: Buffer,
  prompt: string
): Promise<InsuranceQuotationResult | null> {
  const fileId = await uploadPdfAndGetFileId(buffer);
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "file", file: { file_id: fileId } },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: zodResponseFormat(InsuranceQuotationOutput, "quote"),
    temperature: 0,
  });
  return completion.choices[0]?.message?.parsed ?? null;
}

export async function parseOwnerListFromMarkdown(
  markdown: string,
  prompt: string
) {
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    // model: "o4-mini",
    // model: "o3",
    // model: "gpt-4.1",
    // model: "o3-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an information-extraction specialist. Your job is to read Markdown owner-list tables and return valid JSON that conforms to the schema",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `The following is a task instruction:\n\n${prompt}`,
          },
          {
            type: "text",
            text: `The following is the input document in Markdown format:\n\n${markdown}`,
          },
        ],
      },
    ],
    response_format: zodResponseFormat(OwnerListOutput, "ownerlist"),
    temperature: 0,
  });
  return completion.choices[0]?.message?.parsed ?? null;
}

export async function llmParseOwnerBlock(
  psNumber: string,
  lotNumber: string,
  unitNumber: string,
  corrLines: string[],
  phoneLines: string[]
) {

  const prompt = `
PSNumber: ${psNumber}
LotNumber: ${lotNumber}
UnitNumber: ${unitNumber}

GeneralCorrespondenceColumn:
${corrLines[0]}
${corrLines[1]}

PhoneColumn:
${phoneLines[0]}
${phoneLines[1]}


Task:
1) Extract FullName, OwnerPostalAddress, and OwnerMobileNumber.
2) Do not output any email fields.
3) Only return JSON that strictly matches the expected schema.
`.trim();

  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    temperature: 0,
    response_format: zodResponseFormat(OwnerListOutput, "ownerlist"),
    messages: [
      {
        role: "system",
        content: "You are an expert in structured data extraction.",
      },
      { role: "user", content: prompt },
    ],
  });

  return completion.choices[0].message.parsed?.Lots?.[0] ?? null;
}

export async function ocrPdfBufferOpenai(
    buffer: Buffer,
    prompt: string
  ): Promise<string> {
    const fileId = await uploadPdfAndGetFileId(buffer, "ocr-document.pdf");
  
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            { type: "file", file: { file_id: fileId } },
            {
              type: "text",
              text: "Extract all visible text from this PDF, preserving basic layout.",
            },
          ],
        },
      ],
    });
  
    return completion.choices[0]?.message?.content ?? "";
  }

  export async function analyzeMarkdownWithOpenAI(
    markdown: string,
    prompt: string
  ): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: zodResponseFormat(MarkdownAnalysisOutput, "analysis"),
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: markdown},
      ],
    });
    return completion.choices[0]?.message?.content ?? "";
  }