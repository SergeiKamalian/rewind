# Roadmap

One task per day. Each task is a GitHub issue labeled `day-XX`.
Each week is a GitHub milestone.

## Week 1. Recorder core (Oct 1 - Oct 7)

Goal: record a real session from the demo app and save it as a file.

| Day | Task |
|---|---|
| 01 | Monorepo setup: pnpm, TypeScript, Biome, Vitest, CI |
| 02 | Session format and event types in `@rewind/shared` |
| 03 | Full DOM snapshot with stable node ids and masking |
| 04 | Incremental DOM mutations |
| 05 | Input events: mouse, click, scroll, input, resize |
| 06 | Network and console capture |
| 07 | Buffer, compression, transports, demo app records to a file |

## Week 2. Player (Oct 8 - Oct 14)

Goal: open a recording and watch it like a video.

- Rebuild DOM from a snapshot in a sandboxed iframe
- Apply mutations and input in order
- Play, pause, speed, timeline
- Keyframes and fast seek
- Mouse cursor and click ripples overlay
- Console and network panels synced with the timeline
- Timeline markers for errors and failed requests

## Week 3. Storage and scale (Oct 15 - Oct 21)

Goal: sessions upload to a server and big sessions stay fast.

- HTTP ingest server (Hono), storage in SQLite plus files
- Session list and session page
- Compression in a Web Worker
- Benchmarks: overhead on the host app, size per minute, seek time
- Playwright end-to-end tests: record in demo app, replay in player

## Week 4. AI root cause (Oct 22 - Oct 28)

Goal: the player tells you why the bug happened.

- State adapters: Redux and Zustand
- Session summarizer: turn events into a compact timeline for an LLM
- Root cause analysis with links to exact moments in the replay
- Suggested fix panel
- Eval set: 10 recorded bugs with known causes, measure accuracy

## Week 5. Launch (Oct 29 - Nov 4)

Goal: anyone can try it in 10 seconds.

- Landing page with live demo: break the demo app, then watch your own replay
- Docs site
- Publish packages to npm
- README with GIFs, benchmarks and architecture
- Launch post
