import { NextResponse } from "next/server";
import { ocrPdfBuffer } from "@/app/lib/ai/mistralClient";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const markdown = await ocrPdfBuffer(buf);
        return { fileName: file.name, markdown };
      })
    );

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("[mistral-ocr] error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
