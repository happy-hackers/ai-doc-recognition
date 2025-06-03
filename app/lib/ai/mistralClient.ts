import { Mistral } from "@mistralai/mistralai";
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
} from "@/app/lib/ai/schemas";

const apiKey = process.env.MISTRAL_API_KEY!;
const client = new Mistral({ apiKey });

/**
 * 1) 将 PDF Buffer 上传给 Mistral OCR，获取纯文本（Markdown）结果
 */
export async function ocrPdfBuffer(buffer: Buffer): Promise<string> {
  // 上传文件供 OCR 使用
  const uploaded = await client.files.upload({
    file: {
      fileName: "document.pdf",
      content: buffer,
    },
    purpose: "ocr",
  });

  // 获取签名 URL
  const { url } = await client.files.getSignedUrl({
    fileId: uploaded.id,
    expiry: 1, // 1 小时有效
  });

  // 调用 OCR
  const ocrResponse = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: url,
    },
    includeImageBase64: true,
  });

  // 拼接每页的 Markdown 文本
  return ocrResponse.pages.map((p) => p.markdown).join("\n\n---\n\n");
}

/**
 * 合并多段 OCR 文本片段
 */
export function integrateMarkdownFragments(
  fragments: Record<string, string>
): string {
  return Object.values(fragments).join("\n\n---\n\n");
}

/**
 * 通用：上传 PDF 并返回签名下载 URL
 */
async function uploadPdfAndGetUrl(buffer: Buffer): Promise<string> {
  const uploaded = await client.files.upload({
    file: { fileName: "pdf", content: buffer },
    purpose: "ocr",
  });
  const { url } = await client.files.getSignedUrl({ fileId: uploaded.id });
  return url;
}

/**
 * POS PDF
 */
export async function extractPlanOfSubdivisionDirect(
  buffer: Buffer,
  prompt: string
): Promise<PlanOfSubdivisionResult> {
  const documentUrl = await uploadPdfAndGetUrl(buffer);
  await delay(200);
  const chatResponse = await client.chat.parse({
    // model: "pixtral-12b-latest",
    model: "mistral-small-latest",
    messages: [
      {
        role: "system",
        content:
          "Your output must follow this schema: " + PlanOfSubdivisionOutput,
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "document_url", documentUrl },
        ],
      },
    ],
    responseFormat: PlanOfSubdivisionOutput,
    temperature: 0,
  });
  await delay(200);
  return chatResponse.choices?.[0]?.message?.parsed ?? null;
}

/**
 * LetterOfAcquisition PDF
 */
export async function extractLetterOfAcquisitionDirect(
  buffer: Buffer,
  prompt: string
): Promise<LetterOfAcquisitionResult> {
  const documentUrl = await uploadPdfAndGetUrl(buffer);
  await delay(200);
  const chatResponse = await client.chat.parse({
    model: "mistral-small-latest",
    //   model: "pixtral-12b",
    //   model: "pixtral-large-latest",
    messages: [
      {
        role: "system",
        content:
          "Your output must follow this schema: " + LetterOfAcquisitionOutput,
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "document_url", documentUrl },
        ],
      },
    ],
    responseFormat: LetterOfAcquisitionOutput,
    temperature: 0,
  });
  await delay(200);
  return chatResponse.choices?.[0]?.message?.parsed ?? null;
}

async function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function parseWithRetry(options: any) {
  let backoff = 300;
  for (let i = 0; i < 3; i++) {
    try {
      return await client.chat.parse(options);
    } catch (err: any) {
      if (err.statusCode === 429 && i < 2) {
        await new Promise((r) => setTimeout(r, backoff));
        backoff *= 2;
        continue;
      }
      throw err;
    }
  }
}

// Direct extractors
export async function extractManagingAuthorityFormDirect(
  buffer: Buffer,
  prompt: string
) {
  const documentUrl = await uploadPdfAndGetUrl(buffer);
  const resp = await parseWithRetry({
    model: "mistral-small-latest",
    messages: [
      {
        role: "system",
        content: "Output must follow schema: " + ManagingAuthorityFormOutput,
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "document_url", documentUrl },
        ],
      },
    ],
    responseFormat: ManagingAuthorityFormOutput,
    temperature: 0,
  });

  return resp?.choices?.[0]?.message?.parsed ?? null;
}

export async function extractInsuranceInvoiceDirect(
  buffer: Buffer,
  prompt: string
) {
  const documentUrl = await uploadPdfAndGetUrl(buffer);
  const resp = await parseWithRetry({
    // model: "mistral-small-latest",
    model: "pixtral-12b-latest",
    messages: [
      {
        role: "system",
        content: "Output must follow schema: " + InsuranceInvoiceOutput,
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "document_url", documentUrl },
        ],
      },
    ],
    responseFormat: InsuranceInvoiceOutput,
    temperature: 0,
  });
  return resp?.choices?.[0]?.message?.parsed ?? null;
}

export async function extractInsuranceCoCDirect(
  buffer: Buffer,
  prompt: string
) {
  const documentUrl = await uploadPdfAndGetUrl(buffer);
  const resp = await parseWithRetry({
    // model: "pixtral-12b-latest",
    // model: "pixtral-large-latest",
    model: "mistral-small-latest",
    messages: [
      {
        role: "system",
        content: "Output must follow schema: " + InsuranceCoCOutput.description,
        //   "You are an intelligent document parser. Your task is to extract insurance-related information from the given document.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "document_url", documentUrl },
        ],
      },
    ],
    responseFormat: InsuranceCoCOutput,
    temperature: 0,
  });
  return resp?.choices?.[0]?.message?.parsed ?? null;
}

export async function extractInsuranceValuationReportDirect(
  buffer: Buffer,
  prompt: string
) {
  const documentUrl = await uploadPdfAndGetUrl(buffer);
  const resp = await parseWithRetry({
    // model: "mistral-small-latest",
    model: "pixtral-12b-latest",
    messages: [
      {
        role: "system",
        content: "Output must follow schema: " + InsuranceValuationReportOutput,
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "document_url", documentUrl },
        ],
      },
    ],
    responseFormat: InsuranceValuationReportOutput,
    temperature: 0,
  });
  return resp?.choices?.[0]?.message?.parsed ?? null;
}

export async function extractOwnerListDirectmistral(
  buffer: Buffer,
  prompt: string
) {
  const documentUrl = await uploadPdfAndGetUrl(buffer);
  const resp = await parseWithRetry({
    model: "mistral-small-latest",
    // model: "pixtral-12b-latest",
    messages: [
      {
        role: "system",
        content: "Output must follow schema: " + OwnerListOutput,
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "document_url", documentUrl },
        ],
      },
    ],
    responseFormat: OwnerListOutput,
    temperature: 0,
  });
  return resp?.choices?.[0]?.message?.parsed ?? null;
}

export async function extractOwnerListMarkdown(
  buffer: Buffer
): Promise<string> {
  const uploaded = await client.files.upload({
    file: { fileName: "ownerlist.pdf", content: buffer },
    purpose: "ocr",
  });
  const { url } = await client.files.getSignedUrl({ fileId: uploaded.id });

  const ocrResponse = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: { type: "document_url", documentUrl: url },
  });

  return ocrResponse.pages.map((p) => p.markdown).join("\n\n---\n\n");
}
