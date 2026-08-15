"""CSV parsing, column-guessing, dedupe hashing, and commit logic for bank CSV exports.

No bank APIs involved — this only ever processes a file the user uploaded from their own
bank's website.
"""
import csv
import hashlib
import io
import time
import uuid
from datetime import datetime

# In-memory holding area for previewed-but-not-yet-committed uploads.
# Keyed by an opaque upload_token so the browser doesn't have to re-upload the file
# between the preview and commit steps. Entries expire after 30 minutes.
_UPLOAD_CACHE: dict[str, tuple[float, list[dict], list[str]]] = {}
_TTL_SECONDS = 30 * 60

FIELD_GUESSES = {
    "date": ["date", "transaction date", "posted date", "posting date"],
    "amount": ["amount", "transaction amount", "debit", "credit"],
    "description": ["description", "payee", "merchant", "memo", "name"],
    "balance": ["balance", "running balance"],
}


def _cleanup_cache():
    now = time.time()
    expired = [k for k, (ts, _, _) in _UPLOAD_CACHE.items() if now - ts > _TTL_SECONDS]
    for k in expired:
        del _UPLOAD_CACHE[k]


def parse_csv_bytes(raw: bytes) -> tuple[list[str], list[dict]]:
    text = raw.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    columns = reader.fieldnames or []
    rows = [row for row in reader]
    return columns, rows


def guess_mapping(columns: list[str]) -> dict[str, str | None]:
    mapping: dict[str, str | None] = {}
    lowered = {c: c.lower().strip() for c in columns}
    for field, candidates in FIELD_GUESSES.items():
        match = None
        for col, low in lowered.items():
            if low in candidates:
                match = col
                break
        if not match:
            for col, low in lowered.items():
                if any(cand in low for cand in candidates):
                    match = col
                    break
        mapping[field] = match
    return mapping


def stash_upload(columns: list[str], rows: list[dict]) -> str:
    _cleanup_cache()
    token = str(uuid.uuid4())
    _UPLOAD_CACHE[token] = (time.time(), rows, columns)
    return token


def get_stashed_upload(token: str) -> tuple[list[dict], list[str]] | None:
    entry = _UPLOAD_CACHE.get(token)
    if not entry:
        return None
    _, rows, columns = entry
    return rows, columns


def external_hash(account_id: str, date_str: str, amount: str, description: str) -> str:
    raw = f"{account_id}|{date_str}|{amount}|{description.strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def parse_amount(raw: str, convention: str, row: dict, mapping: dict[str, str]) -> tuple[float, str]:
    """Returns (positive_amount, type) where type is income|expense."""
    raw = (raw or "0").replace("$", "").replace(",", "").strip()
    if convention == "separate_debit_credit":
        debit_col = mapping.get("debit")
        credit_col = mapping.get("credit")
        debit = row.get(debit_col, "") if debit_col else ""
        credit = row.get(credit_col, "") if credit_col else ""
        if credit and credit.strip():
            val = float(credit.replace("$", "").replace(",", "") or 0)
            return abs(val), "income"
        val = float((debit or raw).replace("$", "").replace(",", "") or 0)
        return abs(val), "expense"

    value = float(raw or 0)
    if convention == "always_positive_expense":
        return abs(value), "expense"
    # default: negative_is_expense
    return abs(value), "income" if value > 0 else "expense"


def parse_date(raw: str, fmt: str) -> datetime:
    return datetime.strptime(raw.strip(), fmt)
