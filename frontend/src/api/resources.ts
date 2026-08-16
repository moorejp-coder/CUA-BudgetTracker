import { api } from "./client";
import type {
  Account,
  AssistantQueryResponse,
  BehaviorSignals,
  Budget,
  BudgetSuggestion,
  BudgetVarianceResponse,
  CashflowForecast,
  CashflowPoint,
  Category,
  CategorySpend,
  Goal,
  GoalForecastItem,
  NetWorthPoint,
  Nudge,
  Page,
  Recap,
  RecurringItem,
  RecurringSuggestion,
  ScenarioAdjustment,
  ScenarioQueryResponse,
  ScenarioResult,
  SpendingAnomaly,
  Subscription,
  SubscriptionAnomalies,
  SubscriptionsAssistantResponse,
  SummaryResponse,
  Transaction,
} from "@/types";

export const AccountsApi = {
  list: () => api.get<Account[]>("/accounts").then((r) => r.data),
  create: (data: Partial<Account>) => api.post<Account>("/accounts", data).then((r) => r.data),
  update: (id: string, data: Partial<Account>) => api.patch<Account>(`/accounts/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/accounts/${id}`),
  addSnapshot: (id: string, date: string, balance: number) =>
    api.post(`/accounts/${id}/balance-snapshot`, { date, balance }),
};

