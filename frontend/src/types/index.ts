export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  emoji: string;
  parent_id: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  institution: string;
  is_liability: boolean;
  current_balance: number;
  archived: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  category: Category | null;
  date: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  payee: string;
  notes: string;
  source: "manual" | "csv";
  tags: string[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Budget {
  id: string;
  category: Category;
  period: string;
  amount: number;
  rollover: boolean;
  spent: number;
  rolled_over_amount: number;
}

export interface RecurringItem {
  id: string;
  category_id: string | null;
  merchant: string;
  expected_amount: number;
  cadence: string;
  next_expected_date: string | null;
  is_confirmed: boolean;
  active: boolean;
}

export interface RecurringSuggestion {
  merchant: string;
  expected_amount: number;
  cadence: string;
  occurrences: number;
  last_date: string;
  next_expected_date: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  monthly_contribution: number;
  current_amount: number;
  account_ids: string[];
}

export interface SummaryResponse {
  period: string;
  total_income: number;
  total_expense: number;
  net: number;
  top_categories: { category_id: string; name: string; color: string; emoji: string; total: number }[];
  top_merchants: { payee: string; total: number }[];
  budget_status: { category_id: string; category_name: string; budget: number; spent: number; over: boolean }[];
}

export interface CashflowPoint {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategorySpend {
  category_id: string;
  name: string;
  color: string;
  emoji: string;
  total: number;
}

export interface NetWorthPoint {
  date: string;
  assets: number;
  liabilities: number;
  net_worth: number;
}

export interface BudgetSuggestionBucket {
  key: string;
  label: string;
  description: string;
  pct: number;
  amount: number;
}

export interface BudgetSuggestion {
  period: string;
  monthly_income: number;
  has_debt: boolean;
  debt_bucket_label: "debt_paydown" | "investing";
  buckets: BudgetSuggestionBucket[];
}

export interface HomeSavingsPlan {
  period: string;
  monthly_income: number;
  has_debt: boolean;
  max_monthly_mortgage_payment: number;
  max_home_price: number;
  down_payment_pct: number;
  closing_cost_pct: number;
  amount_needed_to_close: number;
  suggested_monthly_savings: number;
  months_to_save_from_zero: number | null;
}

// --- AI features ---------------------------------------------------------

export interface AssistantQueryResponse {
  answer: string;
  data: Record<string, unknown>;
  source: "llm" | "deterministic";
  intents: string[];
}

export interface ScenarioAdjustment {
  target: string;
  value: number;
}

export interface ScenarioResult {
  baseline_monthly_income: number;
  baseline_monthly_expense: number;
  baseline_monthly_net: number;
  projected_monthly_expense: number;
  projected_monthly_net: number;
  monthly_net_delta: number;
  category_projections: { category: string; baseline_monthly: number; projected_monthly: number }[];
  goal_impacts: {
    goal_id: string;
    goal_name: string;
    extra_monthly_contribution: number;
    months_to_goal_baseline: number | null;
    months_to_goal_projected: number | null;
    months_saved: number | null;
  }[];
  unmatched_adjustments: { target: string; value: number; note: string }[];
}

export interface ScenarioQueryResponse {
  explanation: string;
  scenario: { adjustments: ScenarioAdjustment[]; base_months: number; horizon_days: number };
  result: ScenarioResult;
  source: "llm" | "deterministic";
}

export interface SubscriptionsAssistantResponse {
  summary: string;
  subscriptions: Subscription[];
  anomalies: SubscriptionAnomalies;
  source: "llm" | "deterministic";
}

export interface Subscription {
  id: string;
  merchant: string;
  category_id: string | null;
  amount: number;
  cadence: string;
  monthly_equivalent: number;
  next_expected_date: string | null;
}

export interface SubscriptionAnomalies {
  new_subscriptions: { merchant: string; expected_amount: number; cadence: string; first_seen: string }[];
  price_increases: { merchant: string; previous_average: number; latest_amount: number; increase_pct: number }[];
}

export interface SpendingAnomaly {
  transaction_id: string;
  date: string;
  payee: string;
  category_id: string | null;
  category_name: string | null;
  amount: number;
  reason: string;
}

export interface BehaviorSignals {
  period: string;
  budget_adherence: {
    tracked_categories: number;
    over_budget_count: number;
    over_budget_pct: number;
    details: { category_id: string; category_name: string; budget: number; spent: number; pct_used: number; over: boolean }[];
  };
  goal_progress: {
    goal_id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    pct_complete: number;
    target_date: string | null;
    expected_pct_by_now: number | null;
    behind_pct: number | null;
    monthly_contribution: number;
  }[];
  weekday_weekend_pattern: {
    weekday_avg_daily_spend: number;
    weekend_avg_daily_spend: number;
    weekend_to_weekday_ratio: number | null;
    notable: boolean;
  };
}

export interface BudgetVarianceRow {
  category_id: string;
  category_name: string;
  target_budget: number;
  spent: number;
  variance_vs_target: number;
  variance_vs_target_pct: number | null;
  over_target: boolean;
  prior_period: string;
  prior_spent: number;
  variance_vs_prior: number;
  variance_vs_prior_pct: number | null;
}

export interface BudgetVarianceResponse {
  period: string;
  prior_period: string;
  categories: BudgetVarianceRow[];
}

export interface GoalForecastItem {
  goal_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  remaining_amount: number;
  monthly_contribution: number;
  months_to_goal: number | null;
  projected_completion_date: string | null;
  target_date: string | null;
  on_pace: boolean | null;
}

export interface CashflowForecast {
  horizon_days: number;
  avg_monthly_income: number;
  avg_monthly_expense: number;
  avg_monthly_net: number;
  upcoming_recurring_total: number;
  starting_balance: number;
  points: { date: string; projected_net_cash: number }[];
}

export interface Recap {
  id: string;
  period_type: "week" | "month";
  period_start: string;
  period_end: string;
  recap_text: string;
  context: Record<string, unknown>;
  source: "llm" | "deterministic";
  created_at: string;
}

export interface Nudge {
  id: string;
  event_type: string;
  context: Record<string, unknown>;
  message: string;
  source: "llm" | "deterministic";
  created_at: string;
  delivered_at: string | null;
  dismissed_at: string | null;
}
