// Mock localStorage
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

import { SimulatorCore } from './src/js/simulator-core.js';

const sim = new SimulatorCore();
sim.autoPrestige = true;
sim.prestigeThreshold = 50;

const results = sim.run(86400 * 7, 1000); // 1週間(7日)分

console.log("=== 1週間シミュレーション結果 ===\n");

// ログ表示
results.logs.slice(0, 20).forEach(l => console.log(`[${l.timeStr}] Lv.${l.level} | ${l.msg}`));
console.log("...");
results.logs.slice(-10).forEach(l => console.log(`[${l.timeStr}] Lv.${l.level} | ${l.msg}`));

console.log("\n### 最終ステータス ###");
console.log(`レベル: ${results.state.level}`);
console.log(`累計ポイント: ${results.state.totalEarnedPoints}`);
console.log(`累計EXP: ${results.state.totalEarnedExp}`);
console.log(`収穫回数: ${sim.harvestCount}`);
console.log(`プレステージ回数: ${results.state.prestigeCount}`);
console.log(`累計通貨: ${sim.totalCurrencyEarned}`);

const upg = results.state.prestigeUpgrades;
console.log(`取得強化: ${JSON.stringify(upg, null, 2)}`);

console.log("\n### 作物状況 ###");
sim.getCropSummary().forEach(c =>
    console.log(`  ${c.name} Lv.${c.level} ${c.infinite ? '∞' : `(種:${c.seeds})`}`)
);
