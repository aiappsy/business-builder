

import { Artifact, Run } from '../types';
import { apiClient } from '../api/client';

interface Props {
  projectId: string;
  artifacts: Artifact[];
  activeRuns: Run[];
  onRunStarted: () => void;
}

export default function StageControls({ projectId, artifacts, activeRuns, onRunStarted }: Props) {
  const hasBrief = artifacts.some(a => a.id === 'idea_brief');
  const hasResearch = artifacts.some(a => a.id === 'research_report');

  const runStage = async (stage: string) => {
    try {
      await apiClient.runStage(projectId, stage);
      onRunStarted();
    } catch (e) {
      alert("Failed to start run");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Workflows</h3>
        {activeRuns.length > 0 && (
          <span className="flex items-center gap-2 text-xs text-blue-600 font-bold animate-pulse">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            Agent Active
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          disabled={!hasBrief || activeRuns.length > 0}
          onClick={() => runStage('research_report')}
          className={`flex-1 text-xs py-2 rounded-md font-bold transition-all ${!hasBrief ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
              hasResearch ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          {hasResearch ? '✓ Rerun Research' : 'Run Market Research'}
        </button>

        <button
          disabled={!hasResearch || activeRuns.length > 0}
          onClick={() => runStage('brand_kit')}
          className={`flex-1 text-xs py-2 rounded-md font-bold transition-all ${!hasResearch ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
              artifacts.some(a => a.id === 'brand_kit') ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          Build Brand Kit
        </button>
      </div>
    </div>
  );
}
