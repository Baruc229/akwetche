export type AdminSubHistory = {
  id: number;
  status: string;
  provider: string;
  method: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

export type UserData = {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  status: string;
  initialBalance: number;
  currency: string;
  baseCurrency?: string;
  countryCode?: string | null;
  phone?: string | null;
  createdAt: string;
  emailVerified: string | null;
  loginAttempts: number;
  lockedUntil: string | null;
  _count: { transactions: number; products: number; sales: number; loginLogs: number };
  subscription: { status: string; amount: number; currency: string; endDate: string } | null;
  subscriptionHistory?: AdminSubHistory[];
};

export type LoginLog = {
  id: number;
  ip: string;
  userAgent: string;
  success: boolean;
  reason: string;
  createdAt: string;
  user: { name: string; email: string } | null;
};

export type Stats = {
  totalUsers: number;
  totalTransactions: number;
  totalSales: number;
  totalProducts: number;
  totalRevenue: number;
  activeSubscriptions: number;
  usersToday: number;
  loginAttemptsToday: number;
  failedLoginsToday: number;
  recentLogs: LoginLog[];
  usersByCountry?: { countryCode: string | null; _count: number }[];
  usersByCurrency?: { baseCurrency: string; _count: number }[];
  revenueByCurrency?: { XOF: number; EUR: number };
  subscriptionRevenue?: number;
  usersMonthly: { month: string; count: number }[];
  revenueMonthly: { month: string; abonnements: number; ventes: number }[];
};
