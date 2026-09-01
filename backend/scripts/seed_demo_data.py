"""Seed a "judge demo" login and a "test" login with identical preloaded data — several
months of realistic accounts/categories/transactions/budgets/recurring items, plus
one generated recap and one nudge pass so those views aren't empty on first login. The two
profiles only differ by email/password/display name, so either one demos the same way.

Run from `backend/` with the venv active:

    python -m scripts.seed_demo_data

Safe to re-run: each profile's existing data (if any) is wiped and rebuilt from scratch.
Does NOT touch any other user in the database.
"""
from __future__ import annotations

import asyncio
import os
import random
from datetime import date, timedelta

# Must be set before the first `app.*` import — Settings is cached with lru_cache.
os.environ.setdefault("LLM_ENABLED", "false")

from sqlalchemy import delete  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.session import Base, SessionLocal, engine  # noqa: E402
from app.models.account import Account, AccountBalanceSnapshot  # noqa: E402
from app.models.budget import Budget  # noqa: E402
from app.models.category import Category  # noqa: E402
from app.models.nudge import NudgeEvent  # noqa: E402
from app.models.recap import Recap  # noqa: E402
from app.models.recurring import RecurringItem  # noqa: E402
from app.models.tag import Tag  # noqa: E402
from app.models.transaction import Transaction, transaction_tags  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services import nudge_rules  # noqa: E402
from app.services.recap_builder import generate_and_store  # noqa: E402

Base.metadata.create_all(bind=engine)

TODAY = date.today()

CATEGORY_DEFS = [
    ("Salary", "income", "#34d399", "💼"),
    ("Freelance", "income", "#60a5fa", "🧾"),
    ("Groceries", "expense", "#f87171", "🛒"),
    ("Rent", "expense", "#fb923c", "🏠"),
    ("Dining Out", "expense", "#f472b6", "🍽️"),
    ("Transportation", "expense", "#a78bfa", "🚗"),
    ("Subscriptions", "expense", "#38bdf8", "📺"),
    ("Entertainment", "expense", "#fbbf24", "🎬"),
    ("Utilities", "expense", "#4ade80", "💡"),
    ("Shopping", "expense", "#ec4899", "🛍️"),
    ("Health & Fitness", "expense", "#2dd4bf", "🏋️"),
    ("Travel", "expense", "#818cf8", "✈️"),
]


def wipe_profile(db: Session, email: str) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return
    uid = user.id
    account_ids = [a.id for a in db.query(Account.id).filter(Account.user_id == uid)]
    txn_ids = [t.id for t in db.query(Transaction.id).filter(Transaction.user_id == uid)]
    if txn_ids:
        db.execute(delete(transaction_tags).where(transaction_tags.c.transaction_id.in_(txn_ids)))
    for model in (Transaction, Budget, RecurringItem, Recap, NudgeEvent, Tag):
        db.query(model).filter(model.user_id == uid).delete(synchronize_session=False)
    if account_ids:
        db.query(AccountBalanceSnapshot).filter(AccountBalanceSnapshot.account_id.in_(account_ids)).delete(
            synchronize_session=False
        )
    db.query(Account).filter(Account.user_id == uid).delete(synchronize_session=False)
    db.query(Category).filter(Category.user_id == uid).delete(synchronize_session=False)
    db.query(User).filter(User.id == uid).delete(synchronize_session=False)
    db.commit()


def make_user(db: Session, email: str, password: str, display_name: str) -> User:
    user = User(email=email, hashed_password=hash_password(password), display_name=display_name)
    db.add(user)
    db.flush()
    return user


def make_categories(db: Session, user: User) -> dict[str, Category]:
    cats = {}
    for name, type_, color, emoji in CATEGORY_DEFS:
        c = Category(user_id=user.id, name=name, type=type_, color=color, emoji=emoji)
        db.add(c)
        cats[name] = c
    db.flush()
    return cats


