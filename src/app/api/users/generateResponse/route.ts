import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

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
      result = await model.generateContent(`Here given is a lecture. Generate lecture notes of the lecture that is over 1000 words long. Ensure that these notes captures the significant details of the text in over 1000 words. Output this 1000 word notes using basic html formatting and styling. it must be in markdown and structure into title, paragraph, lists and after every heading give a line space: ${prompt}`);
    } else if (type === "quiz") {
      result = await model.generateContent(`Here given is a lecture. Generate 10 lecture MCQ . Ensure that these MCQ captures the significant details of the text. Output this MCQ using basic formatting. it must be in markdown and structure into Question, Options and Answer and after every heading give a line space. : ${prompt}`);
    } else if (type === "flashcards") {
      result = await model.generateContent(`Here given is a lecture. Generate 5 Scenrio Questions . Ensure that these Questions captures the significant details of the text. Output this Questions using basic formatting. it must be in markdown and structure into Question and after every heading give a line space.: ${prompt}`);
    } else if (type === "cheatsheet") {
      result = await model.generateContent(`Generate a cheatsheet from the above given lecture. It should have atleast 30 bullet points Output this in markdown and after every heading give a line space.: ${prompt}`);
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
    // Assert the error is of type Error, or narrow the type first
    if (error instanceof Error) {
      console.error(error.message);  // Now you can access `message` and other properties safely
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      console.error("Unknown error", error);
      return NextResponse.json({ error: "An unknown error occurred." }, { status: 500 });
    }
  }
}
