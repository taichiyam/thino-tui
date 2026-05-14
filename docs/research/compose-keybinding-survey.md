# ComposeScreen キーバインド調査レポート

作成日: 2026-05-12  
対象: `src/screens/home-screen.tsx` の ComposeScreen（テキストエリア部分）  
調査目的: 日本語 IME 確定 Enter 問題を踏まえた改行 / submit / cancel キーバインドの最適解を決定する

---

## 1. 目的とスコープ

### なぜ調査するか

ComposeScreen（`src/screens/home-screen.tsx:14-17`）の `SUBMIT_KEY_BINDINGS` は `{name: "return", super: true}` と `{name: "return", ctrl: true}` を使用している。  
コミット `46c1c5a` で「`Ctrl+S` 想定」から「textarea が Enter を消費するので `Cmd/Ctrl+Enter`」へ変更されたが、**README のキー表が `Ctrl+S` のまま**で実装と齟齬がある。

さらに、**日本語 IME 使用時は変換確定で Enter が発行される**。Enter を submit に割り当てると「変換確定のつもりで投稿してしまう」事故が起きる。本調査はこの問題への先行事例を体系的にまとめ、推奨案を提示する。

### 何を決めたいか

- 改行 / submit / cancel のデフォルト割り当て
- OpenTUI の制約（isComposing 非対応）を踏まえた安全な実装方針
- README との齟齬修正の方向性（実装変更は別 issue で実施）

### スコープ外

- 実際のキーバインド変更実装（本 issue のスコープ外）
- 設定ファイルでのカスタマイズ機能（issue #6 と連動）
- README のキー表修正（実装変更と合わせて別 issue で）

---

## 2. 調査対象一覧

### TUI エディタ

