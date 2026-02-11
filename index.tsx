
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Palette, 
  FileText, 
  ChevronRight, 
  Loader2, 
  Trash2, 
  CheckCircle2,
  Rocket,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

// --- Types ---
interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface Project {
  id: string;
  name: string;
  chatHistory: ChatMessage[];
  artifacts: Record<string, any>;
  runs: {
    id: string;
    stage: string;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED';
    startedAt: string;
    logs: string[];
  }[];
}

// --- Agent Schemas ---
const IdeaBriefSchema = {
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

const ResearchReportSchema = {
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

const BrandKitSchema = {
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

// --- Agent Service ---
class AgentService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
  }

  async *chatStream(history: ChatMessage[], message: string) {
    const model = 'gemini-3-flash-preview';
    const systemInstruction = "You are the 'Idea Architect'. Your goal is to interview the user about their business idea to fill out a brief. IMPORTANT: Approach the task step-by-step. Ask only one or two focused questions at a time. DO NOT overwhelm the user with long lists of questions. Be concise, professional, and friendly.";
    
    const response = await this.ai.models.generateContentStream({
      model,
      contents: [...history, { role: 'user', parts: [{ text: message }] }] as any,
      config: { systemInstruction }
    });
    
    for await (const chunk of response) {
      yield (chunk as GenerateContentResponse).text;
    }
  }

  async summarizeIdea(history: ChatMessage[]) {
    const transcript = history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n');
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize the following chat transcript into a formal Idea Brief JSON:\n\n${transcript}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: IdeaBriefSchema
      }
    });
    return JSON.parse(response.text);
  }

  async runResearch(brief: any) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Perform simulated market research based on this brief:\n\n${JSON.stringify(brief)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: ResearchReportSchema
      }
    });
    return JSON.parse(response.text);
  }

  async runBranding(brief: any, research: any) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a brand kit based on this brief and research:\n\nBrief: ${JSON.stringify(brief)}\n\nResearch: ${JSON.stringify(research)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: BrandKitSchema
      }
    });
    return JSON.parse(response.text);
  }
}

const agents = new AgentService();

// --- Components ---

