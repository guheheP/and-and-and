// Mock localStorage
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

import { SimulatorCore } from './src/js/simulator-core.js';

const THRESHOLDS = [50, 60, 75, 100, 125, 150];
const DURATION_SECONDS = 86400; // 1日
const TICK_MS = 1000;

console.log(`=== プレステージ効率テスト (1日間) ===\n`);
console.log(`${'Threshold'.padEnd(14)} | ${'Prestige'.padEnd(10)} | ${'Level'.padEnd(8)} | ${'Points'.padEnd(12)} | ${'EXP'.padEnd(12)} | ${'Currency'.padEnd(10)} | Efficiency`);
console.log('-'.repeat(100));

for (const thr of THRESHOLDS) {
    const sim = new SimulatorCore();
    sim.autoPrestige = true;
    sim.prestigeThreshold = thr;

    sim.run(DURATION_SECONDS, TICK_MS);

    const exactHours = sim.virtualTimeMs / 3600000;
    const perHr = exactHours > 0 ? (sim.totalCurrencyEarned / exactHours).toFixed(2) : '0.00';

    const formatNum = (n) => {
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toString();
    };

    console.log(
        `Lv.${thr.toString().padEnd(11)} | ` +
        `${sim.state.prestigeCount.toString().padEnd(10)} | ` +
        `${sim.state.level.toString().padEnd(8)} | ` +
        `${formatNum(sim.state.totalEarnedPoints).padEnd(12)} | ` +
        `${formatNum(sim.state.totalEarnedExp).padEnd(12)} | ` +
        `${sim.totalCurrencyEarned.toString().padEnd(10)} | ` +
        `${perHr.padStart(7)} / hr`
    );
}