| ツール | 改行 | Submit | Cancel | IME 確定 Enter | キーカスタマイズ | 一次情報 |
|---|---|---|---|---|---|---|
| **vim / neovim** | Enter（insert モード） | 非該当（:wq） | Esc → normal モード | 区別不可（terminal 層に委譲） | 可（.vimrc / init.lua） | [neovim docs](https://neovim.io/doc/user/insert/) |
| **helix** | Enter（insert モード） | 非該当（:wq） | Esc | 区別不可（terminal 層） | 可（config.toml [keys.insert]） | [helix keymap](https://docs.helix-editor.com/keymap.html) |
| **micro** | Enter | 非該当（Ctrl+S 保存） | Ctrl+Q / Esc | 区別不可（terminal 層） | 可（keybindings.json） | [micro keybindings](https://github.com/micro-editor/micro/blob/master/runtime/help/keybindings.md) |
| **nano** | Enter | 非該当（Ctrl+O / Ctrl+X） | Ctrl+C / Ctrl+X + N | 区別不可（terminal 層） | 部分的（~/.nanorc bind） | [nano cheatsheet](https://www.nano-editor.org/dist/latest/cheatsheet.html) |
| **kakoune** | Enter（insert モード） | 非該当（:wq） | Esc | 区別不可（terminal 層） | 可（kakrc map） | [kakoune keys](https://github.com/mawww/kakoune/blob/master/doc/pages/keys.asciidoc) |

### TUI チャット

| ツール | 改行 | Submit | Cancel | IME 確定 Enter | キーカスタマイズ | 一次情報 |
|---|---|---|---|---|---|---|
| **weechat** | Alt+Enter（/input insert \n） | Enter | なし（手動削除） | 区別不可 → Enter で誤送信リスク | 可（/key bind） | [weechat issue #1498](https://github.com/weechat/weechat/issues/1498) |
| **matterhorn** | M-e でマルチラインモードへ切替後 Enter | Enter | Esc / Ctrl+C | 区別不可 | 可（keybindings.ini） | [matterhorn keybindings](https://github.com/matterhorn-chat/matterhorn/blob/master/docs/keybindings.md) |
| **gomuks** | Alt+Enter（AltEnterToSend=true 設定時） | Enter | Esc | 区別不可。設定 `AltEnterToSend` で IME ユーザー向け対応あり | 部分的（config.yaml） | [gomuks commit 8e6f89a](https://github.com/gomuks/gomuks) |
| **profanity** | Alt+Enter | Enter | Ctrl+C | 区別不可（GNU Readline） | 可（~/.config/profanity/inputrc） | [profanity keybindings](https://profanity-im.github.io/guide/070/keybindings.html) |
| **senpai** | 不明（文書化なし） | Enter | 不明 | 不明 | 部分的（config ファイル） | [senpai](https://sr.ht/~delthas/senpai/) |
| **emacs (ERC)** | Enter = 改行（デフォルト） | C-c C-c（カスタム設定時） | C-g | Emacs 内蔵 IME（SKK 等）で回避 | 可（elisp define-key） | [ERC manual](https://www.gnu.org/software/emacs/manual/html_mono/erc.html) |

### TUI SNS / Notes

| ツール | 改行 | Submit | Cancel | IME 確定 Enter | キーカスタマイズ | 一次情報 |
|---|---|---|---|---|---|---|
| **tut**（Mastodon） | $EDITOR に委譲 | $EDITOR に委譲 | $EDITOR に委譲 | $EDITOR で処理（回避） | 可（TOML config） | [tut](https://github.com/RasmusLindroth/tut) |
| **jrnl** | Enter | **Ctrl+D（EOF）** | Ctrl+C | 問題なし（Enter=改行, Ctrl+D=submit） | 可（$EDITOR 設定） | [jrnl usage](https://jrnl.sh/en/stable/usage/) |
| **joplin-cli** | $EDITOR に委譲 | $EDITOR に委譲 | $EDITOR に委譲 | $EDITOR で処理（回避） | 可（/set editor） | [joplin terminal](https://joplinapp.org/help/apps/terminal/) |
| **rainbowstream** | 非該当（REPL スタイル） | Enter（REPL プロンプト） | Ctrl+C | REPL = Enter で誤送信リスク | 部分的（~/.inputrc） | [rainbowstream](https://github.com/orakaro/rainbowstream) |

### GUI 参考（isComposing 先行事例）

| ツール | 改行 | Submit | Cancel | IME 確定 Enter | キーカスタマイズ | 一次情報 |
|---|---|---|---|---|---|---|
| **Slack** | Shift+Enter | Enter（デフォルト）または Ctrl/Cmd+Enter（設定可） | Escape | **完全対応**：`event.isComposing` チェック + keyCode 229 で確定 Enter を submit しない | ユーザー設定（環境設定から切替） | [Slack Enter preference](https://slack.com/help/articles/115005523006) |
| **Discord** | Shift+Enter | Enter（固定） | Escape | **長年バグあり**：isComposing 対応は追加されたが不安定。設定変更不可 | なし | [Discord IME bug](https://support.discord.com/hc/en-us/community/posts/360061127872) |
| **Element**（Matrix） | Shift+Enter | Enter | Escape | isComposing チェックあり。確定後の 2 回目 Enter で送信 | なし（設定変更不可） | [element-web issue #5006](https://github.com/element-hq/element-web/issues/5006) |

---

## 3. 調査観点ごとの比較

### 改行キーのパターン分類

| パターン | 採用ツール | IME 安全性 |
|---|---|---|
| **Enter=改行, Ctrl/Cmd+Enter=submit** | Slack（Ctrl+Enter モード）、**thino-tui 現状** | ✅ 最良：IME 確定 Enter が改行になり誤送信なし |
| **Enter=send, Alt+Enter=改行** | weechat、profanity、gomuks（AltEnterToSend=true） | △ 部分的：IME 確定 Enter=Enter なので誤送信リスクあり |
| **Enter=send, Shift+Enter=改行** | Discord、Element、Slack（デフォルト）、Mattermost | ⚠️ 要 isComposing チェック：なければ IME 誤送信リスク |
| **Ctrl+D=submit, Enter=改行** | jrnl | ✅ 最良：Enter が常に改行、EOF のみ submit |
| **モーダル（Enter はコンテキスト依存）** | vim、helix、nano、micro | 非該当（editor パラダイム）|

### Submit キーのパターン

- **Ctrl+Enter / Cmd+Enter**（修飾 Enter）: thino-tui 現状。IME 安全。
- **Alt+Enter**: gomuks の AltEnterToSend=false 時。Alt は日本語環境で「英数」キーと重複する可能性。
- **Ctrl+D（EOF）**: jrnl。確実だが TUI では OpenTUI ランタイムへの影響が未検証。
- **専用コマンド（C-c C-c）**: ERC emacs。REPL/Emacs 固有。
- **Enter のみ**: Discord 固定。IME 危険。

### IME 変換確定 Enter の扱い

TUI アプリは原則として「区別できない」。端末のレイヤーで IME 変換確定時に発行される Enter と通常の Enter は同じエスケープシーケンスとして届く。

唯一の実用的回避策：
1. **修飾 Enter（Ctrl+Enter / Cmd+Enter）を submit に使い、bare Enter は絶対に submit に割り当てない** ← thino-tui 現状
2. **$EDITOR 委譲**（joplin、tut）
3. **Ctrl+D（EOF）を submit に使う**（jrnl）

---

## 4. OpenTUI の制約調査

### `useKeyboard` / textarea の IME 確定 Enter の扱い

**調査結果: OpenTUI は 2026-05-12 時点で IME composition event に対応していない。**

- `@opentui/core` の `KeyEvent` クラスには **`isComposing` プロパティが存在しない**
- GitHub issue [#942](https://github.com/anomalyco/opentui/issues/942)（2026-04-11 open）で CJK IME composition event サポートが要求されている（2026-05-12 時点 open）
- 既知の CJK バグ: Kitty 等の端末で日本語を入力して Enter で submit すると最後の確定文字が切れることがある（compose commit が完了する前に onSubmit が呼ばれる）

**`KeyEvent` の全プロパティ（ソース確認済み）:**

```typescript
type KeyEvent = {
  name: string         // "return", "a", "left", etc.
  ctrl: boolean
  meta: boolean
  shift: boolean
  option: boolean
  sequence: string
  number: boolean
  raw: string
  eventType: "press" | "release"
  source: "raw" | "kitty"
  super?: boolean      // Cmd (macOS) — requires Kitty keyboard protocol
  hyper?: boolean
  capsLock?: boolean
  numLock?: boolean
  baseCode?: number
  repeated?: boolean
  // isComposing: 存在しない ← IME 非対応
}
```

### thino-tui 現在の `SUBMIT_KEY_BINDINGS`

```typescript
const SUBMIT_KEY_BINDINGS = [
  { name: "return", super: true, action: "submit" as const },   // Cmd+Enter
  { name: "return", ctrl: true, action: "submit" as const },    // Ctrl+Enter
]
```

plain Enter（bare return）は `keyBindings` に含まれていないため、`textarea` の内部ハンドラが改行として処理する。これにより **bare Enter = 改行、Ctrl+Enter = submit** となり、IME 確定 Enter（= bare Enter）は誤送信しない。

### 回避策候補

| 回避策 | 実用性 | 備考 |
|---|---|---|
| **Ctrl/Cmd+Enter を submit に使う（現状）** | ✅ 実装済み | IME 安全。最良の現状解 |
| OpenTUI issue #942 対応を待つ | ⏳ 将来 | isComposing 対応後に Enter=submit も安全になる |
| `setTimeout(() => setTimeout(() => submit(), 0), 0)` | △ 脆弱 | Compose commit 前の文字切れ問題の回避策。Enter=submit の場合のみ必要 |
| $EDITOR 委譲 | ✅ 確実 | 長文メモ向けに将来検討余地あり |
| Alt+Enter = 改行 / Enter = submit | ⚠️ IME 危険 | CJK ユーザーには不適 |

---

## 5. 推奨案（3 案）

### 🥇 推奨案 1（**第一推奨**）: 現状維持 + README 修正

**改行**: Enter（bare）  
**submit**: Cmd+Enter (super+return) / Ctrl+Enter  
**cancel**: Ctrl+Q（既存） + Clear ボタン（既存）

**理由:**  
thino-tui の現在の実装は IME 安全設計として正しい。bare Enter = 改行、修飾 Enter = submit の分離は Slack の「Ctrl+Enter=send」モードと同じパターン（IME 安全のゴールドスタンダード）。  
OpenTUI に `isComposing` がなくても、bare Enter を submit に割り当てていない限り IME 誤送信は起きない。

**想定リスク:**  
Kitty keyboard protocol 非対応端末では `super`（Cmd+Enter）が動作しない。その場合は Ctrl+Enter のみ有効。これは既存の既知制約であり、README に記載すればよい。

**残アクション:**  
- README のキー表を `Ctrl+S` → `Cmd+Enter / Ctrl+Enter` に修正（別 issue で）

---

### 🥈 推奨案 2: Ctrl+Enter のみに統一（super+return を廃止）

**改行**: Enter（bare）  
**submit**: Ctrl+Enter のみ  
**cancel**: Ctrl+Q

**理由:**  
Ctrl+Enter は raw terminal エスケープシーケンスとして多くの端末でサポートされる。`super`（Cmd）は Kitty protocol 依存で端末互換性が低い。Ctrl+Enter のみにすることで「動くはずなのに動かない」ユーザー体験を減らせる。

**想定リスク:**  
macOS の Ghostty / WezTerm 等 Kitty protocol 対応端末ユーザーは Cmd+Enter の筋肉記憶が使えなくなる。Ctrl+Enter に統一することで Slack 等との操作感が若干変わる。

---

### 🥉 推奨案 3: Enter = submit、Alt+Enter = 改行（**非推奨 ※参考のみ**）

**改行**: Alt+Enter  
**submit**: Enter  
**cancel**: Ctrl+Q

**理由:**  
weechat / profanity / gomuks などの TUI チャットで採用されているパターン。Enter 1 回でサクサク送信できる。

**想定リスク（致命的）:**  
日本語 IME 変換確定 Enter = bare Enter = submit になる。**IME ユーザーには誤送信が多発する**。thino-tui の想定ユーザー（Obsidian を使う日本語話者が中心）には不適。OpenTUI に `isComposing` がない現状では実装不可。**採用しないことを強く推奨する。**

---

## 6. README との齟齬

現在の README（`README.md` キーバインド表）には以下の齟齬がある:

| 項目 | README 表記 | 実際の実装 | 参照箇所 |
|---|---|---|---|
| メモ投稿キー | `Ctrl+S` | `Cmd+Enter` / `Ctrl+Enter` | `src/screens/home-screen.tsx:14-17` |

コミット `46c1c5a` で実装が `Ctrl+S` から `Cmd/Ctrl+Enter` に変更されたが、README は更新されなかった。別 issue での修正を推奨する。

---

## 7. 参考リンク

### 一次情報（ツール別）

- neovim insert mode: https://neovim.io/doc/user/insert/
- helix keymap: https://docs.helix-editor.com/keymap.html
- micro keybindings: https://github.com/micro-editor/micro/blob/master/runtime/help/keybindings.md
- nano cheatsheet: https://www.nano-editor.org/dist/latest/cheatsheet.html
- kakoune keys: https://github.com/mawww/kakoune/blob/master/doc/pages/keys.asciidoc
- weechat multiline issue: https://github.com/weechat/weechat/issues/1498
- matterhorn keybindings: https://github.com/matterhorn-chat/matterhorn/blob/master/docs/keybindings.md
- gomuks (AltEnterToSend): https://github.com/gomuks/gomuks
- profanity keybindings: https://profanity-im.github.io/guide/070/keybindings.html
- senpai: https://sr.ht/~delthas/senpai/
- emacs ERC manual: https://www.gnu.org/software/emacs/manual/html_mono/erc.html
- tut (Mastodon TUI): https://github.com/RasmusLindroth/tut
- jrnl usage: https://jrnl.sh/en/stable/usage/
- joplin terminal: https://joplinapp.org/help/apps/terminal/
- rainbowstream: https://github.com/orakaro/rainbowstream

### GUI 参考

- Slack Enter preference: https://slack.com/help/articles/115005523006-Set-your-Enter-key-preference
- Discord IME bug report: https://support.discord.com/hc/en-us/community/posts/360061127872-Major-Japanese-IME-Bug
- Element-web Enter configuration request: https://github.com/element-hq/element-web/issues/5006

### OpenTUI

- OpenTUI GitHub: https://github.com/anomalyco/opentui
- OpenTUI keyboard API: https://www.mintlify.com/anomalyco/opentui/api/keyboard
- OpenTUI IME composition event request (issue #942): https://github.com/anomalyco/opentui/issues/942
- OpenTUI IME Enter truncation bug: https://github.com/anomalyco/opencode/issues/9563
