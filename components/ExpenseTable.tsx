
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
    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden mb-6 rounded-lg">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-[10px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-[0.2em]">
          <span>{icon}</span> {title}
        </h3>
        <span className={`text-xs font-mono font-bold ${type === 'expense' ? 'text-rose-600' : type === 'income' ? 'text-emerald-600' : 'text-blue-600'}`}>
          {fmt(total)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400">
              {showStatus && <th className="px-2 py-2 text-center font-black border-r border-slate-100 w-24 uppercase tracking-tighter">Status</th>}
              <th className="px-4 py-2 text-left font-black border-r border-slate-100 uppercase tracking-tighter">Descrição</th>
              <th className="px-4 py-2 text-right font-black border-r border-slate-100 w-36 uppercase tracking-tighter">Valor</th>
              <th className="px-4 py-2 text-center font-black w-28 uppercase tracking-tighter">Parcelas</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className={`hover:bg-blue-50/30 transition-colors group ${item.status === 'paid' ? 'bg-slate-50/50 opacity-80' : ''}`}>
                  {showStatus && (
                    <td className="px-1 py-1 border-r border-slate-100">
                      <div className="flex justify-center px-1">
                        <select
                          value={item.status}
                          onChange={(e) => onUpdate(item.id, { status: e.target.value as any })}
                          className={`w-full text-[9px] font-black uppercase py-1 rounded border outline-none transition-all cursor-pointer text-center ${
                            item.status === 'paid' 
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-100 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago</option>
                        </select>
                      </div>
                    </td>
                  )}
                  <td className="px-1 py-1 border-r border-slate-100">
                    <input 
                      type="text"
                      value={item.description}
                      onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                      className={`w-full bg-transparent px-3 py-1.5 outline-none text-slate-600 focus:bg-white focus:shadow-sm rounded transition-all ${item.status === 'paid' ? 'line-through text-slate-400' : ''}`}
                    />
                  </td>
                  <td className="px-1 py-1 text-right border-r border-slate-100">
                    <input 
                      type="text"
                      value={fmt(item.value)}
                      onChange={(e) => handleValueChange(item.id, e.target.value)}
                      className={`w-full bg-transparent text-right px-3 py-1.5 font-bold outline-none focus:bg-white focus:shadow-sm rounded transition-all ${
                        item.status === 'paid' 
                          ? 'text-slate-400' 
                          : type === 'expense' ? 'text-rose-500' : type === 'income' ? 'text-emerald-600' : 'text-blue-600'
                      }`}
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-400">
                      <input 
                        type="number"
                        value={item.paidInstallments ?? ''}
                        onChange={(e) => onUpdate(item.id, { paidInstallments: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="0"
                        className="w-8 bg-transparent text-right outline-none focus:text-blue-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-slate-300">/</span>
                      <input 
                        type="number"
                        value={item.totalInstallments ?? ''}
                        onChange={(e) => onUpdate(item.id, { totalInstallments: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="0"
                        className="w-8 bg-transparent text-left outline-none focus:text-blue-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="text-slate-200 hover:text-rose-500 transition-all p-1.5 rounded-full hover:bg-rose-50"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showStatus ? 5 : 4} className="px-4 py-10 text-center text-slate-300 italic uppercase tracking-[0.3em] text-[8px]">
                  Nenhum registro
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
