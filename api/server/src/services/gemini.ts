
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is required");

const ai = new GoogleGenAI({ apiKey });

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

  const text = response.text;
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
    return JSON.parse(fixResponse.text) as T;
  }
}

export async function chatWithGemini(systemInstruction: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) {
  const model = 'gemini-3-flash-preview';
  const chat = ai.chats.create({
    model,
    config: { systemInstruction }
  });

  // Re-play history
  // Since our helper doesn't expose the underlying chat instance history easily, 
  // we use the contents array for generateContent as a stateless chat.
  const contents = [...history, { role: 'user', parts: [{ text: message }] }];
  
  const response = await ai.models.generateContent({
    model,
    contents: contents as any,
    config: { systemInstruction }
  });

  return response.text;
}
