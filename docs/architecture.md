# Architecture (MVP)

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

## レイヤーの役割

- **View (OpenTUI / React renderer)**: 端末上の描画。React のコンポーネントツリーを OpenTUI が ANSI で描画する。
- **Container (`src/screens/*.tsx`)**: 各画面の状態管理と入力ハンドリング。現状は `HomeScreen` のみ。
- **Application (`src/lib/memo-repository.ts`)**: メモの一覧取得と追記のユースケース層。Vault ファイルシステムの詳細を上位から隠蔽する。
- **Infrastructure (`src/lib/*-config.ts`)**: Vault のパス解決 / Thino の動作モード読み取り / Daily Notes のファイル名形式といった、Obsidian 周辺の設定値ハンドリング。
- **External (Vault filesystem)**: ユーザーの Vault そのもの。デイリーノート Markdown を直接読み書きする。

## Thino のデータ形式（外部）

Thino プラグインのメモは、デイリーノートの Markdown に以下の形式で追記される:

```
- HH:MM メモ本文
    複数行の場合はインデントで継続
- HH:MM 別のメモ
```

SQLite 等のデータストアは介さず、ファイルシステムへの直接 I/O だけで動作する。これにより、Obsidian アプリ・Thino プラグイン・thino-tui の三者がどれも同じ Markdown を読み書きしている状態になる。
