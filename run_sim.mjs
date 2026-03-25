import { SimulatorCore } from './src/js/simulator-core.js';

const sim = new SimulatorCore();
sim.autoPrestige = true;
const results = sim.run(86400 * 7, 1000); // 1週間(7日)分のシミュレーション

console.log("=== 1週間シミュレーション結果 ===");
// 最初の方のログを表示
results.logs.slice(0, 15).forEach(l => console.log(`[${l.timeStr}] Lv.${l.level} | ${l.msg}`));

console.log("...");

// 最後の方のログを表示
results.logs.slice(-5).forEach(l => console.log(`[${l.timeStr}] Lv.${l.level} | ${l.msg}`));

console.log("\n### 最終ステータス ###");
console.log(`レベル: ${results.state.level}`);
console.log(`総ポイント: ${results.state.totalEarnedPoints}`);
console.log(`プレステージ回数: ${results.state.prestigeCount}`);
const upg = results.state.prestigeUpgrades;
console.log(`取得強化: ${JSON.stringify(upg)}`);
