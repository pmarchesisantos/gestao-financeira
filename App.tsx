
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  UserCircle,
  Plus,
  AlertTriangle,
  Copy,
  Trash2,
  RefreshCw,
  CheckCircle2,
  CloudOff,
  LogOut
} from 'lucide-react';
import { FinanceItem, HealthStatus, FinanceAnalysis, Ledger } from './types';
import ExpenseTable from './components/ExpenseTable';
import AuthForm from './components/AuthForm';
import { analyzeFinanceData } from './services/geminiService';
import { saveUserData, loadUserData, auth, onAuthStateChanged, signOut } from './firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [tabs, setTabs] = useState<Ledger[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('syncing');
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FinanceAnalysis | null>(null);

  const [mDesc, setMDesc] = useState('');
  const [mVal, setMVal] = useState('');
  const [mCat, setMCat] = useState<'house' | 'fixed' | 'work' | 'thirdParty'>('house');
  const [mInstPaid, setMInstPaid] = useState('');
  const [mInstTotal, setMInstTotal] = useState('');

  // Gerenciamento de Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setTabs([]);
        setLoading(false);
      } else {
        initData();
      }
    });
    return () => unsubscribe();
  }, []);

  const initData = async () => {
    setLoading(true);
    try {
      const cloudData = await loadUserData();
      if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
        setTabs(cloudData);
        setActiveTabId(cloudData[0].id);
        setSyncStatus('synced');
      } else {
        const defaultTab: Ledger = {
          id: 'tab-' + Date.now(),
          name: 'Planilha Principal',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          items: []
        };
        setTabs([defaultTab]);
        setActiveTabId(defaultTab.id);
        setSyncStatus('local');
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || tabs.length === 0 || !user) return;
    
    setSyncStatus('syncing');
    const timeout = setTimeout(async () => {
      try {
        await saveUserData(tabs);
        setSyncStatus('synced');
      } catch (e) {
        setSyncStatus('error');
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [tabs, loading, user]);

  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  const updateItem = (id: string, updates: Partial<FinanceItem>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, items: tab.items.map(i => i.id === id ? { ...i, ...updates } : i) }
        : tab
    ));
  };

  const removeItem = (id: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, items: tab.items.filter(i => i.id !== id) }
        : tab
    ));
  };

  const handleManualValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) { setMVal(''); return; }
    const amount = parseInt(digits) / 100;
    setMVal(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount));
  };

  const addManualItem = () => {
    const numericValue = parseFloat(mVal.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    if (!mDesc || numericValue < 0) return;
    const newItem: FinanceItem = {
      id: 'item-' + Math.random().toString(36).substr(2, 9),
      description: mDesc,
      value: numericValue,
      category: mCat,
      paidInstallments: mInstPaid ? parseInt(mInstPaid) : undefined,
      totalInstallments: mInstTotal ? parseInt(mInstTotal) : undefined,
      status: 'pending'
    };
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, items: [...tab.items, newItem] } : tab));
    setMDesc(''); setMVal(''); setMInstPaid(''); setMInstTotal('');
  };

  const addNewTab = () => {
    const newTab: Ledger = {
      id: 'tab-' + Date.now(),
      name: 'Nova Planilha',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      items: []
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const duplicateActiveTab = () => {
    if (!activeTab) return;
    const newTab: Ledger = {
      ...activeTab,
      id: 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: `${activeTab.name} (Cópia)`,
      items: activeTab.items.map(item => ({ ...item, id: 'item-' + Math.random().toString(36).substr(2, 9) }))
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const deleteTab = (idToDelete: string) => {
    if (tabs.length <= 1) return;
    if (window.confirm("Deseja realmente apagar esta planilha?")) {
      const indexToDelete = tabs.findIndex(t => t.id === idToDelete);
      const newTabs = tabs.filter(t => t.id !== idToDelete);
      if (idToDelete === activeTabId) {
        const nextIndex = indexToDelete === 0 ? 0 : indexToDelete - 1;
        setActiveTabId(newTabs[nextIndex].id);
      }
      setTabs(newTabs);
    }
  };

  const totals = useMemo(() => {
    const items = activeTab?.items || [];
    const workIncome = items.filter(i => i.category === 'work').reduce((a, b) => a + b.value, 0);
    const expenses = items.filter(i => i.category === 'house' || i.category === 'fixed');
    const totalExpenses = expenses.reduce((a, b) => a + b.value, 0);
    const paidExpenses = expenses.filter(i => i.status === 'paid').reduce((a, b) => a + b.value, 0);
    const pendingExpenses = expenses.filter(i => i.status === 'pending').reduce((a, b) => a + b.value, 0);
    return { workIncome, totalExpenses, paidExpenses, pendingExpenses };
  }, [activeTab]);

  const runAnalysis = async () => {
    if (!activeTab || activeTab.items.length === 0) return;
    setAnalysisLoading(true);
    try {
      const result = await analyzeFinanceData(activeTab.items);
      setAnalysis(result);
    } catch (err) {
      alert('Erro na análise.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (!user) return <AuthForm />;

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white font-black text-[10px] tracking-[0.4em] uppercase">
      <RefreshCw className="animate-spin mb-4 text-blue-500" size={32} />
      Sincronizando Master Finance...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center font-black text-white text-[10px]">MF</div>
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">Master Finance</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {syncStatus === 'synced' && <div className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 size={14} /><span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Cloud Sync</span></div>}
            {syncStatus === 'syncing' && <div className="flex items-center gap-1.5 text-amber-500"><RefreshCw size={14} className="animate-spin" /><span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Saving...</span></div>}
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
             <div className="hidden sm:block text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Conta Ativa</p>
                <p className="text-[10px] font-bold text-slate-600 max-w-[120px] truncate">{user.email}</p>
             </div>
             <button onClick={() => signOut(auth)} className="text-slate-300 hover:text-rose-500 transition-colors">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* Barra de Abas */}
        <div className="flex items-center border-b border-slate-200 overflow-x-auto no-scrollbar bg-white rounded-t-xl px-2">
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all cursor-pointer whitespace-nowrap group relative ${
                activeTabId === tab.id ? 'border-slate-900 bg-slate-50/50 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.name}</span>
              <div className="flex items-center gap-2 ml-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteTab(tab.id); }} 
                  className={`text-slate-300 hover:text-rose-600 transition-colors ${activeTabId === tab.id ? 'block' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={addNewTab} className="px-6 py-4 text-slate-400 hover:text-blue-600 transition-all flex items-center gap-2 border-b-2 border-transparent">
            <Plus size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Nova</span>
          </button>
        </div>

        {/* Formulário */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Categoria</label>
              <select value={mCat} onChange={e => setMCat(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-slate-900 transition-colors">
                <option value="house">🏠 Casa</option>
                <option value="fixed">📅 Fixa</option>
                <option value="work">📥 Trabalho</option>
                <option value="thirdParty">💳 Terceiros</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Descrição</label>
              <input type="text" placeholder="Ex: Aluguel" value={mDesc} onChange={e => setMDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-slate-900 transition-colors" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Valor</label>
              <input type="text" placeholder="R$ 0,00" value={mVal} onChange={handleManualValueChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:border-slate-900 transition-colors" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Parcelas</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus-within:border-slate-900 transition-colors">
                <input type="number" placeholder="0" value={mInstPaid} onChange={e => setMInstPaid(e.target.value)} className="w-full text-center bg-transparent outline-none font-bold" />
                <span className="px-1 text-slate-300 font-black">/</span>
                <input type="number" placeholder="0" value={mInstTotal} onChange={e => setMInstTotal(e.target.value)} className="w-full text-center bg-transparent outline-none font-bold" />
              </div>
            </div>
            <div className="md:col-span-2">
              <button onClick={addManualItem} className="w-full bg-slate-900 text-white font-black py-2.5 rounded-lg text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-800">Lançar</button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            {activeTab && (
              <>
                <ExpenseTable title="🏠 Contas da Casa" icon="" type="expense" showStatus={true} items={activeTab.items.filter(i => i.category === 'house')} onRemove={removeItem} onUpdate={updateItem} />
                <ExpenseTable title="📅 Contas Mensais" icon="" type="expense" showStatus={true} items={activeTab.items.filter(i => i.category === 'fixed')} onRemove={removeItem} onUpdate={updateItem} />
                <ExpenseTable title="📥 Entradas" icon="" type="income" items={activeTab.items.filter(i => i.category === 'work')} onRemove={removeItem} onUpdate={updateItem} />
                <ExpenseTable title="💳 Terceiros" icon="" type="neutral" items={activeTab.items.filter(i => i.category === 'thirdParty')} onRemove={removeItem} onUpdate={updateItem} />
              </>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <div className="p-4 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Gasto Total</p>
                  <p className="text-sm font-mono font-black text-rose-600">{fmt(totals.totalExpenses)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Renda Trabalho</p>
                  <p className="text-sm font-mono font-black text-emerald-600">{fmt(totals.workIncome)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Liquidado</p>
                  <p className="text-sm font-mono font-black text-blue-600">{fmt(totals.paidExpenses)}</p>
                </div>
                <div className="p-4 text-center bg-slate-50/50">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Pendente</p>
                  <p className="text-sm font-mono font-black text-amber-600">{fmt(totals.pendingExpenses)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-24">
              <button 
                onClick={runAnalysis} 
                disabled={analysisLoading || !activeTab || activeTab.items.length === 0} 
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-800 disabled:bg-slate-100 transition-all flex items-center justify-center gap-4 active:scale-95"
              >
                {analysisLoading ? <RefreshCw className="animate-spin" size={16} /> : <><Calculator size={16}/> Analisar Dados</>}
              </button>

              {analysis && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className={`text-xl font-black uppercase tracking-tighter mb-4 ${
                    analysis.summary.status === HealthStatus.HEALTHY ? 'text-emerald-600' : 
                    analysis.summary.status === HealthStatus.ATTENTION ? 'text-amber-600' : 'text-rose-700'
                  }`}>
                    {analysis.summary.status}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                      <span>Renda Trabalho:</span> <span className="text-slate-900 font-mono">{fmt(analysis.summary.totalWorkIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                      <span>Total Gastos:</span> <span className="text-slate-900 font-mono">{fmt(analysis.summary.totalExpenses)}</span>
                    </div>
                  </div>
                  {analysis.summary.alertMessage && (
                    <div className="mt-4 p-4 bg-rose-50 text-rose-700 text-[10px] font-black uppercase rounded-lg border border-rose-100 flex gap-2 leading-relaxed">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      {analysis.summary.alertMessage.replace(/\*\*/g, '')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="h-10 flex items-center justify-center text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Master Finance Engine • 2026</footer>
    </div>
  );
};

export default App;
