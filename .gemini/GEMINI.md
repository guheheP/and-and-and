# GEMINI.md — Gemini (Antigravity) カスタム指示

## 🧠 AImemory（必須）

**作業開始時に必ず `C:\Tools\AImemory\index.md` を読んでください。**
関連するエントリがあれば `C:\Tools\AImemory\entries\` 内の該当ファイルも読んでください。
詳細な利用手順: `C:\Tools\AImemory\AI_INSTRUCTIONS.md`

## 開発ルール

**`docs/DEVELOPMENT_RULES.md` を必ず読み、記載されたルールに従ってください。**
このファイルにはコーディング規約・Git運用・テスト方針など、プロジェクト全体の開発ルールが記載されています。

## Gemini (Antigravity) 固有の指示

### 作業開始時

1. `C:\Tools\AImemory\index.md` を読む
2. `docs/DEVELOPMENT_RULES.md` を読む
3. プロジェクト構造を把握する（`list_dir` / `find_by_name` でディレクトリ構造を確認）
4. 既存コードのスタイル・パターンを理解する

### 実装時

- 大きな変更の前に実装計画を作成し、`notify_user` でユーザーの承認を得る
- ファイルの変更は最小限にする。不要なリファクタリングを行わない
- 新しい依存パッケージの追加前にユーザーに確認する
- `.agents/workflows/` にあるワークフローを活用する

### ワークフロー

プロジェクトの `.agents/workflows/` ディレクトリにワークフローが定義されています。
関連するワークフローがある場合は参照してください。

### エラー発生時

1. AImemory に類似のエラーが記録されていないか確認する
2. エラーの原因を特定し、対処法をユーザーに説明する
3. 解決に試行錯誤が必要だった場合、AImemory への記録を提案する

### 禁止事項

- 確認なしにファイルを削除しない
- `.env` ファイルの内容を表示・出力しない
- `main` ブランチに直接push しない
- テストを無断でスキップ・削除しない
