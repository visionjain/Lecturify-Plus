import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Extend Vercel serverless function timeout to 60s (Hobby plan max)
// Gemini generation can take longer than the default 10s
export const maxDuration = 60; // 60s max on Vercel Hobby plan

// Ensure that `req` is correctly typed and handle potential missing API key
export async function POST(req: Request) {
  try {
    // Ensure GEMINI_API_KEY exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }

    // Create an instance of GoogleGenerativeAI with the API key
    const genAI = new GoogleGenerativeAI(apiKey);

    // Define the generation configuration parameters
    const generationConfig = {
      temperature: 1,
      top_p: 0.95,
      top_k: 64,
      max_output_tokens: 8192,
      response_mime_type: "text/plain",
    };

    // Initialize a generative model with configuration
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Gemini 2.5 Flash
      generationConfig: generationConfig, // Pass the generation configuration
      systemInstruction: "Professional and concise", // Set the system instruction
    });

    // Retrieve the data we receive as part of the request body
    const data = await req.json();
    const prompt = data.transcript;  // Extract the transcript sent by the client
    const type = data.type;          // Extract the content type (notes, quiz, etc.)


    // Generate content based on the type
    let result;

    // Define different prompts based on the content type
    if (type === "lectureNotes" || type === "notes") {
      result = await model.generateContent(`You are a professional note-taker. Given the following lecture transcript, generate detailed structured lecture notes of over 1000 words.

Rules:
- Output ONLY valid Markdown. Do NOT use any HTML tags.
- Structure: use # for the title, ## for major sections, ### for subsections.
- Use bullet points and numbered lists where appropriate.
- Add a blank line after every heading.
- Be thorough and capture all key concepts.

Lecture transcript:
${prompt}`);
    } else if (type === "quiz") {
      result = await model.generateContent(`You are a quiz generator. Given the following lecture transcript, generate 10 multiple choice questions (MCQs).

Rules:
- Output ONLY valid Markdown. Do NOT use any HTML tags.
- Format each question exactly like this:

**Question 1:** [Question text]

A) Option A
B) Option B
C) Option C
D) Option D

**Answer:** [Correct option letter] — [Brief explanation]

---

- Add a blank line between each question block.

Lecture transcript:
${prompt}`);
    } else if (type === "flashcards") {
      result = await model.generateContent(`You are an exam coach. Given the following lecture transcript, generate 5 scenario-based questions that test deep understanding.

Rules:
- Output ONLY valid Markdown. Do NOT use any HTML tags.
- Format each scenario exactly like this:

## Scenario [N]

**Situation:** [Describe a realistic scenario related to the lecture]

**Question:** [What should the student analyse or decide?]

**Key concepts tested:** [Comma-separated list]

---

Lecture transcript:
${prompt}`);
    } else if (type === "cheatsheet") {
      result = await model.generateContent(`You are a study guide creator. Given the following lecture transcript, generate a concise cheat sheet.

Rules:
- Output ONLY valid Markdown. Do NOT use any HTML tags.
- Use ## for section headers.
- Use bullet points (- ) for each fact/concept. At least 30 bullet points total.
- Keep each bullet point short and information-dense.
- Add a blank line after every section header.

Lecture transcript:
${prompt}`);
    } else {
      // Default to generating lecture notes if no valid type is provided
      result = await model.generateContent(`Generate lecture notes. Use markdown format: ${prompt}`);
    }

    // Await the response and parse the result
    const response = await result.response;
    const output = await response.text();

    // Send the generated content as a server response object
    return NextResponse.json({ output: output });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("generateResponse error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      console.error("generateResponse unknown error:", error);
      return NextResponse.json({ error: "An unknown error occurred." }, { status: 500 });
    }
  }
}
