# Rewind

Time-travel debugger for web apps.

Record a user session. Replay it like a video. Pause at any moment and see the DOM, network, console and app state at that point. Let AI point at the root cause.

> Status: early development. Built in public, one task per day. See [the roadmap](docs/ROADMAP.md).

## Why

A user reports a bug. You cannot reproduce it. Logs say nothing useful.
Rewind gives you the exact session the user had, step by step.

## How it works

1. Add the recorder to your app. It records DOM changes, input, network and console.
2. The recording is compressed and sent to storage.
3. Open it in the player. Scrub the timeline. Inspect any moment.
4. Ask the AI panel what went wrong.

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Packages

| Package | What it does |
|---|---|
| `@rewind/shared` | Event types and session format |
| `@rewind/recorder` | Browser SDK that records sessions |
| `@rewind/player` | React player that replays sessions |

## Development

Setup instructions will appear here after Day 01.

## How this project is built

Tasks are planned as GitHub issues, one per day.
Code is written by AI agents in Cursor and reviewed before merge.
Each task is split into small parts. Each part runs in a fresh agent session, test-first, and is reviewed before the next one starts.
Rules for agents live in [AGENTS.md](AGENTS.md). Decisions are recorded in [docs/decisions](docs/decisions).

## License

MIT
