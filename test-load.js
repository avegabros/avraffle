// Load test script to simulate concurrent viewers on /raffle
// Run with: node test-load.js [viewers] [durationSeconds] [targetUrl]

const http = require('http');
const https = require('https');

const TARGET_URL = process.argv[4] || process.env.TARGET_URL || 'https://avraffle.abas.ph';
const VIEWERS_STEP = parseInt(process.argv[2], 10) || 50;
const DURATION_SEC = parseInt(process.argv[3], 10) || 15;

const isHttps = TARGET_URL.startsWith('https');
const clientModule = isHttps ? https : http;

const httpAgent = new clientModule.Agent({
  keepAlive: true,
  maxSockets: 1000,
  maxFreeSockets: 256,
});

const stats = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  latencies: [],
  statusCodes: {},
};

function makeRequest(path) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(path, TARGET_URL);
    const req = clientModule.request(
      url,
      {
        agent: httpAgent,
        headers: { 'User-Agent': 'LoadTester/1.0' },
        timeout: 5000,
      },
      (res) => {
        // Drain data
        res.on('data', () => {});
        res.on('end', () => {
          const latency = Date.now() - start;
          stats.totalRequests++;
          stats.latencies.push(latency);
          stats.statusCodes[res.statusCode] = (stats.statusCodes[res.statusCode] || 0) + 1;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            stats.successRequests++;
          } else {
            stats.failedRequests++;
          }
          resolve();
        });
      }
    );

    req.on('error', (err) => {
      stats.totalRequests++;
      stats.failedRequests++;
      stats.statusCodes[err.code || 'ERR'] = (stats.statusCodes[err.code || 'ERR'] || 0) + 1;
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      stats.totalRequests++;
      stats.failedRequests++;
      stats.statusCodes['TIMEOUT'] = (stats.statusCodes['TIMEOUT'] || 0) + 1;
      resolve();
    });

    req.end();
  });
}

// Simulates a single viewer:
// 1. Initial /api/wheel fetch
// 2. Polls /api/wheel/state and /api/settings every 1.2s
async function simulateViewer(id, stopTime) {
  // Initial load
  await makeRequest('/api/wheel?location=ALL&year=2026');

  // Polling loop: each viewer polls /api/wheel/state every 1.2s
  while (Date.now() < stopTime) {
    await makeRequest('/api/wheel/state');

    // Jitter poll interval slightly between 1.1s and 1.3s
    const sleep = 1100 + Math.random() * 200;
    await new Promise((r) => setTimeout(r, sleep));
  }
}

async function runStage(viewers, durationSec) {
  console.log(`\n======================================================`);
  console.log(`🚀 SIMULATING ${viewers} CONCURRENT VIEWERS FOR ${durationSec} SECONDS`);
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Expected Poll Rate: ~${Math.round((viewers * 2) / 1.2)} requests/second`);
  console.log(`======================================================`);

  stats.totalRequests = 0;
  stats.successRequests = 0;
  stats.failedRequests = 0;
  stats.latencies = [];
  stats.statusCodes = {};

  const startTime = Date.now();
  const stopTime = startTime + durationSec * 1000;

  // Stagger viewer joins slightly over 1 second to simulate real connection surge
  const viewerPromises = [];
  for (let i = 0; i < viewers; i++) {
    const delay = Math.random() * 1000;
    viewerPromises.push(
      new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
        simulateViewer(i, stopTime)
      )
    );
  }

  await Promise.all(viewerPromises);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const rps = (stats.totalRequests / totalTimeSec).toFixed(1);

  stats.latencies.sort((a, b) => a - b);
  const p50 = stats.latencies[Math.floor(stats.latencies.length * 0.5)] || 0;
  const p95 = stats.latencies[Math.floor(stats.latencies.length * 0.95)] || 0;
  const p99 = stats.latencies[Math.floor(stats.latencies.length * 0.99)] || 0;
  const avg = stats.latencies.length
    ? (stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length).toFixed(1)
    : 0;

  console.log(`\n--- RESULTS FOR ${viewers} VIEWERS ---`);
  console.log(`Total Requests:    ${stats.totalRequests}`);
  console.log(`Success (2xx):     ${stats.successRequests} (${((stats.successRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed / Errors:   ${stats.failedRequests}`);
  console.log(`Throughput:        ${rps} requests/sec`);
  console.log(`Latency (ms):      Avg: ${avg}ms | P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms`);
  console.log(`Status Codes:     `, JSON.stringify(stats.statusCodes));

  if (stats.failedRequests > 0 || p95 > 1000) {
    console.log(`⚠️  Warning: Server experienced slowdown or dropped requests at ${viewers} viewers.`);
  } else {
    console.log(`✅ Passed: Rock solid performance at ${viewers} viewers!`);
  }
}

async function main() {
  const steps = [50, 100, 200, 300];
  for (const step of steps) {
    await runStage(step, 10);
    // Cool down for 2 seconds
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log('\n🎉 ALL LOAD TESTING STAGES COMPLETE!\n');
}

main();
