# Security Policy

## Supported versions

Only the current `main` receives fixes.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private reporting:
**Security** tab → **Report a vulnerability**.

## What this project handles

The backend proxy holds three credentials as CFC environment variables:

- `BAIDU_API_KEY` / `BAIDU_SECRET_KEY` — image restoration
- `QIANFAN_API_KEY` — the interview and script-writing model

They are read from `process.env` and never returned to the frontend. If you find
a path where a key reaches the response body, the logs, or an error message, that
is the vulnerability this policy most wants to hear about.

## Known scope notes

- `config.json` is gitignored on purpose. A force-added copy would leak keys.
- The proxy accepts POST from any origin, because the DuMate frontend is hosted
  on a domain this repository does not control. That is a deliberate trade-off,
  not an oversight — rate limiting is expected to live at the platform level.
- No authentication on `/restore` or `/chat`. Abuse protection is out of scope
  for this tree; deploy behind your own gateway if you need it.