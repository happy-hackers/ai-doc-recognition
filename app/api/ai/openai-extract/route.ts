import { NextResponse } from "next/server";
import { ocrPdfBufferOpenai } from "@/app/lib/ai/openAiFileClient";
import { filePrompts } from "@/app/lib/ai/Prompt";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const result = await ocrPdfBufferOpenai(
          buf,
          filePrompts.openai_ocr_generic
        );
        return { fileName: file.name, result };
      })
    );

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("[openai-extract] error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
