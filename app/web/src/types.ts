
export interface Project {
  id: string;
  name: string;
  currentStage: number;
  chatHistory: { role: string; parts: { text: string }[] }[];
}

export interface Artifact {
  id: string;
  stage: string;
  data: any;
  updatedAt: string;
}

export interface Run {
  id: string;
  stage: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  finishedAt?: string;
  logs: string[];
}

export interface AppState {
  project: Project | null;
  artifacts: Artifact[];
  runs: Run[];
  loading: boolean;
}
