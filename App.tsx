
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Plus,
  AlertTriangle,
  Trash2,
  RefreshCw,
  CheckCircle2,
  LogOut,
  User,
  ShieldCheck,
  Sun,
  Moon,
  LayoutDashboard,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Lock,
  Key,
  Copy,
  History,
  Menu,
  X
} from 'lucide-react';
import { FinanceItem, HealthStatus, FinanceAnalysis, Ledger } from './types';
import ExpenseTable from './components/ExpenseTable';
import AuthForm from './components/AuthForm';
import { analyzeFinanceData } from './services/geminiService';
import { saveUserData, loadUserData, auth, onAuthStateChanged, signOut, updatePassword } from './firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [tabs, setTabs] = useState<Ledger[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('syncing');
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FinanceAnalysis | null>(null);
  
  // Sidebar states with responsive defaults
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  const [mDesc, setMDesc] = useState('');
  const [mVal, setMVal] = useState('');
  const [mCat, setMCat] = useState<'house' | 'fixed' | 'work' | 'thirdParty'>('house');
  const [mInstPaid, setMInstPaid] = useState('');
  const [mInstTotal, setMInstTotal] = useState('');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setTabs([]);
        setActiveTabId('');
        setAnalysis(null);
        setLoading(false);
      } else {
        setUser(currentUser);
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
          name: 'Minha Planilha',
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

  const duplicateTab = (idToDuplicate: string) => {
    const tabToCopy = tabs.find(t => t.id === idToDuplicate);
    if (!tabToCopy) return;

    const newTab: Ledger = {
      ...tabToCopy,
      id: 'tab-' + Date.now(),
      name: `${tabToCopy.name} (Cópia)`,
      items: tabToCopy.items.map(item => ({ 
        ...item, 
        id: 'item-' + Math.random().toString(36).substr(2, 9) 
      }))
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

  const handleUpdatePassword = async () => {
    setPwdMsg({ type: '', text: '' });
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'Mínimo de 6 caracteres.' });
      return;
    }

    setPwdLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setPwdMsg({ type: 'success', text: 'Senha atualizada!' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordForm(false), 2000);
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setPwdMsg({ type: 'error', text: 'Login recente exigido. Refaça o login.' });
      } else {
        setPwdMsg({ type: 'error', text: 'Erro ao atualizar.' });
      }
    } finally {
      setPwdLoading(false);
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (!user) return <AuthForm theme={theme} />;

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white font-black text-[10px] tracking-[0.4em] uppercase">
      <RefreshCw className="animate-spin mb-4 text-blue-500" size={32} />
      Iniciando Master Engine...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* SIDEBAR RETRÁTIL - MELHORIA RESPONSIVA */}
      <aside 
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-50 transition-all duration-300 
        ${isSidebarOpen ? 'w-[280px]' : 'w-0 lg:w-[80px] overflow-hidden lg:overflow-visible'}`}
      >
        <div className="p-6">
          <div className={`flex items-center gap-3 mb-10 transition-all ${!isSidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-slate-900 dark:bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg shrink-0">MF</div>
            {isSidebarOpen && (
              <div className="animate-in fade-in duration-300">
                <h1 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Master Finance</h1>
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Enterprise Edition</span>
              </div>
            )}
          </div>

          <nav className="space-y-2">
            <button 
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${!isSidebarOpen ? 'justify-center' : 'px-4'} bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white`}
            >
              <LayoutDashboard size={20} className="text-blue-500 shrink-0" />
              {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2">Dashboard</span>}
            </button>
            <button 
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${!isSidebarOpen ? 'justify-center' : 'px-4'} text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30`}
            >
              <Settings size={20} className="shrink-0" />
              {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2">Configurações</span>}
            </button>
            <button 
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${!isSidebarOpen ? 'justify-center' : 'px-4'} text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30`}
            >
              <HelpCircle size={20} className="shrink-0" />
              {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2">Suporte</span>}
            </button>
          </nav>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm z-50 transition-colors"
        >
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className="mt-auto p-4 space-y-4 overflow-y-auto no-scrollbar max-h-[400px]">
          <div className={`bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl flex items-center gap-1 ${!isSidebarOpen ? 'flex-col' : ''}`}>
            {isSidebarOpen ? (
              <>
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Sun size={14} /> Light
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-slate-900 shadow-sm text-white' : 'text-slate-400 hover:text-slate-500'}`}
                >
                  <Moon size={14} /> Dark
                </button>
              </>
            ) : (
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors"
              >
                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </div>

          {isSidebarOpen && (
            <div className="space-y-2">
              <button 
                onClick={() => { setShowPasswordForm(!showPasswordForm); setPwdMsg({ type: '', text: '' }); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${showPasswordForm ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800/30 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <Lock size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Segurança</span>
                </div>
                {showPasswordForm ? <ChevronLeft size={14} className="rotate-90" /> : <ChevronRight size={14} />}
              </button>

              {showPasswordForm && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nova Senha</label>
                    <div className="relative">
                      <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Repetir Senha</label>
                    <div className="relative">
                      <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  {pwdMsg.text && (
                    <div className={`text-[8px] font-black uppercase p-2 rounded-lg text-center ${pwdMsg.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {pwdMsg.text}
                    </div>
                  )}
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={pwdLoading || !newPassword}
                    className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-2.5 rounded-lg text-[9px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {pwdLoading ? <RefreshCw size={12} className="animate-spin" /> : "Salvar Senha"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className={`flex items-center gap-3 mb-4 ${!isSidebarOpen ? 'justify-center' : ''}`}>
               <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                 <User size={18} />
               </div>
               {isSidebarOpen && (
                 <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{user.email}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Membro Master</p>
                 </div>
               )}
            </div>
            <button 
               onClick={() => signOut(auth)} 
               className={`w-full flex items-center gap-2 py-3.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all ${!isSidebarOpen ? 'justify-center px-0' : 'justify-center'}`}
            >
               <LogOut size={16} /> {isSidebarOpen && "Sair do Sistema"}
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL - RESPONSIVIDADE DE MARGEM E PADDING */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-[80px]'} ml-0`}>
        <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
             {/* Botão Hambúrguer Mobile */}
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
               className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
             >
               {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
             </button>
             
             <div className="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Sessão Segura</span>
             </div>
             {syncStatus === 'synced' ? (
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <CheckCircle2 size={12} className="text-emerald-500" /> <span className="hidden xs:inline">Cloud Ativa</span>
                </div>
             ) : (
                <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                   <RefreshCw size={12} className="animate-spin" /> <span className="hidden xs:inline">Sincronizando...</span>
                </div>
             )}
          </div>
        </header>

        <main className="p-4 lg:p-10 pt-4 space-y-6 lg:space-y-8 max-w-6xl w-full mx-auto">
          
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-3 px-4 lg:px-6 py-4 border-b-2 transition-all cursor-pointer whitespace-nowrap group relative ${
                  activeTabId === tab.id 
                    ? 'border-slate-900 dark:border-blue-500 text-slate-900 dark:text-white' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{tab.name}</span>
                <div className="flex lg:opacity-0 lg:group-hover:opacity-100 items-center gap-1 ml-2 transition-opacity duration-200">
                  <button 
                    onClick={(e) => { e.stopPropagation(); duplicateTab(tab.id); }} 
                    className="text-slate-300 hover:text-blue-500 transition-colors p-1"
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteTab(tab.id); }} 
                    className={`text-slate-300 hover:text-rose-600 transition-colors p-1 ${tabs.length > 1 ? 'block' : 'hidden'}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addNewTab} className="px-6 py-4 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-2 border-b-2 border-transparent">
              <Plus size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Novo</span>
            </button>
          </div>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 lg:p-8 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 lg:gap-6 items-end">
              <div className="sm:col-span-1 md:col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Fluxo</label>
                <select value={mCat} onChange={e => setMCat(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all">
                  <option value="house">🏠 Casa</option>
                  <option value="fixed">📅 Mensal Fixa</option>
                  <option value="work">📥 Trabalho</option>
                  <option value="thirdParty">💳 Terceiros</option>
                </select>
              </div>
              <div className="sm:col-span-1 md:col-span-4">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Identificação</label>
                <input type="text" placeholder="Ex: Aluguel" value={mDesc} onChange={e => setMDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all" />
              </div>
              <div className="sm:col-span-1 md:col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Montante</label>
                <input type="text" placeholder="R$ 0,00" value={mVal} onChange={handleManualValueChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all" />
              </div>
              <div className="sm:col-span-1 md:col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest flex items-center gap-2"><History size={12} /> Parcelas</label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-xs transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                  <input type="number" placeholder="0" value={mInstPaid} onChange={e => setMInstPaid(e.target.value)} className="w-full text-right bg-transparent outline-none font-bold dark:text-white" />
                  <span className="px-3 font-black text-slate-300 dark:text-slate-600">/</span>
                  <input type="number" placeholder="0" value={mInstTotal} onChange={e => setMInstTotal(e.target.value)} className="w-full text-left bg-transparent outline-none font-bold dark:text-white" />
                </div>
              </div>
              <div className="sm:col-span-2 md:col-span-2">
                <button onClick={addManualItem} className="w-full bg-slate-900 dark:bg-blue-600 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-800 dark:hover:bg-blue-500 shadow-lg shadow-slate-900/10 dark:shadow-blue-600/20">Registrar</button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-8 space-y-6">
              {activeTab && (
                <>
                  <ExpenseTable title="🏠 Gestão da Casa" icon="" type="expense" showStatus={true} items={activeTab.items.filter(i => i.category === 'house')} onRemove={removeItem} onUpdate={updateItem} />
                  <ExpenseTable title="📅 Mensalidades" icon="" type="expense" showStatus={true} items={activeTab.items.filter(i => i.category === 'fixed')} onRemove={removeItem} onUpdate={updateItem} />
                  <ExpenseTable title="📥 Entradas" icon="" type="income" items={activeTab.items.filter(i => i.category === 'work')} onRemove={removeItem} onUpdate={updateItem} />
                  <ExpenseTable title="💳 Terceiros" icon="" type="neutral" items={activeTab.items.filter(i => i.category === 'thirdParty')} onRemove={removeItem} onUpdate={updateItem} />
                </>
              )}

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                  <div className="p-6 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Saída Total</p>
                    <p className="text-sm font-mono font-black text-rose-600 dark:text-rose-400">{fmt(totals.totalExpenses)}</p>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Renda</p>
                    <p className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">{fmt(totals.workIncome)}</p>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Pagas</p>
                    <p className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">{fmt(totals.paidExpenses)}</p>
                  </div>
                  <div className="p-6 text-center bg-slate-50/50 dark:bg-slate-800/20">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Em Aberto</p>
                    <p className="text-sm font-mono font-black text-amber-600 dark:text-amber-400">{fmt(totals.pendingExpenses)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm lg:sticky lg:top-24">
                <button 
                  onClick={runAnalysis} 
                  disabled={analysisLoading || !activeTab || activeTab.items.length === 0} 
                  className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 transition-all flex items-center justify-center gap-4 active:scale-95"
                >
                  {analysisLoading ? <RefreshCw className="animate-spin" size={16} /> : <><Calculator size={18}/> Gerar Diagnóstico</>}
                </button>

                {analysis && (
                  <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className={`text-2xl font-black uppercase tracking-tighter mb-6 ${
                      analysis.summary.status === HealthStatus.HEALTHY ? 'text-emerald-600' : 
                      analysis.summary.status === HealthStatus.ATTENTION ? 'text-amber-600' : 'text-rose-700'
                    }`}>
                      {analysis.summary.status}
                    </h3>
                    
                    <div className="space-y-5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                        <span>Comprometimento</span> 
                        <span className="text-slate-900 dark:text-white font-mono">{(analysis.summary.compromisePercentage * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            analysis.summary.compromisePercentage > 0.8 ? 'bg-rose-500' : 
                            analysis.summary.compromisePercentage > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(analysis.summary.compromisePercentage * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {analysis.summary.alertMessage && (
                      <div className="mt-6 p-5 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-bold uppercase rounded-xl border border-rose-100 dark:border-rose-500/20 flex gap-3 leading-relaxed">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        {analysis.summary.alertMessage.replace(/\*\*/g, '')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        
        <footer className="mt-auto h-16 flex items-center justify-center text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em] border-t border-slate-100 dark:border-slate-900">
          Master Finance Engine • 2026 • AI Powered
        </footer>
      </div>

      {/* Overlay para fechar sidebar no mobile quando aberta */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-all duration-300"
        />
      )}
    </div>
  );
};

export default App;
