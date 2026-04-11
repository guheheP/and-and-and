# 🌱 No のーえん No Life

放置系農園シミュレーションゲーム。畑に作物を植えて、育てて、収穫してポイントを稼ごう！

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 特徴

- **放置系ゲームプレイ** — 作物が自動で育ち、自動で収穫されます
- **3D ボクセルキャラクター** — Three.js によるかわいいボクセル風の農夫キャラクター
- **着せ替え＆カラーカスタマイズ** — 帽子・アクセサリの装着、ランダムカラー機能、5枠のプリセット保存
- **豊富な作物** — トマト、じゃがいも、ニンジン、イチゴ、トウモロコシ、カボチャなど12種類
- **イベントシステム** — ランダムに発生する天候・特殊イベント（雨、干ばつ、嵐、UFO など）
- **プレステージ** — リセットして永続強化を獲得、さらなるやりこみ要素
- **実績システム** — 条件達成で帽子やアクセサリをアンロック
- **デバッグ・シミュレーター** — バランス検証用のシミュレーター付き

## 🚀 セットアップ

### 必要環境

- [Node.js](https://nodejs.org/) v18 以上
- npm

### インストール

```bash
git clone https://github.com/guheheP/and-and-and.git
cd and-and-and
npm install
```

### 開発モードで起動

```bash
npm run dev
```

### プロダクションビルド

```bash
npm run build        # 自動検出
npm run build:win    # Windows向け
npm run build:mac    # macOS向け
```

ビルド成果物は `dist/` ディレクトリに出力されます。

## 📁 プロジェクト構成

```
├── main.js                    # Electron メインプロセス
├── preload.js                 # プリロードスクリプト
├── src/
│   ├── index.html             # メインUI
│   ├── simulator.html         # バランスシミュレーター
│   ├── css/
│   │   ├── main.css           # メインスタイル
│   │   ├── modal.css          # モーダルUI
│   │   ├── prestige.css       # プレステージUI
│   │   ├── ui.css             # カタログ・ガチャUI
│   │   └── weather.css        # 天候エフェクト
│   └── js/
│       ├── main.js            # アプリケーションエントリー
│       ├── game-state.js      # セーブ/ロード・状態管理
│       ├── game-loop.js       # ゲームループ・収穫ロジック
│       ├── master-data.js     # 作物・キャラクターマスターデータ
│       ├── event-data.js      # イベント定義
│       ├── event-system.js    # イベント発生ロジック
│       ├── gacha.js           # 種購入（ガチャ）
│       ├── prestige-data.js   # プレステージ設定・アップグレード
│       ├── progression.js     # レベルアップ処理
│       ├── achievement-system.js  # 実績判定
│       ├── renderer-3d.js     # Three.js メインレンダラー
│       ├── renderer-3d-models.js  # キャラクターモデル・カラー
│       ├── renderer-3d-crops.js   # 作物3Dモデル
│       ├── renderer-3d-events.js  # イベントビジュアル・時計
│       ├── renderer-common.js     # 共通ユーティリティ
│       ├── ui-controller.js   # UIイベントハンドラ
│       ├── ui-modals.js       # モーダル描画ロジック
│       └── debug.js           # デバッグモード
├── assets/                    # アイコン等のアセット
├── docs/                      # 開発ドキュメント
└── package.json
```

## 🎮 操作方法

| 操作 | 内容 |
|------|------|
| 画面タップ/クリック | 畑の作物を収穫 |
| ツールバーボタン | 各種メニューを開く |
| 🔍 ボタン | 画面サイズ切替（1x / 2x） |

## 🛠️ 技術スタック

- **Electron** — デスクトップアプリケーションフレームワーク
- **Three.js** — 3D レンダリング（CDN経由）
- **Vanilla JS** — フレームワークなしのピュア JavaScript
- **CSS** — カスタムプロパティによるテーマシステム

## 📄 ライセンス

[MIT License](LICENSE)
