# thino-tui

Terminal UI for [Obsidian Thino](https://github.com/Quorafind/Obsidian-Thino) plugin.

Built with **Bun + TypeScript + [OpenTUI](https://github.com/anomalyco/opentui)**.

## Status

✅ MVP shipped on `feat/initial-scaffold` — list + append.

- [x] Design spec ([`docs/superpowers/specs/2026-05-12-thino-tui-design.md`](docs/superpowers/specs/2026-05-12-thino-tui-design.md))
- [x] Implementation plan ([`docs/superpowers/plans/2026-05-12-thino-tui-plan.md`](docs/superpowers/plans/2026-05-12-thino-tui-plan.md))
- [x] Project scaffold (Bun + OpenTUI)
- [x] `lib/` layer + unit tests (`bun test`)
- [x] HomeScreen (compose on top, recent memos below)
- [x] Multi-line memos (Thino-style header + indented continuation)
- [ ] Edit / delete / search (future iterations)

## Concept

[`thn`](https://github.com/ignission/thn) is a minimal one-shot CLI for appending Thino memos. `thino-tui` aims to be a richer TUI counterpart: you can browse recent memos and add new ones interactively without leaving the terminal.

## Usage

```bash
# via environment variable
OBSIDIAN_VAULT=/path/to/vault bun run src/index.tsx

# via flag
bun run src/index.tsx --vault /path/to/vault --days 7
```

### Flags

| Flag | Default | Description |
|---|---|---|
| `--vault PATH` | `$OBSIDIAN_VAULT` | Path to the Obsidian vault |
| `--days N` | `7` | How many past days to list |
| `--read-only` | off | Disable compose unconditionally |
| `--help` / `-h` | — | Show help |

### Keys

The compose textarea is focused on launch. Recent memos render below it (read-only).

| Key | Action |
|---|---|
| `Cmd+Enter` / `Ctrl+Enter` | Submit the memo |
| `Enter` | Insert newline (multi-line memo) |
| `Tab` | Toggle "append as task" |
| `Ctrl+R` | Reload memos |
| `Ctrl+Q` | Quit |

In read-only mode (Thino mode ≠ DAILY, or `--read-only` flag), the textarea is hidden and `r` / `q` work as plain keys.

> `Cmd+Enter` requires a terminal that reports the Cmd key as `super` via the Kitty keyboard protocol (Ghostty, WezTerm, iTerm2 with CSI u, etc.). `Ctrl+Enter` is the cross-terminal fallback.

## Architecture (MVP)

```
[OpenTUI / React renderer]      ← View
     ↓
src/screens/*.tsx              ← Container
     ↓
src/lib/memo-repository.ts     ← Application (list / append)
     ↓
src/lib/*-config.ts            ← Infrastructure (vault / thino / daily-notes)
     ↓
Vault filesystem               ← External
```

## Development

```bash
bun install
bun test           # 15 unit tests covering lib/
bun run typecheck  # tsc --noEmit
bun start          # alias for `bun run src/index.tsx`
```

## Limitations (current MVP)

- DAILY Thino mode only. Other modes (JOURNAL / MULTI / CANVAS / FILE) force read-only.
- Daily-notes filename format is hard-coded to `YYYY-MM-DD`.
- No file watching — memos refresh only on `r` keypress.
- No edit/delete/search.
- Time is fixed to JST (UTC+09:00).

## References

- [Thino plugin](https://github.com/Quorafind/Obsidian-Thino)
- [`thn` CLI (Rust)](https://github.com/ignission/thn) — inspiration / data model reference
- [OpenTUI](https://github.com/anomalyco/opentui) — TUI runtime

## License

Private repository, all rights reserved (for now).
