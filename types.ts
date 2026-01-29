
export interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense' | 'neutral';
}

export interface FinanceSettings {
  maxCompromisePercentage: number;
  categories: Category[];
}

export interface FinanceItem {
  id: string;
  description: string;
  value: number;
  category: string; // Dinâmico agora
  paidInstallments?: number;
  totalInstallments?: number;
  status: 'pending' | 'paid';
}

export interface Ledger {
  id: string;
  name: string;
  month: number;
  year: number;
  items: FinanceItem[];
}

// Added Member interface
export interface Member {
  id: string;
  name: string;
  ledgers: Ledger[];
}

export enum HealthStatus {
  HEALTHY = 'Saudável',
  ATTENTION = 'Atenção',
  CRITICAL = 'Crítico'
}

export interface FinanceAnalysis {
  summary: {
    totalWorkIncome: number;
    totalExpenses: number;
    remainingBalance: number;
    compromisePercentage: number;
    status: HealthStatus;
    alertMessage: string | null;
  };
  analysisDate: string;
}
