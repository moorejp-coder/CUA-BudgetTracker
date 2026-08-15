from datetime import date as date_type

from pydantic import BaseModel


class ForecastPoint(BaseModel):
    date: date_type
    projected_net_cash: float


class CashflowForecastResponse(BaseModel):
    horizon_days: int
    avg_monthly_income: float
    avg_monthly_expense: float
    avg_monthly_net: float
    upcoming_recurring_total: float
    starting_balance: float
    points: list[ForecastPoint]
