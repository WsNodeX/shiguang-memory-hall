# Contributing

Thanks for looking. This repository holds the backend proxy and the demo assets
for a Baidu DuMate application; the frontend itself is built on the platform and
is not in this tree.

## Reporting a problem

Open an issue and include:

- which route you called (`/restore` or `/chat`) and the request body shape
- the error text, including the Baidu error code if there is one (`17`, `18` and
  `216100` mean different things)
- whether the issue happens on the deployed demo or on your own CFC function

## Sending a change

1. Fork and branch.
2. Keep a change to one route per pull request — the two routes share a
   deployment unit but have nothing else in common.
3. Never commit a key. All credentials live in CFC environment variables
   (`BAIDU_API_KEY`, `BAIDU_SECRET_KEY`, `QIANFAN_API_KEY`); a pull request that
   hardcodes one will be rejected without discussion.

## What gets asked in review

- Does this change touch the key handling path, and if so how is the key kept out
  of the request body?
- Does the error path return something the caller can act on, or just a 500?
- Did you check the character limit on the Qianfan side before sending? Long oral
  histories hit it.

## Local check before opening a PR

```bash
node --check src/cfc-index-with-chat.js
node --check src/cfc-index.js
node --check src/server.js
```