const App = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('bb_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(localStorage.getItem('bb_current_project'));
  const [activeTab, setActiveTab] = useState<'chat' | 'brief' | 'research' | 'brand'>('chat');
  const [isTyping, setIsTyping] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentProject = useMemo(() => 
    projects.find(p => p.id === currentProjectId), 
    [projects, currentProjectId]
  );

  useEffect(() => {
    localStorage.setItem('bb_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (currentProjectId) localStorage.setItem('bb_current_project', currentProjectId);
    else localStorage.removeItem('bb_current_project');
  }, [currentProjectId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentProject?.chatHistory, streamingText]);

  const createProject = () => {
    const name = prompt('Business Name:');
    if (!name) return;
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      chatHistory: [],
      artifacts: {},
      runs: []
    };
    setProjects([...projects, newProject]);
    setCurrentProjectId(newProject.id);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    setProjects(projects.filter(p => p.id !== id));
    if (currentProjectId === id) setCurrentProjectId(null);
  };

  const updateCurrentProject = (update: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, ...update } : p));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentProject) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: chatInput }] };
    const newHistory = [...currentProject.chatHistory, userMessage];
    setChatInput('');
    setIsTyping(true);
    setStreamingText('');
    
    updateCurrentProject({ chatHistory: newHistory });

    try {
      let fullResponse = '';
      const stream = agents.chatStream(currentProject.chatHistory, userMessage.parts[0].text);
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        setStreamingText(fullResponse);
      }

      const updatedHistory: ChatMessage[] = [...newHistory, { role: 'model', parts: [{ text: fullResponse }] }];
      
      let artifacts = { ...currentProject.artifacts };
      // Auto-summarize after 3 messages or more
      if (updatedHistory.length >= 4) {
        const brief = await agents.summarizeIdea(updatedHistory);
        artifacts.idea_brief = brief;
      }

      updateCurrentProject({ 
        chatHistory: updatedHistory,
        artifacts
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
      setStreamingText('');
    }
  };

  const runAgent = async (stage: 'research' | 'brand') => {
    if (!currentProject) return;
    
    const runId = Date.now().toString();
    const newRun = {
      id: runId,
      stage,
      status: 'RUNNING' as const,
      startedAt: new Date().toISOString(),
      logs: [`Starting agent for ${stage}...`]
    };

    updateCurrentProject({ runs: [newRun, ...currentProject.runs] });

    try {
      let result;
      if (stage === 'research') {
        result = await agents.runResearch(currentProject.artifacts.idea_brief);
      } else {
        result = await agents.runBranding(currentProject.artifacts.idea_brief, currentProject.artifacts.research_report);
      }

      updateCurrentProject({
        artifacts: { ...currentProject.artifacts, [`${stage}_report`]: result, [stage === 'brand' ? 'brand_kit' : 'research_report']: result },
        runs: currentProject.runs.map(r => r.id === runId ? { ...r, status: 'COMPLETED', logs: [...r.logs, 'Completed successfully.'] } : r)
      });
      setActiveTab(stage as any);
    } catch (err) {
      updateCurrentProject({
        runs: currentProject.runs.map(r => r.id === runId ? { ...r, status: 'FAILED', logs: [...r.logs, `Error: ${err}`] } : r)
      });
    }
  };

  if (!currentProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 p-6 overflow-auto">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="text-white space-y-6">
            <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-500/30">
              <Rocket size={14} /> Venture OS v1.1
            </div>
            <h1 className="text-6xl font-black leading-tight tracking-tighter">
              Build your <span className="text-blue-500">Business</span> with AI Agents.
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              A comprehensive orchestration suite for founders. From ideation to brand kits in minutes, powered by Gemini.
            </p>
            <button 
              onClick={createProject}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-blue-500/20 transition-all flex items-center gap-3 group"
            >
              Start New Venture <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-3xl backdrop-blur-sm overflow-hidden h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-4">
              <h3 className="text-slate-200 font-bold flex items-center gap-2">
                <FileText size={18} /> Recent Ventures
              </h3>
            </div>
            {projects.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Plus size={48} className="opacity-20" />
                <p>No projects found</p>
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                {projects.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setCurrentProjectId(p.id)}
                    className="flex items-center justify-between bg-slate-800 p-4 rounded-2xl hover:bg-slate-700 border border-slate-700/50 cursor-pointer transition-all group"
                  >
                    <div>
                      <h4 className="font-bold text-slate-200">{p.name}</h4>
                      <p className="text-xs text-slate-500">{new Date(parseInt(p.id)).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => deleteProject(p.id, e)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">B</div>
          <span className="ml-3 font-bold text-white hidden lg:block tracking-tight text-lg">Builder</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4 px-2 hidden lg:block">Project Roadmap</div>
          
          <NavItem active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={20} />} label="1. Ideation" count={currentProject.chatHistory.length} />
          <NavItem 
            disabled={!currentProject.artifacts.idea_brief}
            active={activeTab === 'brief'} onClick={() => setActiveTab('brief')} 
            icon={<FileText size={20} />} label="Idea Brief" 
          />
          <NavItem 
            disabled={!currentProject.artifacts.idea_brief}
            active={activeTab === 'research'} onClick={() => setActiveTab('research')} 
            icon={<Search size={20} />} label="2. Research" 
          />
          <NavItem 
            disabled={!currentProject.artifacts.research_report}
            active={activeTab === 'brand'} onClick={() => setActiveTab('brand')} 
            icon={<Palette size={20} />} label="3. Branding" 
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setCurrentProjectId(null)}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 text-slate-400 transition-all text-sm font-medium"
          >
            <Plus size={18} /> <span className="hidden lg:block">Switch Project</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b glass shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-800">{currentProject.name}</h2>
          </div>
          
          <div className="flex items-center gap-4">
             {currentProject.runs.filter(r => r.status === 'RUNNING').length > 0 && (
               <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-100 animate-pulse">
                 <RefreshCw size={14} className="animate-spin" /> Agent Working...
               </div>
             )}
             <div className="h-8 w-px bg-slate-200"></div>
             <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2">
               Export Bundle <ChevronRight size={14} />
             </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col bg-white">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                {currentProject.chatHistory.length === 0 ? (
                  <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                      <Rocket size={40} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-800 mb-2">Build your Brief</h3>
                      <p className="text-slate-500 text-lg leading-relaxed">
                        I'm your <b>Idea Architect</b>. I'll help you build your business one step at a time. Tell me about your business. What problem are you solving?
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {currentProject.chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] px-6 py-4 rounded-3xl shadow-sm text-base leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none font-medium' 
                            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                        }`}>
                          {msg.parts[0].text}
                        </div>
                      </div>
                    ))}
                    {streamingText && (
                      <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="max-w-[85%] px-6 py-4 rounded-3xl rounded-bl-none shadow-sm bg-white border border-slate-100 text-slate-800 text-base leading-relaxed">
                          {streamingText}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {isTyping && !streamingText && (
                  <div className="flex justify-start animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-100 px-5 py-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your answer or a question..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-800 text-base font-medium placeholder:text-slate-400"
                    />
                    <button 
                      type="submit"
                      disabled={!chatInput.trim() || isTyping}
                      className="absolute right-3 top-3 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-500 transition-all disabled:opacity-50"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </form>
                <div className="mt-4 text-center text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                  Step-by-step business modeling via Gemini Flash
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-slate-50 p-10 overflow-y-auto">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 mb-2">
                      {activeTab === 'brief' && 'Idea Brief'}
                      {activeTab === 'research' && 'Market Research Report'}
                      {activeTab === 'brand' && 'Venture Brand Kit'}
                    </h1>
                    <p className="text-slate-500 text-lg">System generated based on multi-agent collaboration.</p>
                  </div>
                  
                  {activeTab !== 'brief' && !currentProject.artifacts[activeTab === 'research' ? 'research_report' : 'brand_kit'] && (
                    <button 
                      onClick={() => runAgent(activeTab === 'research' ? 'research' : 'brand')}
                      disabled={currentProject.runs.some(r => r.status === 'RUNNING')}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/30 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      {currentProject.runs.some(r => r.status === 'RUNNING') ? <Loader2 className="animate-spin" /> : <Rocket size={20} />}
                      Run {activeTab === 'research' ? 'Research' : 'Branding'} Agent
                    </button>
                  )}
                </div>

                <div className="space-y-8 pb-20">
                  {currentProject.artifacts[activeTab === 'brief' ? 'idea_brief' : (activeTab === 'research' ? 'research_report' : 'brand_kit')] ? (
                    <JsonRenderer data={currentProject.artifacts[activeTab === 'brief' ? 'idea_brief' : (activeTab === 'research' ? 'research_report' : 'brand_kit')]} />
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-6">
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        {activeTab === 'research' ? <Search size={48} /> : <Palette size={48} />}
                      </div>
                      <div className="max-w-md mx-auto">
                        <h3 className="text-2xl font-bold text-slate-800">Pending Execution</h3>
                        <p className="text-slate-500 mt-2">Deploy the agent to analyze your venture brief and generate the required documentation.</p>
                      </div>
                    </div>
                  )}

                  {/* Run Logs */}
                  <div className="pt-10 border-t border-slate-200">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Run History</h4>
                    <div className="space-y-2">
                      {currentProject.runs.filter(r => r.stage === (activeTab === 'brief' ? 'summarization' : activeTab)).map(run => (
                        <div key={run.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${run.status === 'COMPLETED' ? 'bg-green-500' : run.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">{run.status}</span>
                            <span className="text-xs text-slate-400 font-mono">{new Date(run.startedAt).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {run.logs[run.logs.length-1]}
                          </div>
                        </div>
                      ))}
                      {currentProject.runs.filter(r => r.stage === (activeTab === 'brief' ? 'summarization' : activeTab)).length === 0 && (
                        <p className="text-xs text-slate-400 italic">No runs found for this stage.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, count, disabled }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number; disabled?: boolean }) => (
  <button 
    disabled={disabled}
    onClick={onClick}
    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group ${
      disabled ? 'opacity-30 cursor-not-allowed' :
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}>{icon}</span>
      <span className="font-bold text-sm tracking-tight hidden lg:block">{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${active ? 'bg-blue-400/30 text-white' : 'bg-slate-800 text-slate-500'}`}>
        {count}
      </span>
    )}
  </button>
);

