
export interface FinanceItem {
  id: string;
  description: string;
  value: number;
  category: 'house' | 'fixed' | 'work' | 'thirdParty';
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