def make_accounts(db: Session, user: User, *, with_investment: bool) -> dict[str, Account]:
    checking = Account(
        user_id=user.id, name="Everyday Checking", type="checking", institution="First Horizon Bank"
    )
    savings = Account(
        user_id=user.id, name="High-Yield Savings", type="savings", institution="First Horizon Bank"
    )
    credit = Account(
        user_id=user.id, name="Rewards Credit Card", type="credit_card", institution="Chase", is_liability=True
    )
    db.add_all([checking, savings, credit])
    accounts = {"checking": checking, "savings": savings, "credit": credit}
    if with_investment:
        investment = Account(user_id=user.id, name="Brokerage", type="investment", institution="Fidelity")
        investment.current_balance = 15230.44
        db.add(investment)
        accounts["investment"] = investment
    db.flush()
    return accounts


def month_span(start: date, end: date) -> list[tuple[int, int]]:
    months = []
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        months.append((y, m))
        m += 1
        if m == 13:
            m = 1
            y += 1
    return months


def build_transactions(
    db: Session,
    user: User,
    accounts: dict[str, Account],
    cats: dict[str, Category],
    *,
    start: date,
    rng: random.Random,
    starting_checking: float,
    starting_savings: float,
    include_travel_month_idx: int | None,
) -> None:
    balances = {"checking": starting_checking, "savings": starting_savings, "credit": 0.0}
    txns: list[Transaction] = []

    def add(d: date, amount: float, type_: str, payee: str, category: str | None, account: str, notes: str = ""):
        amount = round(amount, 2)
        t = Transaction(
            user_id=user.id,
            account_id=accounts[account].id,
            category_id=cats[category].id if category else None,
            date=d,
            amount=amount,
            type=type_,
            payee=payee,
            notes=notes,
        )
        txns.append(t)
        db.add(t)
        if type_ == "income":
            balances[account] += amount
        elif type_ == "expense":
            if account == "credit":
                balances["credit"] += amount
            else:
                balances[account] -= amount

    def pay_credit_card(d: date, amount: float):
        amount = round(min(amount, balances["credit"]), 2)
        if amount <= 0:
            return
        t = Transaction(
            user_id=user.id,
            account_id=accounts["checking"].id,
            transfer_account_id=accounts["credit"].id,
            category_id=None,
            date=d,
            amount=amount,
            type="transfer",
            payee="Chase Credit Card Payment",
            notes="Auto-pay",
        )
        txns.append(t)
        db.add(t)
        balances["checking"] -= amount
        balances["credit"] -= amount

    def move_to_savings(d: date, amount: float):
        t = Transaction(
            user_id=user.id,
            account_id=accounts["checking"].id,
            transfer_account_id=accounts["savings"].id,
            category_id=None,
            date=d,
            amount=amount,
            type="transfer",
            payee="Transfer to Savings",
            notes="Monthly savings contribution",
        )
        txns.append(t)
        db.add(t)
        balances["checking"] -= amount
        balances["savings"] += amount

    months = month_span(start, TODAY)
    last_credit_bill = 0.0

    for idx, (y, m) in enumerate(months):
        month_start = date(y, m, 1)
        next_month = date(y + (m == 12), (m % 12) + 1, 1)
        month_end = min(next_month - timedelta(days=1), TODAY)
        if month_start > TODAY:
            break

        # Salary, twice a month.
        add(month_start.replace(day=1), 3120.00, "income", "Acme Corp Payroll", "Salary", "checking")
        if month_start.replace(day=15) <= month_end:
            add(month_start.replace(day=15), 3120.00, "income", "Acme Corp Payroll", "Salary", "checking")

        # Occasional freelance income.
        if rng.random() < 0.55:
            day = min(rng.randint(5, 25), month_end.day)
            add(
                date(y, m, day),
                round(rng.uniform(300, 950), 2),
                "income",
                "Freelance Client Invoice",
                "Freelance",
                "checking",
            )

        # Rent, 1st of the month.
        add(month_start, 1450.00, "expense", "Willow Creek Apartments", "Rent", "checking", "Monthly rent")

        # Utilities.
        util_day = min(8, month_end.day)
        add(date(y, m, util_day), round(rng.uniform(78, 135), 2), "expense", "City Power & Light", "Utilities", "checking")
        add(date(y, m, min(10, month_end.day)), 64.99, "expense", "Fiberlink Internet", "Utilities", "checking")

        # Subscriptions (on the credit card).
        for day, payee, amt in ((3, "Netflix", 15.49), (5, "Spotify", 11.99), (7, "Anytime Fitness", 39.99)):
            d = date(y, m, min(day, month_end.day))
            cat = "Health & Fitness" if payee == "Anytime Fitness" else "Subscriptions"
            add(d, amt, "expense", payee, cat, "credit")

        # Groceries, several trips per month.
        grocery_days = sorted(rng.sample(range(1, month_end.day + 1), k=min(8, month_end.day)))
        for day in grocery_days:
            payee = rng.choice(["Trader Joe's", "Whole Foods Market", "Safeway", "Costco"])
            acct = "credit" if rng.random() < 0.6 else "checking"
            add(date(y, m, day), round(rng.uniform(24, 96), 2), "expense", payee, "Groceries", acct)

        # Dining out.
        for _ in range(rng.randint(4, 8)):
            day = rng.randint(1, month_end.day)
            payee = rng.choice(["Chipotle", "Local Coffee Roasters", "Sushi Palace", "Pizzeria Bella", "Thai Basil"])
            add(date(y, m, day), round(rng.uniform(9, 62), 2), "expense", payee, "Dining Out", "credit")

        # Transportation.
        for _ in range(rng.randint(3, 5)):
            day = rng.randint(1, month_end.day)
            payee = rng.choice(["Shell Gas Station", "Uber", "Metro Transit Pass"])
            add(date(y, m, day), round(rng.uniform(12, 58), 2), "expense", payee, "Transportation", "credit")

        # Entertainment / shopping, a bit lumpier.
        for _ in range(rng.randint(1, 3)):
            day = rng.randint(1, month_end.day)
            payee = rng.choice(["AMC Theatres", "Steam", "Concert Tickets Co."])
            add(date(y, m, day), round(rng.uniform(11, 65), 2), "expense", payee, "Entertainment", "credit")
        for _ in range(rng.randint(1, 4)):
            day = rng.randint(1, month_end.day)
            payee = rng.choice(["Target", "Amazon", "REI", "Best Buy"])
            add(date(y, m, day), round(rng.uniform(18, 175), 2), "expense", payee, "Shopping", "credit")

        if include_travel_month_idx is not None and idx == include_travel_month_idx and month_end.day >= 20:
            add(date(y, m, min(20, month_end.day)), 412.50, "expense", "Delta Air Lines", "Travel", "credit")

        # Pay off most of the card balance and stash something in savings each month.
        pay_credit_card(min(month_end, date(y, m, min(28, month_end.day))), balances["credit"] * rng.uniform(0.85, 1.0))
        move_to_savings(date(y, m, min(3, month_end.day)), round(rng.uniform(350, 550), 2))

    db.flush()

    # Weekly balance snapshots across the whole window, for the net-worth chart.
    d = start
    while d <= TODAY:
        for key in ("checking", "savings", "credit"):
            db.add(AccountBalanceSnapshot(account_id=accounts[key].id, date=d, balance=round(balances[key], 2)))
        d += timedelta(days=7)
    if d - timedelta(days=7) != TODAY:
        for key in ("checking", "savings", "credit"):
            db.add(AccountBalanceSnapshot(account_id=accounts[key].id, date=TODAY, balance=round(balances[key], 2)))

    accounts["checking"].current_balance = round(balances["checking"], 2)
    accounts["savings"].current_balance = round(balances["savings"], 2)
    accounts["credit"].current_balance = round(balances["credit"], 2)
    db.flush()


