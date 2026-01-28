
import React from 'react';
import { FinanceItem } from '../types';
import { Trash2 } from 'lucide-react';

interface ExpenseTableProps {
  title: string;
  items: FinanceItem[];
  icon: string;
  type: 'income' | 'expense' | 'neutral';
  showStatus?: boolean;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FinanceItem>) => void;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ 
  title, 
  items, 
  icon, 
  type, 
  showStatus = false,
  onRemove, 
  onUpdate 
}) => {
  const total = items.reduce((acc, curr) => acc + curr.value, 0);
  
  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleValueChange = (id: string, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '');
    const numericValue = digits ? parseInt(digits) / 100 : 0;
    onUpdate(id, { value: numericValue });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl">
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 lg:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
          <span>{icon}</span> {title}
        </h3>
        <span className={`text-xs font-mono font-black ${type === 'expense' ? 'text-rose-600 dark:text-rose-400' : type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
          {fmt(total)}
        </span>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        {/* Adicionado min-width para garantir que as colunas não fiquem excessivamente espremidas em telas pequenas */}
        <table className="w-full text-[11px] font-mono border-collapse min-w-[600px] lg:min-w-0">
          <thead>
            <tr className="bg-slate-50/30 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
              {showStatus && <th className="px-4 py-3 text-center font-black border-r border-slate-100 dark:border-slate-800 w-28">Status</th>}
              <th className="px-4 lg:px-6 py-3 text-left font-black border-r border-slate-100 dark:border-slate-800">Descrição</th>
              <th className="px-4 lg:px-6 py-3 text-right font-black border-r border-slate-100 dark:border-slate-800 w-36 lg:w-40">Valor</th>
              <th className="px-4 lg:px-6 py-3 text-center font-black w-24">Parcelas</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-colors group ${item.status === 'paid' ? 'bg-slate-50/30 dark:bg-slate-800/30 opacity-60' : ''}`}>
                  {showStatus && (
                    <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                      <div className="flex justify-center">
                        <select
                          value={item.status}
                          onChange={(e) => onUpdate(item.id, { status: e.target.value as any })}
                          className={`w-full text-[9px] font-black uppercase py-1.5 rounded-lg border outline-none transition-all cursor-pointer text-center ${
                            item.status === 'paid' 
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' 
                              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                          }`}
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago</option>
                        </select>
                      </div>
                    </td>
                  )}
                  <td className="px-1 lg:px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                    <input 
                      type="text"
                      value={item.description}
                      onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                      className={`w-full bg-transparent px-3 lg:px-4 py-2 outline-none text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 rounded-lg transition-all ${item.status === 'paid' ? 'line-through text-slate-400' : ''}`}
                    />
                  </td>
                  <td className="px-1 lg:px-2 py-2 text-right border-r border-slate-100 dark:border-slate-800">
                    <input 
                      type="text"
                      value={fmt(item.value)}
                      onChange={(e) => handleValueChange(item.id, e.target.value)}
                      className={`w-full bg-transparent text-right px-3 lg:px-4 py-2 font-bold outline-none focus:bg-white dark:focus:bg-slate-800 rounded-lg transition-all ${
                        item.status === 'paid' 
                          ? 'text-slate-400' 
                          : type === 'expense' ? 'text-rose-500' : type === 'income' ? 'text-emerald-600' : 'text-blue-600 dark:text-blue-400'
                      }`}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-400">
                      <input 
                        type="number"
                        value={item.paidInstallments ?? ''}
                        onChange={(e) => onUpdate(item.id, { paidInstallments: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="0"
                        className="w-8 bg-transparent text-right outline-none focus:text-blue-600 dark:focus:text-blue-400 transition-colors"
                      />
                      <span className="text-slate-300 dark:text-slate-700">/</span>
                      <input 
                        type="number"
                        value={item.totalInstallments ?? ''}
                        onChange={(e) => onUpdate(item.id, { totalInstallments: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="0"
                        className="w-8 bg-transparent text-left outline-none focus:text-blue-600 dark:focus:text-blue-400 transition-colors"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="text-slate-200 dark:text-slate-700 hover:text-rose-500 transition-all p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showStatus ? 5 : 4} className="px-4 py-16 text-center text-slate-300 dark:text-slate-700 italic uppercase tracking-[0.4em] text-[8px]">
                  Sem lançamentos para exibir
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseTable;
