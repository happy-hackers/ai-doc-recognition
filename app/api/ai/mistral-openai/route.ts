import { NextResponse } from "next/server";
import { ocrPdfBuffer } from "@/app/lib/ai/mistralClient";
import { analyzeMarkdownWithOpenAI } from "@/app/lib/ai/openAiFileClient";
import { filePrompts } from "@/app/lib/ai/Prompt";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());

        // 1) Mistral OCR ➜ Markdown
        const markdown = await ocrPdfBuffer(buf);

        // 2) OpenAI 分析 Markdown
        const openaiText = await analyzeMarkdownWithOpenAI(
          markdown,
          filePrompts.openai_markdown_analysis
        );

        return {
          fileName: file.name,
          markdown,
          openai: openaiText,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("[mistral-openai] error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
