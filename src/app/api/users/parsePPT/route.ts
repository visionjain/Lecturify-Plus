import { NextResponse } from "next/server";
import PptxParser from "node-pptx-parser";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  let tempPath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      return NextResponse.json(
        { error: "Only .pptx files are supported." },
        { status: 400 }
      );
    }

    // Write file to a temp path so node-pptx-parser can read it via filePath
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    tempPath = join(tmpdir(), `${randomUUID()}.pptx`);
    await writeFile(tempPath, buffer);

    // Parse using node-pptx-parser (requires a file path)
    const parser = new PptxParser(tempPath);
    const slides = await parser.extractText(); // returns SlideTextContent[]

    // Build readable "Slide N:\n<text>" blocks
    const extractedText = slides
      .map((slide, i) => {
        const slideText = (slide.text || []).join(" ").trim();
        return `Slide ${i + 1}:\n${slideText}`;
      })
      .filter((s) => {
        const body = s.replace(/^Slide \d+:\n?/, "").trim();
        return body.length > 0;
      })
      .join("\n\n");

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "No text content found in the uploaded PPT." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: extractedText });
  } catch (error: unknown) {
    console.error("parsePPT error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Always clean up the temp file
    if (tempPath) {
      unlink(tempPath).catch(() => {});
    }
  }
}
