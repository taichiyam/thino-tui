# thino-tui

Terminal UI for [Obsidian Thino](https://github.com/Quorafind/Obsidian-Thino) plugin.

Built with **Bun + TypeScript + [OpenTUI](https://github.com/anomalyco/opentui) + [hascii-ui](https://github.com/shigurenimo/hascii-ui)**.

## Status

🚧 Work in progress. MVP scope:

- [x] Design spec ([`docs/superpowers/specs/2026-05-12-thino-tui-design.md`](docs/superpowers/specs/2026-05-12-thino-tui-design.md))
- [ ] Project scaffold
- [ ] Read daily-notes / Thino plugin config
- [ ] List recent memos
- [ ] Append new memo

## Concept

[`thn`](https://github.com/ignission/thn) is a minimal one-shot CLI for appending Thino memos. `thino-tui` aims to be a richer TUI counterpart: you can browse recent memos and add new ones interactively without leaving the terminal.

## References

- [Thino plugin](https://github.com/Quorafind/Obsidian-Thino)
- [`thn` CLI (Rust)](https://github.com/ignission/thn) — inspiration / data model reference
- [OpenTUI](https://github.com/anomalyco/opentui) — TUI runtime
- [hascii-ui](https://github.com/shigurenimo/hascii-ui) — OpenTUI component library

## License

Private repository, all rights reserved (for now).
