"""Enable immediate email/password sign-up in Supabase Auth.

The app now uses `signUp({email, password})` and `signInWithPassword`. For a new
account to be signed in immediately, Supabase must have email confirmation
disabled. That is the "Confirm email" toggle under
Dashboard -> Authentication -> Providers -> Email.

Requires a Supabase personal access token (not the anon/service key):
    https://supabase.com/dashboard/account/tokens

Run from backend/:
    python -m scripts.configure_supabase_auth                 # show payload
    SUPABASE_ACCESS_TOKEN=sbp_... python -m scripts.configure_supabase_auth --apply

The dashboard toggle is equally valid if you prefer not to use a token.
"""

import json
import os
import sys
from urllib.parse import urlparse

import httpx


def project_ref() -> str:
    explicit = os.environ.get("SUPABASE_PROJECT_REF")
    if explicit:
        return explicit
    supabase_url = os.environ.get("SUPABASE_URL", "https://ndcmhjdssxnhjlovxyaj.supabase.co")
    host = urlparse(supabase_url).hostname or ""
    return host.split(".")[0]


def main(apply: bool) -> int:
    ref = project_ref()
    payload = {"mailer_autoconfirm": True}
    print(f"Project: {ref}")
    print("Payload:")
    print(json.dumps(payload, indent=2))
    print("\nThis disables the 'Confirm email' requirement so signUp returns a session.")

    if not apply:
        print("Dry run. Re-run with --apply and SUPABASE_ACCESS_TOKEN set.")
        return 0

    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        print(
            "\nSUPABASE_ACCESS_TOKEN is not set.\n"
            "Create one at https://supabase.com/dashboard/account/tokens, or use\n"
            "Dashboard -> Authentication -> Providers -> Email -> disable Confirm email.",
            file=sys.stderr,
        )
        return 1

    response = httpx.patch(
        f"https://api.supabase.com/v1/projects/{ref}/config/auth",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )
    if response.status_code >= 400:
        print(f"Update failed ({response.status_code}): {response.text}", file=sys.stderr)
        print(
            "Fallback: Dashboard -> Authentication -> Providers -> Email -> disable Confirm email.",
            file=sys.stderr,
        )
        return 1

    config = response.json()
    print("Updated. mailer_autoconfirm =", config.get("mailer_autoconfirm"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main("--apply" in sys.argv))
