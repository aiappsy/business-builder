
import { useState } from 'react';
import { Artifact, Run } from '../types';

interface Props {
  artifacts: Artifact[];
  runs: Run[];
}

export default function ArtifactPanel({ artifacts, runs }: Props) {
  const [activeTab, setActiveTab] = useState<string>('idea_brief');

  const tabs = [
    { id: 'idea_brief', label: '1. Idea Brief' },
    { id: 'research_report', label: '2. Research' },
    { id: 'brand_kit', label: '3. Brand Kit' },
    { id: 'logs', label: 'Progress Logs' }
  ];

  const currentArtifact = artifacts.find(a => a.id === activeTab);

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === 'logs' ? (
          <div className="space-y-4">
            {runs.length === 0 && <p className="text-gray-400 italic">No activity yet.</p>}
            {runs.map(run => (
              <div key={run.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm uppercase tracking-wider text-gray-400">{run.stage.replace('_', ' ')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${run.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    run.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700 animate-pulse'
                    }`}>{run.status}</span>
                </div>
                <div className="text-xs font-mono text-gray-600 space-y-1">
                  {run.logs.map((log, idx) => <div key={idx}>{'>'} {log}</div>)}
                </div>
              </div>
            ))}
          </div>
        ) : currentArtifact ? (
          <div className="bg-white border rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-black mb-6 border-b pb-4">{tabs.find(t => t.id === activeTab)?.label}</h2>
            <div className="prose prose-sm max-w-none">
              <JsonViewer data={currentArtifact.data} />
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-dashed rounded-xl">
            <p className="text-gray-400">Artifact not generated yet. Finish the previous stages first.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function JsonViewer({ data }: { data: any }) {
  if (typeof data !== 'object' || data === null) return <span>{String(data)}</span>;

  return (
    <div className="space-y-6">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{key.replace(/([A-Z])/g, ' $1')}</h4>
          <div className="text-gray-800 leading-relaxed">
            {Array.isArray(value) ? (
              <ul className="list-disc pl-5 space-y-1">
                {value.map((item, i) => (
                  <li key={i}>{typeof item === 'object' ? <JsonViewer data={item} /> : item}</li>
                ))}
              </ul>
            ) : typeof value === 'object' ? (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <JsonViewer data={value} />
              </div>
            ) : (
              <p>{String(value)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
