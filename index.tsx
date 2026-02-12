import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  MessageSquare, Search, Palette, Loader2, Trash2, ArrowRight,
  RefreshCw, Zap, Layout, ChevronRight, ChevronLeft,
  ExternalLink, ShoppingCart, Megaphone, Share2, Settings, BarChart4, BookOpen,
  FileCode, Database, ShieldAlert, Code, Image as ImageIcon, Server, Terminal, Cloud, Copy, Check
} from 'lucide-react';

// --- Types ---
interface ChatPart { text?: string; }
interface ChatMessage { role: 'user' | 'model'; parts: ChatPart[]; }

interface Project {
  id: string;
  name: string;
  chatHistory: ChatMessage[];
  artifacts: {
    nicheResearch?: any;
    offerArchitect?: any;
    landingPage?: any;
    siteCode?: string;
    heroImage?: string;
    contentEngine?: any;
    adsAgent?: any;
    funnelAgent?: any;
    brandIdentity?: any;
    opsAutomation?: any;
    financePlan?: any;
    cloudDeploy?: any;
    researchSources?: { title: string; uri: string }[];
  };
}

// --- Agent Schemas ---
const NicheResearchSchema = {
  type: Type.OBJECT,
  properties: {
    nicheSummary: { type: Type.STRING },
    marketSizeEstimate: { type: Type.STRING },
    potentialOffers: { type: Type.ARRAY, items: { type: Type.STRING } },
    realCompetitors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, gap: { type: Type.STRING } } } }
  },
  required: ["nicheSummary", "potentialOffers", "realCompetitors"]
};

const OfferArchitectSchema = {
  type: Type.OBJECT,
  properties: {
    coreOfferName: { type: Type.STRING },
    productLadder: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { tier: { type: Type.STRING }, price: { type: Type.STRING }, deliverable: { type: Type.STRING } } } },
    upsellSequence: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["coreOfferName", "productLadder"]
};

const LandingPageSchema = {
  type: Type.OBJECT,
  properties: {
    heroHeadline: { type: Type.STRING },
    subHeadline: { type: Type.STRING },
    primaryCTA: { type: Type.STRING },
    copySections: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          sectionTitle: { type: Type.STRING }, 
          mainCopy: { type: Type.STRING },
          visualSuggestion: { type: Type.STRING }
        } 
      } 
    }
  },
  required: ["heroHeadline", "copySections"]
};

