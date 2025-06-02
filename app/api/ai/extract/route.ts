
import { NextResponse } from "next/server";
import { processUploadedDocuments } from "@/app/lib/ai/documentProcessor";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const { results, mergedResult } = await processUploadedDocuments(formData);
    return NextResponse.json({ results, mergedResult });
  } catch (err: any) {
    console.error("[ai/extract] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
