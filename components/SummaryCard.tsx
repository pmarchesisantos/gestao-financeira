
import React from 'react';

interface SummaryCardProps {
  label: string;
  value: number;
  type?: 'income' | 'expense' | 'balance';
  icon?: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, type = 'balance', icon }) => {
  const getColors = () => {
    switch (type) {
      case 'income': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'expense': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-indigo-600 bg-indigo-50 border-indigo-100';
    }
  };

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

  return (
    <div className={`p-5 rounded-2xl border ${getColors()} transition-all hover:shadow-md`}>
      <div className="flex items-center gap-3 mb-2">
        {icon && <div className="opacity-80">{icon}</div>}
        <span className="text-sm font-medium opacity-80 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold">{formattedValue}</div>
    </div>
  );
};

export default SummaryCard;