def make_budgets(db: Session, user: User, cats: dict[str, Category], period: str) -> None:
    amounts = {
        "Groceries": 500,
        "Rent": 1450,
        "Dining Out": 300,
        "Transportation": 200,
        "Subscriptions": 75,
        "Entertainment": 120,
        "Utilities": 220,
        "Shopping": 250,
        "Health & Fitness": 60,
    }
    for name, amount in amounts.items():
        db.add(Budget(user_id=user.id, category_id=cats[name].id, period=period, amount=amount))
    db.flush()


def make_recurring(db: Session, user: User, cats: dict[str, Category]) -> None:
    def next_month_day(day: int) -> date:
        y, m = TODAY.year, TODAY.month
        if TODAY.day >= day:
            m += 1
            if m == 13:
                m, y = 1, y + 1
        last_day_this_month = (date(y, m % 12 + 1, 1) - timedelta(days=1)).day if m != 12 else 31
        return date(y, m, min(day, last_day_this_month))

    items = [
        ("Willow Creek Apartments", 1450.00, "monthly", 1, "Rent"),
        ("Netflix", 15.49, "monthly", 3, "Subscriptions"),
        ("Spotify", 11.99, "monthly", 5, "Subscriptions"),
        ("Anytime Fitness", 39.99, "monthly", 7, "Health & Fitness"),
        ("Fiberlink Internet", 64.99, "monthly", 10, "Utilities"),
    ]
    for merchant, amount, cadence, day, cat in items:
        db.add(
            RecurringItem(
                user_id=user.id,
                category_id=cats[cat].id,
                merchant=merchant,
                expected_amount=amount,
                cadence=cadence,
                next_expected_date=next_month_day(day),
                is_confirmed=True,
                active=True,
            )
        )
    db.flush()


