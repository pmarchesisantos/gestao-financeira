
import React, { useState, useMemo, useEffect } from 'react';
import { Member, Ledger, FinanceItem, FinanceAnalysis, HealthStatus } from '../types';
import { Plus, Copy, Trash2, Calculator, History, CheckCircle, Clock, Tag, DollarSign, Type as TypeIcon, Sparkles, AlertTriangle } from 'lucide-react';
import ExpenseTable from './ExpenseTable';
import { analyzeFinanceData, parseNaturalLanguage } from '../services/geminiService';

interface MemberViewProps {
  member: Member;
  onUpdateLedgers: (ledgers: Ledger[]) => void;
  filter: { month: number; year: number };
  onRemove: () => void;
}

const MemberView: React.FC<MemberViewProps> = ({ member, onUpdateLedgers, filter, onRemove }) => {
  // Garantir que a planilha ativa corresponda ao filtro global se possível, ou seja a primeira
  const filteredLedgers = useMemo(() => {
    return member.ledgers.filter(l => l.month === filter.month && l.year === filter.year);
  }, [member.ledgers, filter]);

  const [activeLedgerId, setActiveLedgerId] = useState<string>('');

  useEffect(() => {
    if (filteredLedgers.length > 0) {
      setActiveLedgerId(filteredLedgers[0].id);
    } else if (member.ledgers.length > 0) {
      setActiveLedgerId(member.ledgers[0].id);
    }
  }, [member.id, filter.month, filter.year]);

  const [analysis, setAnalysis] = useState<FinanceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [nlpText, setNlpText] = useState('');

  // Form States
  const [mDesc, setMDesc] = useState('');
  const [mVal, setMVal] = useState('');
  const [mCat, setMCat] = useState<'house' | 'fixed' | 'work' | 'thirdParty'>('house');
  const [mInstPaid, setMInstPaid] = useState('');
  const [mInstTotal, setMInstTotal] = useState('');

  const activeLedger = useMemo(() => {
    return member.ledgers.find(l => l.id === activeLedgerId) || member.ledgers[0];
  }, [member, activeLedgerId]);

  const items = activeLedger?.items || [];

  const updateItem = (id: string, updates: Partial<FinanceItem>) => {
    const newLedgers = member.ledgers.map(l => 
      l.id === activeLedgerId 
        ? { ...l, items: l.items.map(i => i.id === id ? { ...i, ...updates } : i) } 
        : l
    );
    onUpdateLedgers(newLedgers);
  };

  const removeItem = (id: string) => {
    const newLedgers = member.ledgers.map(l => 
      l.id === activeLedgerId 
        ? { ...l, items: l.items.filter(i => i.id !== id) } 
        : l
    );
    onUpdateLedgers(newLedgers);
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
      id: Math.random().toString(36).substr(2, 9),
      description: mDesc,
      value: numericValue,
      category: mCat,
      paidInstallments: mInstPaid ? parseInt(mInstPaid) : undefined,
      totalInstallments: mInstTotal ? parseInt(mInstTotal) : undefined,
      status: 'pending'
    };
    const newLedgers = member.ledgers.map(l => l.id === activeLedgerId ? { ...l, items: [...l.items, newItem] } : l);
    onUpdateLedgers(newLedgers);
    setMDesc(''); setMVal(''); setMInstPaid(''); setMInstTotal('');
  };

  const addLedger = () => {
    const name = prompt("Nome para a nova planilha deste período:");
    if (!name) return;
    const newLedger: Ledger = { id: 'led-' + Date.now(), name, month: filter.month, year: filter.year, items: [] };
    onUpdateLedgers([...member.ledgers, newLedger]);
    setActiveLedgerId(newLedger.id);
  };

  const runAnalysis = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const result = await analyzeFinanceData(items);
      setAnalysis(result);
    } catch (err) {
      alert('Erro na análise Master Finance. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleNLP = async () => {
    if (!nlpText.trim()) return;
    setParsing(true);
    try {
      const parsedItems = await parseNaturalLanguage(nlpText);
      const newItems: FinanceItem[] = parsedItems.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        description: item.description || 'Novo Item',
        value: item.value || 0,
        category: item.category as any || 'house',
        paidInstallments: item.paidInstallments,
        totalInstallments: item.totalInstallments,
        status: 'pending'
      }));
      
      const newLedgers = member.ledgers.map(l => 
        l.id === activeLedgerId ? { ...l, items: [...l.items, ...newItems] } : l
      );
      onUpdateLedgers(newLedgers);
      setNlpText('');
    } catch (err) {
      alert('Erro ao processar texto com IA.');
    } finally {
      setParsing(false);
    }
  };

  const summaryData = useMemo(() => {
    const expenses = items.filter(i => i.category === 'house' || i.category === 'fixed');
    const totalPaid = expenses.filter(i => i.status === 'paid').reduce((a, b) => a + b.value, 0);
    const totalPending = expenses.filter(i => i.status === 'pending').reduce((a, b) => a + b.value, 0);
    return { totalPaid, totalPending, paidItems: expenses.filter(i => i.status === 'paid') };
  }, [items]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-xl shadow-slate-900/10">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{member.name}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Gestão de Fluxo de Caixa Individual</p>
          </div>
        </div>
        <button 
          onClick={onRemove} 
          className="text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-rose-100"
        >
          Excluir Membro
        </button>
      </div>

      {/* Spreadsheet Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
        {member.ledgers.map(l => (
          <button
            key={l.id}
            onClick={() => { setActiveLedgerId(l.id); setAnalysis(null); }}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeLedgerId === l.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'}`}
          >
            {l.name} <span className="ml-2 opacity-40 font-mono">[{l.month}/{l.year}]</span>
          </button>
        ))}
        <button 
          onClick={addLedger} 
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95"
        >
          <Plus size={14} /> Nova Planilha
        </button>
      </div>

      <section className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden p-6 md:p-8">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
          <Plus size={18} className="text-blue-600" />
          <h2 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.2em]">Lançamento Manual Rápido</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wide"><Tag size={12} /> Categoria</label>
            <select value={mCat} onChange={e => setMCat(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all cursor-pointer">
              <option value="house">🏠 Casa</option>
              <option value="fixed">📅 Mensal Fixa</option>
              <option value="work">📥 Trabalho</option>
              <option value="thirdParty">💳 Terceiros</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wide"><TypeIcon size={12} /> Descrição</label>
            <input type="text" placeholder="Ex: Mercado mensal" value={mDesc} onChange={e => setMDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all" />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wide"><DollarSign size={12} /> Valor</label>
            <input type="text" placeholder="R$ 0,00" value={mVal} onChange={handleManualValueChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all" />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wide"><History size={12} /> Parcelas</label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs transition-all focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500">
              <input type="number" placeholder="0" value={mInstPaid} onChange={e => setMInstPaid(e.target.value)} className="w-full text-right bg-transparent outline-none font-bold [appearance:textfield]" />
              <span className="px-3 font-black text-slate-300">/</span>
              <input type="number" placeholder="0" value={mInstTotal} onChange={e => setMInstTotal(e.target.value)} className="w-full text-left bg-transparent outline-none font-bold [appearance:textfield]" />
            </div>
          </div>
          <div className="md:col-span-2">
            <button onClick={addManualItem} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-600/20 active:scale-95">Lançar</button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <ExpenseTable title="🏠 Contas da Casa" icon="" type="expense" showStatus={true} items={items.filter(i => i.category === 'house')} onRemove={removeItem} onUpdate={updateItem} />
          <ExpenseTable title="📅 Contas Mensais" icon="" type="expense" showStatus={true} items={items.filter(i => i.category === 'fixed')} onRemove={removeItem} onUpdate={updateItem} />
          <ExpenseTable title="📥 Entradas" icon="" type="income" items={items.filter(i => i.category === 'work')} onRemove={removeItem} onUpdate={updateItem} />
          <ExpenseTable title="💳 Terceiros" icon="" type="neutral" items={items.filter(i => i.category === 'thirdParty')} onRemove={removeItem} onUpdate={updateItem} />

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4"><CheckCircle size={22} className="text-emerald-400" /><h3 className="text-xs font-black uppercase tracking-[0.2em]">Fluxo de Caixa Real</h3></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100">
               <div className="p-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Itens Liquidados</h4>
                  <div className="space-y-3 max-h-56 overflow-y-auto no-scrollbar mb-6 pr-2">
                     {summaryData.paidItems.length > 0 ? summaryData.paidItems.map(i => (
                       <div key={i.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-50 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                         <span className="font-bold text-slate-600">{i.description}</span>
                         <span className="font-mono font-black text-emerald-600">{fmt(i.value)}</span>
                       </div>
                     )) : (
                       <div className="text-center py-4 text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">Nenhum item pago</div>
                     )}
                  </div>
                  <div className="flex justify-between items-center pt-5 border-t border-slate-200">
                     <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider">Total Pago</span>
                     <span className="text-xl font-mono font-black text-emerald-600">{fmt(summaryData.totalPaid)}</span>
                  </div>
               </div>
               <div className="p-8 bg-slate-50/30">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={14} className="text-amber-500" /> A Pagar (Pendente)</h4>
                  <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center transform hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Saldo Devedor</p>
                    <p className="text-4xl font-mono font-black text-rose-500 tracking-tighter">{fmt(summaryData.totalPending)}</p>
                  </div>
                  <p className="text-[9px] text-center mt-6 font-bold text-slate-400 uppercase leading-relaxed px-4">Este valor representa tudo o que foi lançado mas ainda não foi marcado como "Pago".</p>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 sticky top-24">
           <button onClick={runAnalysis} disabled={loading || items.length === 0} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-4 disabled:bg-slate-200 active:scale-95 group">
             {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calculator size={20} className="group-hover:scale-110 transition-transform" />}
             Gerar Análise Master
           </button>

           {analysis && (
             <div className="bg-white border-2 border-slate-900 p-8 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-900/5 rounded-bl-full -mr-12 -mt-12"></div>
                <span className="text-[10px] font-black uppercase text-slate-400 mb-3 block tracking-widest">Diagnóstico Master Finance</span>
                <h3 className={`text-3xl font-black uppercase tracking-tighter mb-6 ${analysis.summary.status === HealthStatus.HEALTHY ? 'text-emerald-700' : analysis.summary.status === HealthStatus.ATTENTION ? 'text-amber-700' : 'text-rose-700'}`}>{analysis.summary.status}</h3>
                <div className="space-y-5">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                    <span className="text-slate-400">Renda Mensal (Líquida)</span>
                    <span className="text-emerald-600">{fmt(analysis.summary.totalWorkIncome)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                    <span className="text-slate-400">Gastos Essenciais</span>
                    <span className="text-rose-600">{fmt(analysis.summary.totalExpenses)}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between text-sm font-black uppercase">
                    <span className="text-slate-900">Saldo Disponível</span>
                    <span className={analysis.summary.remainingBalance >= 0 ? 'text-blue-600 font-mono' : 'text-rose-600 font-mono'}>{fmt(analysis.summary.remainingBalance)}</span>
                  </div>
                </div>
                {analysis.summary.alertMessage && (
                  <div className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-[11px] font-bold flex gap-3 items-start leading-relaxed">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> 
                    {analysis.summary.alertMessage.replace(/\*\*/g, '')}
                  </div>
                )}
             </div>
           )}

           <details className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-blue-200">
             <summary className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer list-none transition-colors group-hover:bg-blue-50/30">
               <div className="flex items-center gap-3"><Sparkles size={16} className="text-blue-600" /><h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master IA Assistant</h2></div>
               <Plus size={14} className="group-open:rotate-45 transition-transform duration-300" />
             </summary>
             <div className="p-6 space-y-5 animate-in slide-in-from-top-2">
               <textarea value={nlpText} onChange={(e) => setNlpText(e.target.value)} placeholder="Ex: Gastei 150 reais no mercado ontem e 50 com gasolina..." className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 resize-none transition-all placeholder:text-slate-300" />
               <button onClick={handleNLP} disabled={parsing || !nlpText} className="w-full bg-blue-600 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-600/10 active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 transition-all flex items-center justify-center gap-2">
                 {parsing ? "Interpretando..." : "Processar via IA"}
               </button>
               <p className="text-[9px] text-slate-400 text-center font-bold uppercase leading-relaxed">Você pode digitar naturalmente seus gastos e a IA irá categorizá-los para você.</p>
             </div>
           </details>
        </div>
      </div>
    </div>
  );
};

export default MemberView;
