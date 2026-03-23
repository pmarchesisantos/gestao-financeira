
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, Plus, AlertTriangle, Trash2, RefreshCw, CheckCircle2, 
  LogOut, User, ShieldCheck, Sun, Moon, LayoutDashboard, Settings, 
  HelpCircle, ChevronRight, ChevronLeft, Lock, Key, Copy, History, 
  Menu, X, Edit2, Percent, List, Save
} from 'lucide-react';
import { FinanceItem, HealthStatus, FinanceAnalysis, Ledger, Category, FinanceSettings } from './types';
import ExpenseTable from './components/ExpenseTable';
import AuthForm from './components/AuthForm';
import { analyzeFinanceData } from './services/geminiService';
import { saveUserData, loadUserData, auth, onAuthStateChanged, signOut, updatePassword } from './firebase';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'house', name: 'Casa', icon: '🏠', type: 'expense' },
  { id: 'fixed', name: 'Mensal Fixa', icon: '📅', type: 'expense' },
  { id: 'work', name: 'Trabalho', icon: '📥', type: 'income' },
  { id: 'thirdParty', name: 'Terceiros', icon: '💳', type: 'neutral' }
];

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [tabs, setTabs] = useState<Ledger[]>([]);
  const [settings, setSettings] = useState<FinanceSettings>({
    maxCompromisePercentage: 0.8,
    categories: DEFAULT_CATEGORIES
  });
  
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('syncing');
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FinanceAnalysis | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark');
  const [showSettings, setShowSettings] = useState(false);

  // States para Auth/Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  // States para Novo Item Manual
  const [mDesc, setMDesc] = useState('');
  const [mVal, setMVal] = useState('');
  const [mCat, setMCat] = useState<string>('house');
  const [mInstPaid, setMInstPaid] = useState('');
  const [mInstTotal, setMInstTotal] = useState('');

  // States para Gestão de Categorias
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [newCatType, setNewCatType] = useState<'income' | 'expense' | 'neutral'>('expense');

  useEffect(() => {
    theme === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null); setTabs([]); setActiveTabId(''); setAnalysis(null); setLoading(false);
      } else {
        setUser(currentUser); initData();
      }
    });
    return () => unsubscribe();
  }, []);

  const initData = async () => {
    setLoading(true);
    try {
      const data = await loadUserData();
      if (data) {
        if (data.tabs && data.tabs.length > 0) {
          setTabs(data.tabs);
          // Carregar a planilha mais recente (maior ID/timestamp)
          const sortedTabs = [...data.tabs].sort((a, b) => b.id.localeCompare(a.id));
          setActiveTabId(sortedTabs[0].id);
        }
        if (data.settings) {
          setSettings(data.settings);
        }
        setSyncStatus('synced');
      } else {
        const defaultTab: Ledger = { id: 'tab-' + Date.now(), name: 'Minha Planilha', month: new Date().getMonth() + 1, year: new Date().getFullYear(), items: [] };
        setTabs([defaultTab]); setActiveTabId(defaultTab.id); setSyncStatus('local');
      }
    } catch (e) { setSyncStatus('error'); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (loading || tabs.length === 0 || !user) return;
    setSyncStatus('syncing');
    const timeout = setTimeout(async () => {
      try {
        await saveUserData(tabs, settings);
        setSyncStatus('synced');
      } catch (e) { setSyncStatus('error'); }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [tabs, settings, loading, user]);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);

  const updateItem = (id: string, updates: Partial<FinanceItem>) => {
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, items: tab.items.map(i => i.id === id ? { ...i, ...updates } : i) } : tab));
  };

  const removeItem = (id: string) => {
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, items: tab.items.filter(i => i.id !== id) } : tab));
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
      description: mDesc, value: numericValue, category: mCat,
      paidInstallments: mInstPaid ? parseInt(mInstPaid) : undefined,
      totalInstallments: mInstTotal ? parseInt(mInstTotal) : undefined,
      status: 'pending'
    };
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, items: [...tab.items, newItem] } : tab));
    setMDesc(''); setMVal(''); setMInstPaid(''); setMInstTotal('');
  };

  const addNewTab = () => {
    const newTab: Ledger = { id: 'tab-' + Date.now(), name: 'Nova Planilha', month: new Date().getMonth() + 1, year: new Date().getFullYear(), items: [] };
    setTabs(prev => [...prev, newTab]); setActiveTabId(newTab.id);
  };

  const duplicateTab = (idToDuplicate: string) => {
    const tabToCopy = tabs.find(t => t.id === idToDuplicate);
    if (!tabToCopy) return;
    
    console.log('Duplicating tab:', tabToCopy.name, 'with', tabToCopy.items.length, 'items');

    const newItems: FinanceItem[] = tabToCopy.items.map(i => {
      const isInstallment = i.paidInstallments !== undefined && i.totalInstallments !== undefined && i.totalInstallments > 0;
      const reachedEnd = isInstallment && i.paidInstallments! >= i.totalInstallments!;
      
      return { 
        ...i, 
        id: 'item-' + Math.random().toString(36).substr(2, 9),
        status: 'pending',
        paidInstallments: (isInstallment && !reachedEnd) ? (i.paidInstallments! + 1) : i.paidInstallments
      };
    });

    // Calcular próximo mês/ano
    let nextMonth = tabToCopy.month + 1;
    let nextYear = tabToCopy.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const currentMonthName = monthNames[tabToCopy.month - 1];
    const newName = `${currentMonthName} (copia)`;

    const newTab: Ledger = { 
      ...tabToCopy, 
      id: 'tab-' + Date.now(), 
      name: newName, 
      items: newItems
    };
    
    console.log('New tab created:', newTab.name, 'with', newItems.length, 'items');
    setTabs(prev => [...prev, newTab]); 
    setActiveTabId(newTab.id);
  };

  const deleteTab = (idToDelete: string) => {
    if (tabs.length <= 1) return alert("Não é possível excluir a única planilha.");
    if (window.confirm("Deseja realmente excluir permanentemente esta planilha?")) {
      const newTabs = tabs.filter(t => t.id !== idToDelete);
      if (idToDelete === activeTabId) {
        const sortedRemaining = [...newTabs].sort((a, b) => b.id.localeCompare(a.id));
        setActiveTabId(sortedRemaining[0].id);
      }
      setTabs(newTabs);
    }
  };

  const totals = useMemo(() => {
    const items = activeTab?.items || [];
    const incomeCats = settings.categories.filter(c => c.type === 'income').map(c => c.id);
    const expenseCats = settings.categories.filter(c => c.type === 'expense').map(c => c.id);
    const neutralCats = settings.categories.filter(c => c.type === 'neutral').map(c => c.id);

    const workIncome = items.filter(i => incomeCats.includes(i.category)).reduce((a, b) => a + b.value, 0);
    const neutralIncome = items.filter(i => neutralCats.includes(i.category)).reduce((a, b) => a + b.value, 0);
    const totalEntrance = workIncome + neutralIncome;

    const totalExpenses = items.filter(i => expenseCats.includes(i.category)).reduce((a, b) => a + b.value, 0);
    const paidExpenses = items.filter(i => expenseCats.includes(i.category) && i.status === 'paid').reduce((a, b) => a + b.value, 0);
    const pendingExpenses = items.filter(i => expenseCats.includes(i.category) && i.status === 'pending').reduce((a, b) => a + b.value, 0);
    
    return { workIncome, neutralIncome, totalEntrance, totalExpenses, paidExpenses, pendingExpenses };
  }, [activeTab, settings]);

  const runAnalysis = async () => {
    if (!activeTab || activeTab.items.length === 0) return;
    setAnalysisLoading(true);
    try {
      const result = await analyzeFinanceData(activeTab.items, settings.categories, settings.maxCompromisePercentage);
      setAnalysis(result);
    } catch (err) { 
      console.error(err);
      alert('Erro na análise. Verifique sua conexão ou API_KEY no Vercel.'); 
    } finally { setAnalysisLoading(false); }
  };

  const handleUpdatePassword = async () => {
    setPwdMsg({ type: '', text: '' });
    if (newPassword !== confirmPassword) return setPwdMsg({ type: 'error', text: 'Senhas não coincidem.' });
    setPwdLoading(true);
    try {
      if (auth.currentUser) await updatePassword(auth.currentUser, newPassword);
      setPwdMsg({ type: 'success', text: 'Senha atualizada!' });
      setNewPassword(''); setConfirmPassword('');
    } catch (err: any) { setPwdMsg({ type: 'error', text: 'Erro ao atualizar.' }); } finally { setPwdLoading(false); }
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const id = 'cat-' + Date.now();
    setSettings(prev => ({ ...prev, categories: [...prev.categories, { id, name: newCatName.trim(), icon: newCatIcon, type: newCatType }] }));
    setNewCatName('');
  };

  const editCategory = (id: string, currentName: string) => {
    const newName = prompt("Renomear fluxo para:", currentName);
    if (newName?.trim()) {
      setSettings(prev => ({
        ...prev,
        categories: prev.categories.map(c => c.id === id ? { ...c, name: newName.trim() } : c)
      }));
    }
  };

  const removeCategory = (id: string) => {
    if (settings.categories.length <= 1) return alert("Mínimo de uma categoria necessária.");
    if (window.confirm("Deseja remover este fluxo? Itens vinculados continuarão existindo mas sem categoria definida.")) {
      setSettings(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
    }
  };

  const toggleNav = (view: 'dashboard' | 'settings') => {
    if (view === 'dashboard') setShowSettings(false);
    else setShowSettings(true);
    
    // Fechar menu no mobile após clicar
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (!user) return <AuthForm theme={theme} />;
  
  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white font-black text-[10px] tracking-[0.4em] uppercase">
      <RefreshCw className="animate-spin mb-4 text-blue-500" size={32} /> Iniciando Master Engine...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
      {/* Backdrop para Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-50 transition-all duration-300 ${isSidebarOpen ? 'w-[280px] translate-x-0' : 'w-[280px] lg:w-[80px] -translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 dark:bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg">MF</div>
              {(isSidebarOpen || window.innerWidth < 1024) && (
                <div className="animate-in fade-in duration-300">
                  <h1 className="text-xs font-black uppercase tracking-[0.2em]">Master Finance</h1>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Enterprise</span>
                </div>
              )}
            </div>
            {window.innerWidth < 1024 && (
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400">
                <X size={20} />
              </button>
            )}
          </div>
          <nav className="space-y-2">
            <button 
              onClick={() => toggleNav('dashboard')} 
              className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all ${!showSettings ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <LayoutDashboard size={20} />
              {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>}
            </button>
            <button 
              onClick={() => toggleNav('settings')} 
              className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all ${showSettings ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <Settings size={20} />
              {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Ajustes</span>}
            </button>
          </nav>
        </div>
        <div className="mt-auto p-4">
           <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 p-3.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-rose-100 dark:hover:bg-rose-500/20">
             <LogOut size={18} /> 
             {isSidebarOpen && "Encerrar Sessão"}
           </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-[80px]'} ml-0 w-full`}>
        <header className="h-20 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
               {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
             </button>
             <div className="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-500/20 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
               <ShieldCheck size={12} /> Master Secure Core
             </div>
           </div>
           <div className="flex items-center gap-2">
             <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2.5 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
               {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
           </div>
        </header>

        <main className="p-6 lg:p-10 pt-4 space-y-8 max-w-6xl w-full mx-auto">
          {showSettings ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter">Configurações Gerais</h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parametrização do motor Master Finance</p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="bg-slate-900 dark:bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  Salvar e Voltar ao Painel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 text-blue-500">
                    <Percent size={20} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Limite de Comprometimento</h3>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Este valor define o teto de gastos para o diagnóstico de saúde financeira.</p>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" min="0.1" max="1.0" step="0.05" 
                        value={settings.maxCompromisePercentage} 
                        onChange={e => setSettings(prev => ({ ...prev, maxCompromisePercentage: parseFloat(e.target.value) }))} 
                        className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                      />
                      <span className="text-lg font-mono font-black text-blue-500">{(settings.maxCompromisePercentage * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 text-amber-500">
                    <Lock size={20} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Segurança de Acesso</h3>
                  </div>
                  <div className="space-y-4">
                    <input type="password" placeholder="Nova Senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-bold outline-none" />
                    <input type="password" placeholder="Confirme a Senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-bold outline-none" />
                    <button onClick={handleUpdatePassword} disabled={pwdLoading} className="w-full bg-slate-900 dark:bg-slate-800 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors active:scale-95">
                      {pwdLoading ? "Processando..." : "Redefinir Credenciais"}
                    </button>
                    {pwdMsg.text && <p className={`text-[8px] font-black uppercase text-center ${pwdMsg.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>{pwdMsg.text}</p>}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-8 shadow-sm">
                <div className="flex items-center gap-3 text-emerald-500">
                  <List size={20} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Gerenciador de Fluxos (Categorias)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div><label className="text-[8px] font-black text-slate-400 uppercase mb-2 block">Ícone</label><input type="text" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl text-center" /></div>
                  <div className="md:col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase mb-2 block">Nome do Fluxo</label><input type="text" placeholder="Ex: Investimentos" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl text-xs font-bold" /></div>
                  <div><label className="text-[8px] font-black text-slate-400 uppercase mb-2 block">Tipo</label><select value={newCatType} onChange={e => setNewCatType(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl text-xs font-bold"><option value="expense">Saída</option><option value="income">Entrada</option><option value="neutral">Neutro</option></select></div>
                  <button onClick={addCategory} className="w-full md:col-span-4 bg-emerald-500 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Plus size={16} /> Criar Novo Fluxo de Caixa
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {settings.categories.map(cat => (
                    <div key={cat.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight">{cat.name}</p>
                          <p className={`text-[8px] font-black uppercase ${cat.type === 'income' ? 'text-emerald-500' : cat.type === 'expense' ? 'text-rose-500' : 'text-blue-500'}`}>{cat.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editCategory(cat.id, cat.name)} className="text-slate-400 hover:text-blue-500 p-1"><Edit2 size={14} /></button>
                        <button onClick={() => removeCategory(cat.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 pb-2 custom-scrollbar">
                {tabs.map((tab) => (
                  <div 
                    key={tab.id} 
                    onClick={() => setActiveTabId(tab.id)} 
                    className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all cursor-pointer whitespace-nowrap group ${activeTabId === tab.id ? 'border-slate-900 dark:border-blue-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">{tab.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); duplicateTab(tab.id); }} className="p-1 hover:text-blue-500"><Copy size={12} /></button>
                      {tabs.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteTab(tab.id); }} className="p-1 hover:text-rose-600"><Trash2 size={12} /></button>}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={addNewTab}
                  className="flex items-center gap-2 px-6 py-4 text-slate-400 hover:text-blue-500 transition-all whitespace-nowrap"
                  title="Nova Planilha"
                >
                  <Plus size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Nova</span>
                </button>
              </div>

              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-6 items-end">
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Fluxo</label>
                    <select value={mCat} onChange={e => setMCat(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-bold outline-none">
                      {settings.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Identificação</label>
                    <input type="text" placeholder="Ex: Aluguel" value={mDesc} onChange={e => setMDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-bold outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Montante</label>
                    <input type="text" placeholder="R$ 0,00" value={mVal} onChange={handleManualValueChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-mono font-bold outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Parcelas</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3.5 text-xs focus-within:ring-2 focus-within:ring-blue-500/20">
                      <input type="number" placeholder="0" value={mInstPaid} onChange={e => setMInstPaid(e.target.value)} className="w-full text-right bg-transparent outline-none font-bold" />
                      <span className="px-2 font-black text-slate-300">/</span>
                      <input type="number" placeholder="0" value={mInstTotal} onChange={e => setMInstTotal(e.target.value)} className="w-full text-left bg-transparent outline-none font-bold" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <button onClick={addManualItem} className="w-full bg-slate-900 dark:bg-blue-600 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95">Registrar</button>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                  {settings.categories.map(cat => {
                    const catItems = activeTab?.items.filter(i => i.category === cat.id) || [];
                    return (
                      <ExpenseTable 
                        key={cat.id} 
                        title={cat.name} 
                        icon={cat.icon} 
                        type={cat.type === 'income' ? 'income' : cat.type === 'expense' ? 'expense' : 'neutral'} 
                        showStatus={true} 
                        items={catItems} 
                        onRemove={removeItem} 
                        onUpdate={updateItem} 
                      />
                    );
                  })}

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                    <div className="p-6 text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">TOTAL SAÍDA</p><p className="text-sm font-mono font-black text-rose-600 dark:text-rose-400">{fmt(totals.totalExpenses)}</p></div>
                    <div className="p-6 text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">TOTAL ENTRADA</p><p className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">{fmt(totals.totalEntrance)}</p></div>
                    <div className="p-6 text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">PAGAS</p><p className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">{fmt(totals.paidExpenses)}</p></div>
                    <div className="p-6 text-center bg-slate-50/50 dark:bg-slate-800/20"><p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">EM ABERTO</p><p className="text-sm font-mono font-black text-amber-600 dark:text-amber-400">{fmt(totals.pendingExpenses)}</p></div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm lg:sticky lg:top-24">
                    <button onClick={runAnalysis} disabled={analysisLoading || !activeTab || activeTab.items.length === 0} className="w-full bg-slate-900 dark:bg-blue-600 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 shadow-xl">
                      {analysisLoading ? <RefreshCw className="animate-spin" size={16} /> : <><Calculator size={18}/> Gerar Diagnóstico</>}
                    </button>
                    {analysis && (
                      <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className={`text-2xl font-black uppercase tracking-tighter mb-6 ${analysis.summary.status === HealthStatus.HEALTHY ? 'text-emerald-600' : analysis.summary.status === HealthStatus.ATTENTION ? 'text-amber-600' : 'text-rose-700'}`}>{analysis.summary.status}</h3>
                        <div className="space-y-5">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><span>Comprometimento</span><span className="text-slate-900 dark:text-white font-mono">{(analysis.summary.compromisePercentage * 100).toFixed(1)}%</span></div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${analysis.summary.compromisePercentage > settings.maxCompromisePercentage ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(analysis.summary.compromisePercentage * 100, 100)}%` }} />
                          </div>
                        </div>
                        {analysis.summary.alertMessage && String(analysis.summary.alertMessage).toLowerCase() !== 'null' && (
                          <div className="mt-6 p-5 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-bold uppercase rounded-xl border border-rose-100 dark:border-rose-500/20 flex gap-3 animate-in fade-in duration-300">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            {analysis.summary.alertMessage.replace(/\*\*/g, '')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
        <footer className="mt-auto h-16 flex items-center justify-center text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em] border-t border-slate-100 dark:border-slate-900">Master Finance Engine • 2026</footer>
      </div>
    </div>
  );
};

export default App;
