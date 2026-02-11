
const BASE_URL = 'http://localhost:8080/api';

export const apiClient = {
  createProject: (name: string) => 
    fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(res => res.json()),

  getProjectState: (id: string) => 
    fetch(`${BASE_URL}/projects/${id}`).then(res => res.json()),

  sendChat: (id: string, message: string) => 
    fetch(`${BASE_URL}/projects/${id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }).then(res => res.json()),

  runStage: (id: string, stage: string) => 
    fetch(`${BASE_URL}/projects/${id}/stages/${stage}/run`, {
      method: 'POST'
    }).then(res => res.json()),

  getRunStatus: (id: string, runId: string) => 
    fetch(`${BASE_URL}/projects/${id}/runs/${runId}`).then(res => res.json()),
};
