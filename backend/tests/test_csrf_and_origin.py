"""AbuseProtectionMiddleware's cross-site request forgery defenses: the Origin/Referer
check and the CSRF double-submit cookie check. Both must independently reject a forged
mutating request, since either one being enforceable without the other is the point of
defense-in-depth."""
from tests.conftest import API


def test_mutating_request_rejected_without_csrf_header(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    resp = client.post(
        f"{API}/accounts/{account_id}/buckets",
        json={"name": "No CSRF header"},
        # Deliberately omit the X-CSRF-Token header auth_headers would normally supply.
    )
    assert resp.status_code == 403
    assert "CSRF" in resp.json()["detail"]


def test_mutating_request_rejected_with_wrong_csrf_token(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    resp = client.post(
        f"{API}/accounts/{account_id}/buckets",
        json={"name": "Wrong CSRF token"},
        headers={**auth_headers, "X-CSRF-Token": "not-the-real-token"},
    )
    assert resp.status_code == 403
    assert "CSRF" in resp.json()["detail"]


def test_mutating_request_rejected_with_foreign_origin(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    resp = client.post(
        f"{API}/accounts/{account_id}/buckets",
        json={"name": "Cross-site origin"},
        headers={**auth_headers, "Origin": "https://evil.example.com"},
    )
    assert resp.status_code == 403
    assert "origin" in resp.json()["detail"].lower()


def test_mutating_request_rejected_with_foreign_referer_and_no_origin(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    # The client fixture sets a default Origin header; overriding it with "" here simulates
    # a client that sends no Origin at all (Starlette's Headers.get returns "" either way,
    # and the middleware treats a falsy Origin as absent before falling back to Referer).
    resp = client.post(
        f"{API}/accounts/{account_id}/buckets",
        json={"name": "Cross-site referer"},
        headers={**auth_headers, "Origin": "", "Referer": "https://evil.example.com/attack.html"},
    )
    assert resp.status_code == 403
    assert "origin" in resp.json()["detail"].lower()


def test_mutating_request_rejected_with_no_origin_or_referer(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    resp = client.post(
        f"{API}/accounts/{account_id}/buckets",
        json={"name": "No origin at all"},
        headers={**auth_headers, "Origin": ""},
    )
    assert resp.status_code == 403
    assert "origin" in resp.json()["detail"].lower()


def test_mutating_request_succeeds_with_valid_origin_and_csrf_token(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    resp = client.post(
        f"{API}/accounts/{account_id}/buckets",
        json={"name": "Legit request"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
