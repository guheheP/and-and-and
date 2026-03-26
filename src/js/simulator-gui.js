// simulator-gui.js — シミュレータGUI

import { SimulatorCore } from './simulator-core.js';
import { getUpgradeLevel, getCropLevel } from './game-state.js';
import { PRESTIGE_UPGRADES } from './prestige-data.js';
import { CROP_MASTER } from './master-data.js';

const simulator = new SimulatorCore();
let levelChart = null;
let pointsChart = null;
let expChart = null;

function init() {
    document.getElementById('btn-run').addEventListener('click', () => {
        const duration = parseInt(document.getElementById('sim-duration').value, 10);
        simulator.autoPrestige = document.getElementById('auto-prestige').checked;
        simulator.prestigeThreshold = parseInt(document.getElementById('prestige-threshold').value, 10) || 50;

        document.getElementById('btn-run').disabled = true;
        document.getElementById('btn-run').textContent = 'シミュレーション中...';

        setTimeout(() => {
            const results = simulator.run(duration, 1000);
            updateUI(results);
            document.getElementById('btn-run').disabled = false;
            document.getElementById('btn-run').textContent = '続きを実行';
        }, 50);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        simulator.reset();
        updateUI();
        document.getElementById('btn-run').textContent = 'シミュレーション開始';
    });

    updateUI();
}

function updateUI(results = null) {
    const s = simulator.state;
    const hours = Math.floor(simulator.virtualTimeMs / 3600000);
    const minutes = Math.floor((simulator.virtualTimeMs % 3600000) / 60000);

    document.getElementById('val-time').textContent = `${hours}h ${minutes}m`;
    document.getElementById('val-level').textContent = s.level;
    document.getElementById('val-points').textContent = formatNumber(s.totalEarnedPoints);
    document.getElementById('val-exp').textContent = formatNumber(s.totalEarnedExp);
    document.getElementById('val-harvests').textContent = simulator.harvestCount.toLocaleString();
    document.getElementById('val-prestige').textContent = s.prestigeCount;

    document.getElementById('val-currency').textContent = simulator.totalCurrencyEarned;
    const exactHours = simulator.virtualTimeMs / 3600000;
    const perHr = exactHours > 0 ? (simulator.totalCurrencyEarned / exactHours).toFixed(2) : '0.00';
    document.getElementById('val-currency-hr').textContent = `(${perHr} / hr)`;

    // 強化一覧
    let upgradesText = '';
    if (s.prestigeUpgrades && Object.keys(s.prestigeUpgrades).length > 0) {
        for (const [id, lv] of Object.entries(s.prestigeUpgrades)) {
            const upg = PRESTIGE_UPGRADES[id];
            if (upg) upgradesText += `${upg.name} Lv.${lv}\n`;
        }
    } else {
        upgradesText = 'なし';
    }
    document.getElementById('val-upgrades').textContent = upgradesText;

    // 作物サマリー
    const cropSummary = simulator.getCropSummary();
    const cropEl = document.getElementById('val-crops');
    if (cropEl) {
        if (cropSummary.length > 0) {
            cropEl.textContent = cropSummary
                .map(c => `${c.name} Lv.${c.level} ${c.infinite ? '∞' : `(種:${c.seeds})`}`)
                .join('\n');
        } else {
            cropEl.textContent = 'トマトのみ';
        }
    }

    if (results) {
        renderCharts(results.dataPoints);
        updateLogTable(results.logs);
    } else {
        renderCharts(simulator.dataPoints);
        document.getElementById('log-tbody').innerHTML = '';
    }
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function renderCharts(dataPoints) {
    const ctxLevel = document.getElementById('levelChart').getContext('2d');
    const ctxPoints = document.getElementById('pointsChart').getContext('2d');
    const ctxExp = document.getElementById('expChart').getContext('2d');

    if (levelChart) levelChart.destroy();
    if (pointsChart) pointsChart.destroy();
    if (expChart) expChart.destroy();

    if (dataPoints.time.length === 0) return;

    const labels = dataPoints.time.map(t => t.toFixed(1) + 'h');

    levelChart = new Chart(ctxLevel, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'プレイヤーレベル',
                data: dataPoints.level,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.1,
                pointRadius: 0,
            }]
        },
        options: {
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: true } },
        }
    });

    pointsChart = new Chart(ctxPoints, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: '累計ポイント',
                data: dataPoints.points,
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                fill: true,
                tension: 0.1,
                pointRadius: 0,
            }]
        },
        options: {
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: true } },
            scales: { y: { type: 'logarithmic' } }
        }
    });

    expChart = new Chart(ctxExp, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: '累計EXP',
                data: dataPoints.exp,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true,
                tension: 0.1,
                pointRadius: 0,
            }]
        },
        options: {
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: true } },
            scales: { y: { type: 'logarithmic' } }
        }
    });
}

function updateLogTable(logs) {
    const tbody = document.getElementById('log-tbody');
    tbody.innerHTML = '';

    const displayLogs = logs.slice(-150).reverse();

    for (const log of displayLogs) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.timeStr}</td>
            <td>Lv.${log.level}</td>
            <td>${log.msg || '-'}</td>
            <td>${formatNumber(log.points)}</td>
            <td>${formatNumber(log.exp)}</td>
        `;
        tbody.appendChild(tr);
    }
}

document.addEventListener('DOMContentLoaded', init);
