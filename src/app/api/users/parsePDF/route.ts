import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only .pdf files are supported." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Import internal parser entry to avoid pdf-parse package root debug code.
    const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = pdfParseModule.default;
    const parsed = await pdfParse(buffer);
    const extractedText = (parsed.text || "").trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: "No text content found in the uploaded PDF." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: extractedText });
  } catch (error: unknown) {
    console.error("parsePDF error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
