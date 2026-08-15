"""Deterministic keyword-rule fallback for category suggestion, used when the LLM is
disabled/unreachable, and as the first pass before ever calling the LLM (cheap + free)."""
import re

RULES: dict[str, list[str]] = {
    "Groceries": ["grocery", "market", "trader joe", "whole foods", "safeway", "kroger", "aldi"],
    "Dining Out": ["restaurant", "cafe", "coffee", "starbucks", "doordash", "grubhub", "uber eats", "pizza"],
    "Transportation": ["uber", "lyft", "gas station", "shell", "chevron", "exxon", "parking", "transit"],
    "Housing": ["rent", "mortgage", "hoa"],
    "Utilities": ["electric", "water bill", "gas bill", "internet", "comcast", "verizon", "at&t", "utility"],
    "Entertainment": ["netflix", "spotify", "hulu", "disney", "movie", "theatre", "steam", "playstation"],
    "Health": ["pharmacy", "cvs", "walgreens", "doctor", "clinic", "dental", "medical"],
    "Shopping": ["amazon", "target", "walmart", "best buy", "mall"],
    "Salary": ["payroll", "salary", "direct deposit"],
}


def suggest_category(description: str, available_category_names: list[str]) -> tuple[str | None, float]:
    text = description.lower()
    for category_name, keywords in RULES.items():
        if category_name not in available_category_names:
            continue
        for kw in keywords:
            if kw in text:
                return category_name, 0.7
    return None, 0.0
