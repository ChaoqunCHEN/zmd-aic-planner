# Learnings Path Location

Date: 2026-03-16

## What we confirmed

- The repository stores learnings under `docs/learnings/`.
- The tracked learning index for this repo is `docs/learnings/learning-index.md`.

## Practical implication

- When project instructions mention `/learnings` or `/learnings/learning-index.md`, resolve those references to `docs/learnings/` in this repository unless the repo structure is changed deliberately.
- Reading and writing learnings against the unprefixed `/learnings` path will fail in the current checkout.
