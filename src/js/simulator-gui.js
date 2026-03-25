// simulator-gui.js

import { SimulatorCore } from './simulator-core.js';
import { getUpgradeLevel } from './game-state.js';
import { PRESTIGE_UPGRADES } from './prestige-data.js';

const simulator = new SimulatorCore();
let levelChart = null;
let pointsChart = null;

function init() {
    document.getElementById('btn-run').addEventListener('click', () => {
        const duration = parseInt(document.getElementById('sim-duration').value, 10);
        simulator.autoPrestige = document.getElementById('auto-prestige').checked;
        simulator.prestigeThreshold = parseInt(document.getElementById('prestige-threshold').value, 10) || 50;
        
        document.getElementById('btn-run').disabled = true;
        document.getElementById('btn-run').textContent = "Running Simulation...";
        
        // Give UI a chance to update
        setTimeout(() => {
            const results = simulator.run(duration, 1000);
            updateUI(results);
            document.getElementById('btn-run').disabled = false;
            document.getElementById('btn-run').textContent = "Run Simulation Further";
        }, 50);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        simulator.reset();
        updateUI();
        document.getElementById('btn-run').textContent = "Run Simulation";
    });

    updateUI(); // Initial state
}

function updateUI(results = null) {
    const s = simulator.state;
    const hours = Math.floor(simulator.virtualTimeMs / 3600000);
    const minutes = Math.floor((simulator.virtualTimeMs % 3600000) / 60000);
    
    document.getElementById('val-time').textContent = `${hours}h ${minutes}m`;
    document.getElementById('val-level').textContent = s.level;
    document.getElementById('val-points').textContent = formatNumber(s.totalEarnedPoints);
    document.getElementById('val-prestige').textContent = s.prestigeCount;
    
    document.getElementById('val-currency').textContent = simulator.totalCurrencyEarned;
    const exactHours = simulator.virtualTimeMs / 3600000;
    const perHr = exactHours > 0 ? (simulator.totalCurrencyEarned / exactHours).toFixed(2) : "0.00";
    document.getElementById('val-currency-hr').textContent = `(${perHr} / hr)`;

    // Display Upgrades
    let upgradesText = '';
    if (s.prestigeUpgrades && Object.keys(s.prestigeUpgrades).length > 0) {
        for (const [id, lv] of Object.entries(s.prestigeUpgrades)) {
            const upg = PRESTIGE_UPGRADES[id];
            if (upg) upgradesText += `${upg.name} Lv.${lv}\n`;
        }
    } else {
        upgradesText = 'None';
    }
    document.getElementById('val-upgrades').textContent = upgradesText;

    if (results) {
        renderCharts(results.dataPoints);
        updateLogTable(results.logs);
    } else {
        renderCharts(simulator.dataPoints);
        document.getElementById('log-tbody').innerHTML = '';
    }
}

function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function renderCharts(dataPoints) {
    const ctxLevel = document.getElementById('levelChart').getContext('2d');
    const ctxPoints = document.getElementById('pointsChart').getContext('2d');

    if (levelChart) levelChart.destroy();
    if (pointsChart) pointsChart.destroy();

    if (dataPoints.time.length === 0) return;

    levelChart = new Chart(ctxLevel, {
        type: 'line',
        data: {
            labels: dataPoints.time.map(t => t.toFixed(1) + 'h'),
            datasets: [{
                label: 'Player Level',
                data: dataPoints.level,
                borderColor: '#4CAF50',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            maintainAspectRatio: false,
            animation: false
        }
    });

    pointsChart = new Chart(ctxPoints, {
        type: 'line',
        data: {
            labels: dataPoints.time.map(t => t.toFixed(1) + 'h'),
            datasets: [{
                label: 'Total Earned Points',
                data: dataPoints.points,
                borderColor: '#2196F3',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: { type: 'logarithmic' }
            }
        }
    });
}

function updateLogTable(logs) {
    const tbody = document.getElementById('log-tbody');
    tbody.innerHTML = '';

    // Show only the last 100 logs or so to not freeze the DOM
    const displayLogs = logs.slice(-100).reverse();

    for (const log of displayLogs) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.timeStr}</td>
            <td>Lv.${log.level}</td>
            <td>${log.msg || '-'}</td>
            <td>${formatNumber(log.points)}</td>
        `;
        tbody.appendChild(tr);
    }
}

document.addEventListener('DOMContentLoaded', init);
