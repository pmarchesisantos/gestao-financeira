
import React, { useMemo } from 'react';
// Fixed: Member is now correctly exported from types.ts
import { Member, HealthStatus } from '../types';
import { Wallet, TrendingUp, AlertCircle, CheckCircle, Calculator, UserPlus } from 'lucide-react';

interface DashboardProps {
  members: Member[];
  filter: { month: number; year: number };
  onAddMember: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ members, filter, onAddMember }) => {
  const consolidated = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalThirdParty = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalItemsCount = 0;

    members.forEach(m => {
      m.ledgers.forEach(l => {
        if (l.month === filter.month && l.year === filter.year) {
          l.items.forEach(item => {
            totalItemsCount++;
            if (item.category === 'work') {
              totalIncome += item.value;
            } else if (item.category === 'thirdParty') {
              totalThirdParty += item.value;
            } else {
              totalExpenses += item.value;
              if (item.status === 'paid') totalPaid += item.value;
              else totalPending += item.value;
            }
          });
        }
      });
    });

    const compromise = totalIncome > 0 ? (totalExpenses / totalIncome) : (totalExpenses > 0 ? 1 : 0);
    
    let status = HealthStatus.HEALTHY;
    if (compromise > 0.8) status = HealthStatus.CRITICAL;
    else if (compromise > 0.5) status = HealthStatus.ATTENTION;

    return { totalIncome, totalExpenses, totalPaid, totalPending, totalItemsCount, compromise, status };
  }, [members, filter]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Relatório Consolidado</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumo de todos os membros cadastrados</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button 
            onClick={onAddMember}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            <UserPlus size={14} /> Novo Membro
          </button>
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">
            Global • {filter.month}/{filter.year}
          </div>
        </div>
      </div>

      {/* Big Numbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><TrendingUp size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arrecadação Total</span>
          </div>
          <div className="text-2xl font-mono font-black text-emerald-600 truncate">{fmt(consolidated.totalIncome)}</div>
          <div className="mt-2 text-[9px] font-bold text-slate-400">Excluindo repasses de terceiros</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><CheckCircle size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Liquidado</span>
          </div>
          <div className="text-2xl font-mono font-black text-blue-600 truncate">{fmt(consolidated.totalPaid)}</div>
          <div className="mt-2 text-[9px] font-bold text-slate-400">{consolidated.totalItemsCount} registros processados</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600"><Calculator size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Pendente</span>
          </div>
          <div className="text-2xl font-mono font-black text-rose-600 truncate">{fmt(consolidated.totalPending)}</div>
          <div className="mt-2 text-[9px] font-bold text-slate-400">A pagar por todos os membros</div>
        </div>

        <div className={`p-6 rounded-2xl shadow-xl border-2 transition-all ${
          consolidated.status === HealthStatus.HEALTHY ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          consolidated.status === HealthStatus.ATTENTION ? 'bg-amber-50 border-amber-200 text-amber-900' : 
          'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center justify-between mb-4">
             <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Saúde Global</span>
             {consolidated.status === HealthStatus.CRITICAL && <AlertCircle size={16} className="text-rose-600 animate-pulse" />}
          </div>
          <div className="text-2xl font-black uppercase tracking-tighter mb-2">{consolidated.status}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
               <div className={`h-full transition-all duration-1000 ${consolidated.compromise > 0.8 ? 'bg-rose-500' : consolidated.compromise > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(consolidated.compromise * 100, 100)}%` }} />
            </div>
            <span className="text-[10px] font-mono font-black">{(consolidated.compromise * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Member Summary List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Desempenho por Membro</h3>
          <span className="text-[9px] font-mono text-slate-400 uppercase">Filtro Ativo</span>
        </div>
        <div className="p-4 space-y-2">
           {members.map(m => {
             const mItems = m.ledgers
               .filter(l => l.month === filter.month && l.year === filter.year)
               .flatMap(l => l.items);
             const income = mItems.filter(i => i.category === 'work').reduce((a, b) => a + b.value, 0);
             const expense = mItems.filter(i => i.category !== 'work' && i.category !== 'thirdParty').reduce((a, b) => a + b.value, 0);
             return (
               <div key={m.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-all gap-4">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase text-xs">
                        {m.name.charAt(0)}
                     </div>
                     <div>
                        <p className="text-sm font-bold text-slate-800">{m.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{mItems.length} registros no período</p>
                     </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 md:gap-12 w-full md:w-auto">
                     <div className="text-right flex-1 md:flex-none">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Entrada</p>
                        <p className="text-sm font-mono font-black text-emerald-600">{fmt(income)}</p>
                     </div>
                     <div className="text-right flex-1 md:flex-none">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Saída</p>
                        <p className="text-sm font-mono font-black text-rose-600">{fmt(expense)}</p>
                     </div>
                     <div className="w-24 text-right hidden md:block">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Status</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${expense > income ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {expense > income ? 'Déficit' : 'Superávit'}
                        </span>
                     </div>
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