export const CategoriesApi = {
  list: () => api.get<Category[]>("/categories").then((r) => r.data),
  create: (data: Partial<Category>) => api.post<Category>("/categories", data).then((r) => r.data),
  update: (id: string, data: Partial<Category>) => api.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/categories/${id}`),
};

export interface TransactionFilters {
  account_id?: string;
  category_id?: string;
  type?: string;
  q?: string;
  start?: string;
  end?: string;
  page?: number;
  page_size?: number;
}

export const TransactionsApi = {
  list: (filters: TransactionFilters) =>
    api.get<Page<Transaction>>("/transactions", { params: filters }).then((r) => r.data),
  create: (data: Partial<Transaction> & { tags?: string[] }) =>
    api.post<Transaction>("/transactions", data).then((r) => r.data),
  update: (id: string, data: Partial<Transaction>) =>
    api.patch<Transaction>(`/transactions/${id}`, data).then((r) => r.data),
  bulkUpdate: (transaction_ids: string[], category_id?: string) =>
    api.post("/transactions/bulk-update", { transaction_ids, category_id }),
  remove: (id: string) => api.delete(`/transactions/${id}`),
};

export const BudgetsApi = {
  list: (period: string) => api.get<Budget[]>("/budgets", { params: { period } }).then((r) => r.data),
  create: (data: { category_id: string; period: string; amount: number; rollover: boolean }) =>
    api.post<Budget>("/budgets", data).then((r) => r.data),
  update: (id: string, data: Partial<Budget>) => api.patch<Budget>(`/budgets/${id}`, data).then((r) => r.data),
};

export const RecurringApi = {
  list: () => api.get<RecurringItem[]>("/recurring").then((r) => r.data),
  create: (data: Partial<RecurringItem>) => api.post<RecurringItem>("/recurring", data).then((r) => r.data),
  update: (id: string, data: Partial<RecurringItem>) =>
    api.patch<RecurringItem>(`/recurring/${id}`, data).then((r) => r.data),
  suggestions: () => api.get<RecurringSuggestion[]>("/recurring/suggestions").then((r) => r.data),
  upcoming: (days = 30) => api.get(`/recurring/upcoming`, { params: { days } }).then((r) => r.data),
};

export const GoalsApi = {
  list: () => api.get<Goal[]>("/goals").then((r) => r.data),
  create: (data: Partial<Goal> & { account_ids?: string[] }) => api.post<Goal>("/goals", data).then((r) => r.data),
  update: (id: string, data: Partial<Goal>) => api.patch<Goal>(`/goals/${id}`, data).then((r) => r.data),
};

export const AnalyticsApi = {
  summary: (month: string) => api.get<SummaryResponse>("/analytics/summary", { params: { month } }).then((r) => r.data),
  cashflow: (start: string, end: string) =>
    api.get<CashflowPoint[]>("/analytics/cashflow", { params: { start, end } }).then((r) => r.data),
  spendByCategory: (start: string, end: string) =>
    api.get<CategorySpend[]>("/analytics/spend-by-category", { params: { start, end } }).then((r) => r.data),
  netWorth: (start: string, end: string) =>
    api.get<NetWorthPoint[]>("/analytics/net-worth", { params: { start, end } }).then((r) => r.data),
  budgetSuggestion: (period: string) =>
    api.get<BudgetSuggestion>("/analytics/budget-suggestion", { params: { period } }).then((r) => r.data),
  budgetVariance: (period: string, compare_months = 1) =>
    api
      .get<BudgetVarianceResponse>("/analytics/budget-variance", { params: { period, compare_months } })
      .then((r) => r.data),
};

export const CsvImportApi = {
  preview: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/csv-imports/preview", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  commit: (payload: unknown) => api.post("/csv-imports/commit", payload).then((r) => r.data),
  templates: () => api.get("/csv-imports/templates").then((r) => r.data),
};

export const LlmApi = {
  status: () => api.get("/llm/status").then((r) => r.data),
  categorize: (description: string) => api.post("/llm/categorize", { description }).then((r) => r.data),
  ask: (question: string) => api.post("/llm/ask", { question }).then((r) => r.data),
};

export const AssistantApi = {
  query: (question: string): Promise<AssistantQueryResponse> => api.post("/assistant/query", { question }).then((r) => r.data),
  scenario: (question: string): Promise<ScenarioQueryResponse> => api.post("/assistant/scenario", { question }).then((r) => r.data),
  subscriptions: (): Promise<SubscriptionsAssistantResponse> => api.get("/assistant/subscriptions").then((r) => r.data),
  anomalies: (days = 30): Promise<{ summary: string; anomalies: SpendingAnomaly[]; source: string }> =>
    api.get("/assistant/anomalies", { params: { days } }).then((r) => r.data),
};

export const ForecastApi = {
  cashflow: (days: number): Promise<CashflowForecast> => api.get("/forecast/cashflow", { params: { days } }).then((r) => r.data),
  scenario: (adjustments: ScenarioAdjustment[], base_months = 3): Promise<ScenarioResult> =>
    api.post("/forecast/scenario", { adjustments, base_months }).then((r) => r.data),
  goals: (): Promise<GoalForecastItem[]> => api.get("/forecast/goals").then((r) => r.data),
};

export const RecapsApi = {
  list: (): Promise<Recap[]> => api.get("/recaps").then((r) => r.data),
  get: (id: string): Promise<Recap> => api.get(`/recaps/${id}`).then((r) => r.data),
  generate: (period_type: "week" | "month"): Promise<Recap> => api.post("/recaps/generate", { period_type }).then((r) => r.data),
};

export const NudgesApi = {
  list: (includeDismissed = false): Promise<Nudge[]> =>
    api.get("/nudges", { params: { include_dismissed: includeDismissed } }).then((r) => r.data),
  generate: (): Promise<Nudge[]> => api.post("/nudges/generate").then((r) => r.data),
  dismiss: (id: string): Promise<Nudge> => api.post(`/nudges/${id}/dismiss`).then((r) => r.data),
};

export const SubscriptionsAnalyticsApi = {
  list: (): Promise<{ subscriptions: Subscription[]; total_monthly: number }> =>
    api.get("/analytics/subscriptions").then((r) => r.data),
  anomalies: (): Promise<SubscriptionAnomalies> => api.get("/analytics/subscriptions/anomalies").then((r) => r.data),
  spendingAnomalies: (start: string, end: string): Promise<SpendingAnomaly[]> =>
    api.get("/analytics/anomalies", { params: { start, end } }).then((r) => r.data),
  behaviorSignals: (period: string): Promise<BehaviorSignals> =>
    api.get("/analytics/behavior-signals", { params: { period } }).then((r) => r.data),
};