const JsonRenderer = ({ data }: { data: any }) => {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className={`bg-white border border-slate-100 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all ${typeof value === 'string' && value.length > 200 ? 'md:col-span-2' : ''}`}>
          <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-5 h-[2px] bg-blue-500"></span> {key.replace(/([A-Z])/g, ' $1')}
          </h4>
          <div className="text-slate-700">
            {Array.isArray(value) ? (
              <div className="space-y-4">
                {value.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="shrink-0 mt-2 w-2 h-2 bg-slate-300 rounded-full"></div>
                    {typeof item === 'object' ? (
                      <div className="space-y-2">
                        {Object.entries(item).map(([k, v]) => (
                          <div key={k} className="text-base">
                            <span className="font-bold text-slate-900 capitalize">{k}:</span> <span className="text-slate-700">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base font-medium leading-relaxed">{String(item)}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : typeof value === 'object' ? (
              <div className="space-y-3">
                 {Object.entries(value).map(([k, v]) => (
                   <div key={k} className="text-base flex flex-col gap-1.5 bg-slate-50 p-4 rounded-xl">
                     <span className="font-black text-xs text-slate-400 uppercase tracking-wider">{k}</span>
                     <span className="text-slate-800 font-medium">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                   </div>
                 ))}
              </div>
            ) : typeof value === 'number' ? (
              <div className="flex items-center gap-6">
                <div className="text-6xl font-black text-slate-900">{value}%</div>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{width: `${value}%`}}></div>
                </div>
              </div>
            ) : (
              <p className="text-xl font-bold text-slate-800 leading-tight">{String(value)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
