
import { Firestore } from '@google-cloud/firestore';
import dotenv from 'dotenv';

dotenv.config();

const db = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
});

export const projectsCol = db.collection('projects');

export interface Artifact {
  id: string;
  stage: string;
  data: any;
  updatedAt: string;
}

export async function getProject(projectId: string) {
  const doc = await projectsCol.doc(projectId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function getArtifacts(projectId: string): Promise<Artifact[]> {
  const snapshot = await projectsCol.doc(projectId).collection('artifacts').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Artifact));
}

export async function getRuns(projectId: string) {
  const snapshot = await projectsCol.doc(projectId).collection('runs').orderBy('startedAt', 'desc').limit(10).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createRun(projectId: string, stage: string) {
  const runRef = projectsCol.doc(projectId).collection('runs').doc();
  await runRef.set({
    stage,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
    logs: [`Started ${stage} execution...`]
  });
  return runRef.id;
}

export async function updateRun(projectId: string, runId: string, data: any) {
  await projectsCol.doc(projectId).collection('runs').doc(runId).update(data);
}

export async function saveArtifact(projectId: string, stage: string, data: any) {
  const artRef = projectsCol.doc(projectId).collection('artifacts').doc(stage);
  await artRef.set({
    stage,
    data,
    updatedAt: new Date().toISOString()
  });
}