async def generate_ai_content(db: Session, user: User) -> None:
    try:
        await generate_and_store(db, user.id, "month")
    except Exception as exc:  # pragma: no cover - best-effort demo content
        print(f"  (skipped monthly recap: {exc})")
    try:
        await generate_and_store(db, user.id, "week")
    except Exception as exc:  # pragma: no cover
        print(f"  (skipped weekly recap: {exc})")
    try:
        await nudge_rules.generate_for_user(db, user.id)
    except Exception as exc:  # pragma: no cover
        print(f"  (skipped nudges: {exc})")


async def seed_profile(db: Session, *, email: str, password: str, display_name: str) -> None:
    """Same dataset (accounts, categories, transactions, budgets, recurring items,
    recap, nudges) for every profile — only login and display name differ."""
    print(f"Seeding {display_name} profile ({email})...")
    wipe_profile(db, email)
    user = make_user(db, email, password, display_name)
    cats = make_categories(db, user)
    accounts = make_accounts(db, user, with_investment=True)
    start = date(TODAY.year, TODAY.month - 3 if TODAY.month > 3 else TODAY.month + 9, 1)
    if TODAY.month <= 3:
        start = start.replace(year=TODAY.year - 1)
    build_transactions(
        db,
        user,
        accounts,
        cats,
        start=start,
        rng=random.Random(42),
        starting_checking=2450.00,
        starting_savings=8200.00,
        include_travel_month_idx=1,
    )
    period = f"{TODAY.year}-{TODAY.month:02d}"
    make_budgets(db, user, cats, period)
    make_recurring(db, user, cats)
    db.commit()
    await generate_ai_content(db, user)
    print(f"  user_id={user.id}  password={password}")


async def main() -> None:
    db = SessionLocal()
    try:
        await seed_profile(db, email="judge@example.com", password="JudgeDemo2026!", display_name="Judge Demo")
        await seed_profile(db, email="test@example.com", password="TestUser2026!", display_name="Test User")
    finally:
        db.close()
    print("\nDone.")
    print("  Judge demo -> judge@example.com / JudgeDemo2026!")
    print("  Test       -> test@example.com  / TestUser2026!")


if __name__ == "__main__":
    asyncio.run(main())