// --- Storage Logic ---
const STORAGE_KEY = 'vos_v2_registry';
const load = (): Project[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};
const persist = (p: Project[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(p));

const App = () => {
  const [projects, setProjects] = useState<Project[]>(load);
  const [currentId, setCurrentId] = useState<string | null>(localStorage.getItem('vos_cid'));
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [lpSubTab, setLpSubTab] = useState<'blueprint' | 'preview' | 'code'>('blueprint');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isKeySelected, setIsKeySelected] = useState<boolean>(true);
  const [checkingKey, setCheckingKey] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const current = useMemo(() => projects.find(p => p.id === currentId), [projects, currentId]);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          setIsKeySelected(selected);
        } else {
          setIsKeySelected(true); 
        }
      } catch (e) {
        setIsKeySelected(true); 
      } finally {
        setCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleActivateKey = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
      }
    } catch (e) {
      console.error("Open key selection failed:", e);
    }
    // GUIDELINE: Assume success after triggering the dialog to avoid race conditions.
    setIsKeySelected(true);
  };

  useEffect(() => persist(projects), [projects]);
  useEffect(() => { 
    if (currentId) localStorage.setItem('vos_cid', currentId);
    else localStorage.removeItem('vos_cid');
  }, [currentId]);

  const runAgentTask = async (task: string, inputData: any) => {
    // GUIDELINE: Always create fresh instance
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let model = 'gemini-3-flash-preview';
    let prompt = "";
    let config: any = { responseMimeType: "application/json" };

    try {
      if (task === 'generateHeroImage') {
        model = 'gemini-2.5-flash-image';
        const response = await ai.models.generateContent({
          model,
          contents: { parts: [{ text: `Professional hero image for: ${inputData.landingPage?.heroHeadline || "New Startup"}. Visual Style: ${inputData.landingPage?.copySections?.[0]?.visualSuggestion || "Modern UI"}.` }] }
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart) return { data: `data:image/png;base64,${imagePart.inlineData.data}` };
        throw new Error("No image data returned from model");
      }

      if (task === 'generateSiteCode') {
        model = 'gemini-3-pro-preview';
        prompt = `Generate a high-quality single-file React component using Tailwind CSS for a landing page based on this blueprint: ${JSON.stringify(inputData.landingPage)}. Use lucide-react icons. Return ONLY a JSON object with a single field "code" containing the string of the component code.`;
        config.responseSchema = { type: Type.OBJECT, properties: { code: { type: Type.STRING } }, required: ["code"] };
      } else {
        switch(task) {
          case 'nicheResearch':
            prompt = `Analyze the business niche: "${inputData.niche || "The project idea"}". Perform deep research using Google Search to find current market size, potential high-ticket offers, and 3 specific real-world competitors with their market gaps.`;
            config.responseSchema = NicheResearchSchema;
            config.tools = [{ googleSearch: {} }];
            break;
          case 'offerArchitect':
            prompt = `Architect a strategic high-value product ladder (low, medium, high ticket) based on this research: ${JSON.stringify(inputData.nicheResearch)}. Focus on maximum lifetime value.`;
            config.responseSchema = OfferArchitectSchema;
            break;
          case 'landingPage':
            prompt = `Design a conversion-optimized landing page blueprint for these offers: ${JSON.stringify(inputData.offerArchitect)}. Include high-impact headlines, CTAs, and a logical section flow with copy.`;
            config.responseSchema = LandingPageSchema;
            break;
          default:
            prompt = `Execute professional strategy for agent [${task}] based on project data: ${JSON.stringify(inputData)}. Provide high-fidelity strategic output.`;
        }
      }

      const response = await ai.models.generateContent({ model, contents: prompt, config });
      if (task === 'generateSiteCode') return { data: JSON.parse(response.text || '{}').code };
      return { data: JSON.parse(response.text || '{}') };
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setIsKeySelected(false);
      }
      throw err;
    }
  };

  const deployAgent = async (task: string) => {
    setIsTyping(true);
    try {
      const { data } = await runAgentTask(task, current?.artifacts);
      setProjects(prev => prev.map(p => p.id === currentId ? { 
        ...p, 
        artifacts: { 
          ...p.artifacts, 
          [task === 'generateSiteCode' ? 'siteCode' : task === 'generateHeroImage' ? 'heroImage' : task]: data
        } 
      } : p));
    } catch (err) { 
      console.error("Agent Error:", err);
    } finally { 
      setIsTyping(false); 
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !current || isTyping) return;
    setIsTyping(true);
    const updatedHistory: ChatMessage[] = [...current.chatHistory, { role: 'user', parts: [{ text: chatInput }] }];
    setProjects(prev => prev.map(p => p.id === currentId ? { ...p, chatHistory: updatedHistory } : p));
    const userInput = chatInput;
    setChatInput('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: updatedHistory as any,
        config: { systemInstruction: "You are the Executive Architect. Your role is to interview the user about their business vision. Help them narrow down a niche. Once you both agree on a specific path, explicitly state 'NICHE CONFIRMED' to unlock the pipeline." }
      });
      setProjects(prev => prev.map(p => p.id === currentId ? { ...p, chatHistory: [...updatedHistory, { role: 'model', parts: [{ text: response.text }] }] } : p));
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) setIsKeySelected(false);
    } finally { setIsTyping(false); }
  };

  if (checkingKey) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;
  
  if (!isKeySelected) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-12 text-center">
      <div className="max-w-md space-y-8 animate-slide-up">
        <ShieldAlert size={80} className="text-blue-500 mx-auto" />
        <h1 className="text-4xl font-black italic serif text-white uppercase tracking-tighter">System Offline.</h1>
        <p className="text-slate-400 text-lg">Connect an active Google Cloud project with billing to activate the architecture suite.</p>
        <button onClick={handleActivateKey} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-4 active:scale-95">Connect Project <Zap size={20} /></button>
        <div className="pt-4 border-t border-slate-900">
           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-slate-600 uppercase font-black tracking-widest hover:text-blue-500 flex items-center justify-center gap-2">Billing Requirements <ExternalLink size={10} /></a>
        </div>
      </div>
    </div>
  );

  if (!currentId) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-20 py-16 items-center">
        <div className="space-y-10 animate-slide-up text-left">
          <h1 className="text-8xl font-black text-white italic serif tracking-tighter leading-[0.9]">Legacy <span className="text-blue-600 block">System.</span></h1>
          {isCreating ? (
            <form onSubmit={(e) => { e.preventDefault(); const id = Date.now().toString(); setProjects([{ id, name: newProjectName, chatHistory: [], artifacts: {} }, ...projects]); setCurrentId(id); }} className="space-y-5">
              <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-8 py-5 text-xl font-bold text-white focus:border-blue-600 outline-none" placeholder="Venture Name..." />
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest">Initiate Command</button>
            </form>
          ) : <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white px-16 py-6 rounded-2xl font-black text-2xl shadow-3xl hover:bg-blue-500 transition-all flex items-center gap-6 active:scale-95">New Venture <ArrowRight/></button>}
        </div>
        <div className="bg-slate-900/40 p-12 rounded-[4rem] border border-slate-800 h-[600px] flex flex-col backdrop-blur-3xl shadow-3xl overflow-y-auto custom-scrollbar">
          <h3 className="text-slate-600 font-black text-[11px] uppercase tracking-[0.6em] mb-10 flex items-center gap-4"><Database size={16} className="text-blue-500"/> Venture Registry</h3>
          {projects.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center text-slate-700 italic serif text-lg opacity-40 text-center">No records found.<br/>Initiate first mission.</div> : projects.map(p => (
            <div key={p.id} onClick={() => setCurrentId(p.id)} className="p-8 mb-4 bg-slate-950 rounded-3xl border border-slate-800 hover:border-blue-600 cursor-pointer flex justify-between items-center group transition-all">
              <span className="font-black text-2xl text-white serif italic truncate">{p.name}</span>
              <button onClick={(e) => { e.stopPropagation(); setProjects(prev => prev.filter(x => x.id !== p.id)); }} className="text-slate-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><Trash2 size={20}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const pipeline = [
    { id: 'chat', label: '1. Discovery', icon: <MessageSquare size={18}/> },
    { id: 'nicheResearch', label: '2. Research', icon: <Search size={18}/> },
    { id: 'offerArchitect', label: '3. Offers', icon: <ShoppingCart size={18}/> },
    { id: 'landingPage', label: '4. Landings', icon: <Layout size={18}/> },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <aside className={`bg-slate-950 flex flex-col border-r border-slate-900 transition-all duration-500 ${sidebarCollapsed ? 'w-24' : 'w-80'}`}>
        <div className="h-28 flex items-center justify-between px-10 border-b border-slate-900">
          {!sidebarCollapsed && <span className="font-black italic text-[12px] uppercase tracking-[0.5em] serif text-white">Venture OS</span>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-slate-600 mx-auto hover:text-white transition-colors">{sidebarCollapsed ? <ChevronRight/> : <ChevronLeft/>}</button>
        </div>
        <nav className="flex-1 p-8 space-y-4 overflow-y-auto custom-scrollbar">
          {pipeline.map(step => (
            <NavBtn key={step.id} active={activeTab === step.id} onClick={() => setActiveTab(step.id)} icon={step.icon} label={step.label} ready={!!(current.artifacts as any)[step.id]} collapsed={sidebarCollapsed} />
          ))}
        </nav>
        <button onClick={() => setCurrentId(null)} className="p-10 border-t border-slate-900 text-[11px] font-black uppercase text-slate-600 hover:text-white tracking-[0.4em]">EXIT</button>
      </aside>

      <main className="flex-1 flex flex-col chat-gradient relative min-w-0">
        <header className="h-28 flex items-center justify-between px-16 border-b border-slate-900 bg-slate-950/40 backdrop-blur-2xl shrink-0 z-30">
          <h2 className="text-5xl font-black italic serif text-white tracking-tighter truncate max-w-2xl">{current.name}</h2>
          {isTyping && <div className="text-[12px] font-black text-blue-500 animate-pulse flex items-center gap-5"><RefreshCw size={16} className="animate-spin" /> Neural Sync Active</div>}
        </header>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'chat' ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-16 space-y-12 custom-scrollbar">
                {current.chatHistory.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    <div className={`max-w-[70%] px-10 py-7 rounded-[3rem] text-2xl leading-relaxed shadow-3xl ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-900 border border-slate-800 rounded-bl-none'}`}><p className="whitespace-pre-wrap">{m.parts[0].text}</p></div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSend} className="p-16 border-t border-slate-900 max-w-5xl mx-auto w-full relative">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-12 py-8 text-2xl font-bold text-white pr-32 outline-none focus:border-blue-600 shadow-inner" placeholder="Talk to the Architect..." />
                <button type="submit" disabled={!chatInput.trim() || isTyping} className="absolute right-4 top-4 w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-500 transition-all"><ArrowRight size={40}/></button>
              </form>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-20 custom-scrollbar text-left">
              <div className="max-w-7xl mx-auto space-y-20 pb-40">
                <div className="flex items-center justify-between border-b border-slate-900 pb-16">
                   <h1 className="text-8xl font-black italic serif text-white tracking-tighter uppercase">{activeTab.replace(/([A-Z])/g, ' $1')}</h1>
                   <button onClick={() => deployAgent(activeTab)} className="bg-blue-600 text-white px-14 py-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-3xl hover:bg-blue-500 flex items-center gap-5 transition-all active:scale-95">{isTyping ? <Loader2 className="animate-spin"/> : <Zap/>} Deploy Agent</button>
                </div>
                {(current.artifacts as any)[activeTab] ? <ArtifactViewer data={(current.artifacts as any)[activeTab]} /> : <div className="py-48 text-center text-slate-800 serif text-4xl uppercase tracking-widest opacity-40">Agent Offline. Deploy required.</div>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label, ready, collapsed }: any) => (
  <button onClick={onClick} className={`w-full flex items-center p-6 rounded-3xl transition-all active:scale-95 ${active ? 'bg-blue-600 text-white shadow-3xl translate-x-3' : 'text-slate-700 hover:bg-slate-900 hover:text-white'} ${collapsed ? 'justify-center' : 'justify-between'}`}>
    <div className="flex items-center gap-6 min-w-0"><span>{icon}</span>{!collapsed && <span className="font-black text-[11px] uppercase tracking-[0.3em] italic serif truncate">{label}</span>}</div>
    {!collapsed && ready && <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-950"></div>}
  </button>
);

const ArtifactViewer = ({ data }: { data: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
    {Object.entries(data).map(([key, val]) => (
      <div key={key} className={`bg-slate-900/40 p-16 rounded-[4rem] border border-slate-800 shadow-3xl ${typeof val === 'string' && val.length > 400 ? 'md:col-span-2' : ''}`}>
         <h4 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.6em] mb-12 flex items-center gap-6"><span className="w-12 h-0.5 bg-blue-600 rounded-full"></span> {key.replace(/([A-Z])/g, ' $1')}</h4>
         <div className="text-white space-y-8">
           {Array.isArray(val) ? val.map((it: any, idx: number) => (
             <div key={idx} className="flex gap-8 items-start"><div className="mt-4 w-2 h-2 bg-blue-600 rounded-full shrink-0"></div><p className="text-3xl font-black italic serif text-slate-200 leading-tight">{typeof it === 'object' ? JSON.stringify(it) : String(it)}</p></div>
           )) : <p className="text-5xl font-black italic serif text-white leading-[1.1]">{String(val)}</p>}
         </div>
      </div>
    ))}
  </div>
);

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}