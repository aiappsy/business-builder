
import { Type } from "@google/genai";
import { generateStructuredContent } from "./gemini";

// --- Schemas ---

export const IdeaBriefSchema = {
  type: Type.OBJECT,
  properties: {
    niche: { type: Type.STRING },
    targetCustomer: { type: Type.STRING },
    coreProblem: { type: Type.STRING },
    solutionPromise: { type: Type.STRING },
    monetizationModel: { type: Type.STRING },
    channels: { type: Type.ARRAY, items: { type: Type.STRING } },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
    nextQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["niche", "targetCustomer", "coreProblem", "solutionPromise", "monetizationModel"]
};

export const ResearchReportSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    demandSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
    competitors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          positioning: { type: Type.STRING },
          notes: { type: Type.STRING }
        }
      }
    },
    pricingBenchmarks: { type: Type.ARRAY, items: { type: Type.STRING } },
    viabilityScore: { type: Type.NUMBER },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendedNextMove: { type: Type.STRING }
  },
  required: ["summary", "viabilityScore"]
};

export const BrandKitSchema = {
  type: Type.OBJECT,
  properties: {
    nameOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
    taglines: { type: Type.ARRAY, items: { type: Type.STRING } },
    positioningStatement: { type: Type.STRING },
    voice: {
      type: Type.OBJECT,
      properties: {
        tone: { type: Type.ARRAY, items: { type: Type.STRING } },
        do: { type: Type.ARRAY, items: { type: Type.STRING } },
        dont: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    messagingPillars: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pillar: { type: Type.STRING },
          proof: { type: Type.STRING }
        }
      }
    },
    basicVisualDirection: { type: Type.STRING }
  },
  required: ["nameOptions", "positioningStatement"]
};

// --- Agent Executors ---

export async function runIdeationSummarizer(transcript: string) {
  return generateStructuredContent({
    systemInstruction: "You are an expert business consultant. Summarize the following chat transcript into a formal Idea Brief JSON.",
    prompt: `Chat Transcript:\n${transcript}`,
    schema: IdeaBriefSchema
  });
}

export async function runResearchAgent(brief: any) {
  return generateStructuredContent({
    systemInstruction: "You are a market research analyst. Based on this business brief, simulate market research and provide a detailed report JSON.",
    prompt: `Business Brief:\n${JSON.stringify(brief)}`,
    schema: ResearchReportSchema
  });
}

export async function runBrandingAgent(brief: any, research: any) {
  return generateStructuredContent({
    systemInstruction: "You are a brand strategist. Create a full brand kit based on the brief and market research provided.",
    prompt: `Brief: ${JSON.stringify(brief)}\nResearch: ${JSON.stringify(research)}`,
    schema: BrandKitSchema
  });
}
