
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

// Fix: Initializing GoogleGenAI using the process.env.API_KEY directly as required.
// Initializing GoogleGenAI lazily to avoid startup crashes if API key is missing.
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is not set in environment.");
  }
  return new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-avoid-crash' });
};

const ai = getAiClient();

export async function generateStructuredContent<T>(params: {
  model?: string;
  systemInstruction: string;
  prompt: string;
  schema: any;
}): Promise<T> {
  const model = params.model || 'gemini-3-flash-preview';

  const response = await ai.models.generateContent({
    model,
    contents: params.prompt,
    config: {
      systemInstruction: params.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: params.schema
    },
  });

  const text = (response as any).text;
  if (!text) throw new Error("No response from Gemini");

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    // Retry once with a fix prompt if JSON is invalid (Basic logic)
    const fixResponse = await ai.models.generateContent({
      model,
      contents: `Fix this invalid JSON to match the required schema: ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: params.schema
      }
    });
    const fixText = (fixResponse as any).text;
    return JSON.parse(fixText) as T;
  }
}

export async function chatWithGemini(systemInstruction: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) {
  const model = 'gemini-3-flash-preview';

  // Fix: Removed the redundant ai.chats.create and directly using generateContent for stateless conversation context.
  const contents = [...history, { role: 'user', parts: [{ text: message }] }];

  const response = await ai.models.generateContent({
    model,
    contents: contents as any,
    config: { systemInstruction }
  });

  return (response as any).text;
}
