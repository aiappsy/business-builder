
import { Router } from 'express';
import {
  projectsCol,
  getProject,
  getArtifacts,
  getRuns,
  createRun,
  updateRun,
  saveArtifact
} from '../services/firestore';
import { chatWithGemini } from '../services/gemini';
import { runIdeationSummarizer, runResearchAgent, runBrandingAgent } from '../services/agents';

export const projectRouter = Router();

// Create Project
projectRouter.post('/', async (req, res) => {
  const { name } = req.body;
  const projectRef = projectsCol.doc();
  const project = {
    name: name || 'Untitled Venture',
    currentStage: 1,
    createdAt: new Date().toISOString(),
    chatHistory: []
  };
  await projectRef.set(project);
  res.json({ id: projectRef.id, ...project });
});

// Get Project + Full State
projectRouter.get('/:id', async (req, res) => {
  const project = await getProject(req.params.id);
  if (!project) return res.status(404).send('Not found');

  const artifacts = await getArtifacts(req.params.id);
  const runs = await getRuns(req.params.id);

  res.json({ project, artifacts, runs });
});

// Chat (Stage 1)
projectRouter.post('/:id/chat', async (req, res) => {
  const { message } = req.body;
  const project = await getProject(req.params.id) as any;
  if (!project) return res.status(404).send('Not found');

  const systemPrompt = "You are the 'Idea Architect'. Your goal is to interview the user about their business idea to fill out a brief. Ask about the niche, problem, solution, and customers. Be conversational and probing.";
  const aiResponse = await chatWithGemini(systemPrompt, project.chatHistory, message);

  const updatedHistory = [
    ...project.chatHistory,
    { role: 'user', parts: [{ text: message }] },
    { role: 'model', parts: [{ text: aiResponse }] }
  ];

  await projectsCol.doc(req.params.id).update({ chatHistory: updatedHistory });

  // Check if we should auto-summarize (e.g. every 3 messages or if user asks)
  if (updatedHistory.length >= 4) {
    const transcript = updatedHistory.map((h: any) => `${h.role}: ${h.parts[0].text}`).join('\n');
    const brief = await runIdeationSummarizer(transcript);
    await saveArtifact(req.params.id, 'idea_brief', brief);
  }

  res.json({ aiResponse, history: updatedHistory });
});

// Trigger Agent Run (Stage 2 & 3)
projectRouter.post('/:id/stages/:stage/run', async (req, res) => {
  const { id, stage } = req.params;
  const runId = await createRun(id, stage);

  // Run async
  (async () => {
    try {
      const artifacts = await getArtifacts(id);
      const briefArtifact = artifacts.find(a => a.id === 'idea_brief');
      const researchArtifact = artifacts.find(a => a.id === 'research_report');

      const brief = briefArtifact?.data;
      const research = researchArtifact?.data;

      let result;
      if (stage === 'research_report') {
        if (!brief) throw new Error("Need Idea Brief first");
        result = await runResearchAgent(brief);
      } else if (stage === 'brand_kit') {
        if (!brief || !research) throw new Error("Need Brief and Research first");
        result = await runBrandingAgent(brief, research);
      } else {
        throw new Error("Invalid stage");
      }

      await saveArtifact(id, stage, result);
      await updateRun(id, runId, {
        status: 'COMPLETED',
        finishedAt: new Date().toISOString(),
        logs: [`${stage} completed successfully.`]
      });
    } catch (error: any) {
      await updateRun(id, runId, {
        status: 'FAILED',
        finishedAt: new Date().toISOString(),
        logs: [`Error: ${error.message}`]
      });
    }
  })();

  res.json({ runId });
});

projectRouter.get('/:id/runs/:runId', async (req, res) => {
  const doc = await projectsCol.doc(req.params.id).collection('runs').doc(req.params.runId).get();
  res.json(doc.data());
});
