# AI開発テンプレートプロジェクト

AIコーディングアシスタント（Claude Code, Gemini/Antigravity, Cursor等）を使って効率的に開発するためのテンプレートプロジェクトです。

## 🚀 使い方

1. このテンプレートを新しいプロジェクトにコピーする
2. プロジェクト固有の設定（言語・フレームワーク等）を必要に応じて調整する
3. AIツールで開発を開始する（`/start` ワークフローが自動的にルールを読み込みます）

## 📁 ファイル構成

```
ProjectTemplate/
├── CLAUDE.md                       # Claude Code 用ルール
├── .gemini/
│   └── GEMINI.md                   # Gemini (Antigravity) 用ルール
├── .cursorrules                    # Cursor 用ルール
├── .agents/
│   └── workflows/
│       ├── start.md                # 作業開始ワークフロー
│       └── review.md              # コードレビューワークフロー
├── docs/
│   └── DEVELOPMENT_RULES.md       # 共通開発ルール（中核ドキュメント）
├── .gitignore                     # Git除外設定
├── .gitattributes                 # 改行コード制御
└── README.md                      # このファイル
```

## 📋 設計方針

### 共通ルールの一元管理

`docs/DEVELOPMENT_RULES.md` に全AIツール共通の開発ルールを集約しています。
各ツール固有の設定ファイル（`CLAUDE.md`, `GEMINI.md`, `.cursorrules`）からこのファイルを参照するため、ルール変更時は1箇所を修正するだけで全ツールに反映されます。

### AImemory 統合

全てのAIツール設定に `C:\Tools\AImemory\index.md` への参照を含めています。
これにより、過去のプロジェクトで蓄積されたバグ・失敗事例・ベストプラクティスを常に活用できます。

### ワークフロー

`.agents/workflows/` にAIツール共通のワークフローを定義しています：

| ワークフロー | コマンド | 内容 |
|---|---|---|
| 作業開始 | `/start` | AImemory確認 → ルール確認 → 要件把握 → 実装 |
| レビュー | `/review` | 差分確認 → 品質チェック → テスト確認 |

## ⚙️ カスタマイズ

### プロジェクト固有のルールを追加する場合

1. `docs/DEVELOPMENT_RULES.md` に共通ルールを追記
2. 特定のAIツールにのみ適用するルールは、該当するツール設定ファイルに追記

### ワークフローを追加する場合

`.agents/workflows/` に新しい `.md` ファイルを作成してください。
フロントマターに `description` を記載すると、AIツールがワークフローを自動認識します。

```yaml
---
description: ワークフローの説明
---
# ワークフロー名
## 手順
1. ステップ1
2. ステップ2
```

## 📝 AImemory パスの変更

AImemory のインストール先がデフォルト（`C:\Tools\AImemory`）と異なる場合は、以下のファイル内のパスを書き換えてください：

- `CLAUDE.md`
- `.gemini/GEMINI.md`
- `.cursorrules`
- `docs/DEVELOPMENT_RULES.md`
- `.agents/workflows/start.md`
