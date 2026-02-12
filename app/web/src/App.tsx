
import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  FileText, 
  Search, 
  Palette, 
  Plus, 
  ChevronRight, 
  RefreshCw,
  Rocket
} from 'lucide-react';
import { Project, Artifact, Run } from './types';
import { apiClient } from './api/client';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
import StageControls from './components/StageControls';

export default function App() {
  const [projectId, setProjectId] = useState<string | null>(localStorage.getItem('current_project_id'));
  const [state, setState] = useState<{
    project: Project | null;
    artifacts: Artifact[];
    runs: Run[];
    loading: boolean;
  }>({
    project: null,
    artifacts: [],
    runs: [],
    loading: false
  });

  const refreshState = useCallback(async () => {
    if (!projectId) return;
    const data = await apiClient.getProjectState(projectId);
    setState({
      project: data.project,
      artifacts: data.artifacts,
      runs: data.runs,
      loading: false
    });
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem('current_project_id', projectId);
      refreshState();
      // Poll runs if any are running
      const interval = setInterval(() => {
        if (state.runs.some(r => r.status === 'RUNNING')) {
          refreshState();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [projectId, refreshState, state.runs]);

  const handleCreateProject = async () => {
    const name = prompt("Enter Business Name:");
    if (!name) return;
    const p = await apiClient.createProject(name);
    setProjectId(p.id);
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center p-8 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-md">
          <h1 className="text-4xl font-black mb-4">Business Builder</h1>
          <p className="text-slate-400 mb-8">From Zero to Venture with Gemini AI Agents.</p>
          <button 
            onClick={handleCreateProject}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-all transform hover:scale-105"
          >
            Start New Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-6 shrink-0 bg-white">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-blue-600">BB MVP</span>
          <h2 className="font-medium text-gray-500">/ {state.project?.name}</h2>
        </div>
        <button 
          onClick={() => { localStorage.removeItem('current_project_id'); setProjectId(null); }}
          className="text-sm text-gray-400 hover:text-red-500"
        >
          Close Project
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Chat & Workflow */}
        <div className="w-1/3 border-r flex flex-col bg-gray-50">
          <div className="p-4 border-b bg-white">
            <StageControls 
              projectId={projectId} 
              artifacts={state.artifacts} 
              onRunStarted={refreshState} 
              activeRuns={state.runs.filter(r => r.status === 'RUNNING')}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel 
              projectId={projectId} 
              history={state.project?.chatHistory || []} 
              onMessageSent={refreshState} 
            />
          </div>
        </div>

        {/* Right: Artifacts */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <ArtifactPanel artifacts={state.artifacts} runs={state.runs} />
        </div>
      </main>
    </div>
  );
}
