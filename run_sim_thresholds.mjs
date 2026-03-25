// Mock localStorage
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

import { SimulatorCore } from './src/js/simulator-core.js';

const THRESHOLDS = [50, 75, 100, 125, 150];
const DURATION_SECONDS = 3600; // 1 hour
const TICK_MS = 1000;

console.log(`=== Prestige Efficiency Test (Early-Game: 1 Hour) ===`);

for (const thr of THRESHOLDS) {
    const sim = new SimulatorCore();
    
    sim.autoPrestige = true;
    sim.prestigeThreshold = thr;
    
    sim.run(DURATION_SECONDS, TICK_MS);
    
    const exactHours = sim.virtualTimeMs / 3600000;
    const perHr = exactHours > 0 ? (sim.totalCurrencyEarned / exactHours).toFixed(2) : "0.00";
    
    console.log(`Threshold Lv.${thr.toString().padEnd(3)} | Total Currency Earned: ${sim.totalCurrencyEarned.toString().padStart(6)} | Efficiency: ${perHr.padStart(7)} / hr`);
}
