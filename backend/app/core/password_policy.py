"""Password policy: length is the only rule enforced (see MIN_PASSWORD_LENGTH) — no
arbitrary complexity requirements (symbol/uppercase/digit mandates measurably don't stop
credential attacks and just push users toward predictable substitutions like "Password1!").

Checked against a bundled list of the 10,000 most common/breached passwords (SecLists'
10k-most-common.txt, a well-known public security resource) rather than an external API
like haveibeenpwned — this app is self-hosted with a "data never leaves this machine"
default elsewhere (see LLM_PROVIDER=local in config.py), and calling a third-party service
on every signup/password-change would both cut against that and add a hard network
dependency to the account-creation critical path. Swap in the full HIBP k-anonymity range
API here later if online breach-list freshness matters more than that tradeoff.
"""
from pathlib import Path

MIN_PASSWORD_LENGTH = 8

_DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "common_passwords.txt"


def _load_common_passwords() -> frozenset[str]:
    try:
        with open(_DATA_FILE, encoding="utf-8") as f:
            return frozenset(line.strip().lower() for line in f if line.strip())
    except FileNotFoundError:
        return frozenset()


COMMON_PASSWORDS = _load_common_passwords()


def is_commonly_breached(password: str) -> bool:
    return password.strip().lower() in COMMON_PASSWORDS
