/**
 * Test #118: Memory usage remains stable after multiple theme switches
 *
 * This test verifies that:
 * 1. Memory usage is tracked before and after 50 theme switches
 * 2. Memory increase is less than 50MB
 * 3. No memory leaks are detected
 * 4. Electron app remains responsive throughout
 *
 * Approach:
 * - Uses Playwright to control the Electron app
 * - Switches themes 50 times programmatically via IPC
 * - Measures memory using Electron's process.memoryUsage()
 * - Logs memory stats at key intervals
 * - Forces garbage collection between measurements (if available)
 */

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatMemoryInfo(info, label) {
  console.log(`\n${colors.cyan}${label}:${colors.reset}`);
  console.log(`  RSS (Resident Set Size):    ${formatBytes(info.rss)}`);
  console.log(`  Heap Total:                 ${formatBytes(info.heapTotal)}`);
  console.log(`  Heap Used:                  ${formatBytes(info.heapUsed)}`);
  console.log(`  External:                   ${formatBytes(info.external)}`);
  console.log(`  Array Buffers:              ${formatBytes(info.arrayBuffers || 0)}`);
}

async function getMemoryUsage(electronApp) {
  // Get memory usage from all processes
  const metrics = await electronApp.evaluate(async ({ app }) => {
    const mainMetrics = process.memoryUsage();

    // Try to trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }

    return {
      main: mainMetrics,
      timestamp: Date.now()
    };
  });

  return metrics;
}

async function getAllThemes(page) {
  const themes = await page.evaluate(async () => {
    // Call IPC to get all themes
    const allThemes = await window.electronAPI.getThemes();
    return allThemes.map(t => t.name);
  });
  return themes;
}

async function applyTheme(page, themeName) {
  await page.evaluate(async (name) => {
    await window.electronAPI.applyTheme(name);
  }, themeName);
}

async function runTest() {
  console.log(colors.bright + '='.repeat(70));
  console.log('Test #118: Memory Stability During Theme Switching');
  console.log('='.repeat(70) + colors.reset);
  console.log('');

  let electronApp;
  let window;

  try {
    // Launch Electron app with additional flags for memory testing
    console.log(`${colors.blue}Starting Electron application...${colors.reset}`);
    electronApp = await electron.launch({
      args: [
        path.join(__dirname, 'dist-electron/main.js'),
        '--expose-gc', // Enable manual garbage collection
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    console.log(`${colors.green}✓ Electron app launched${colors.reset}`);

    // Get the main window
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    console.log(`${colors.green}✓ Main window loaded${colors.reset}`);

    // Wait for app to be fully initialized
    await window.waitForTimeout(2000);

    // Get all available themes
    console.log(`\n${colors.blue}Getting available themes...${colors.reset}`);
    const allThemes = await getAllThemes(window);
    console.log(`${colors.green}✓ Found ${allThemes.length} themes${colors.reset}`);

    if (allThemes.length < 10) {
      throw new Error(`Not enough themes for testing (found ${allThemes.length}, need at least 10)`);
    }

    // Measure initial memory
    console.log(`\n${colors.blue}Measuring initial memory usage...${colors.reset}`);
    await window.waitForTimeout(1000); // Let things settle
    const initialMemory = await getMemoryUsage(electronApp);
    formatMemoryInfo(initialMemory.main, 'Initial Memory Usage');

    // Run theme switches
    const NUM_SWITCHES = 50;
    console.log(`\n${colors.bright}${colors.yellow}Performing ${NUM_SWITCHES} theme switches...${colors.reset}`);
    console.log(`This will take approximately ${Math.ceil(NUM_SWITCHES * 1.5 / 60)} minute(s)\n`);

    const memorySnapshots = [];
    const startTime = Date.now();

    for (let i = 0; i < NUM_SWITCHES; i++) {
      // Cycle through themes
      const themeIndex = i % allThemes.length;
      const themeName = allThemes[themeIndex];

      // Apply theme
      await applyTheme(window, themeName);

      // Wait for theme to be applied
      await window.waitForTimeout(300);

      // Take memory snapshot every 10 switches
      if ((i + 1) % 10 === 0) {
        const memory = await getMemoryUsage(electronApp);
        memorySnapshots.push({
          iteration: i + 1,
          memory: memory.main,
          timestamp: memory.timestamp
        });

        const heapUsedMB = (memory.main.heapUsed / 1024 / 1024).toFixed(2);
        const rssMB = (memory.main.rss / 1024 / 1024).toFixed(2);
        console.log(`  [${i + 1}/${NUM_SWITCHES}] Heap: ${heapUsedMB} MB | RSS: ${rssMB} MB | Theme: ${themeName}`);
      } else {
        // Show progress without memory snapshot
        if ((i + 1) % 5 === 0) {
          process.stdout.write(`  [${i + 1}/${NUM_SWITCHES}] Switching themes...\r`);
        }
      }
    }

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(1);

    console.log(`\n${colors.green}✓ Completed ${NUM_SWITCHES} theme switches in ${totalTime}s${colors.reset}`);

    // Final memory measurement
    console.log(`\n${colors.blue}Measuring final memory usage...${colors.reset}`);
    await window.waitForTimeout(2000); // Let things settle
    const finalMemory = await getMemoryUsage(electronApp);
    formatMemoryInfo(finalMemory.main, 'Final Memory Usage');

    // Calculate memory increase
    console.log(`\n${colors.bright}${colors.cyan}Memory Analysis:${colors.reset}`);
    const rssIncrease = (finalMemory.main.rss - initialMemory.main.rss) / 1024 / 1024;
    const heapIncrease = (finalMemory.main.heapUsed - initialMemory.main.heapUsed) / 1024 / 1024;
    const heapTotalIncrease = (finalMemory.main.heapTotal - initialMemory.main.heapTotal) / 1024 / 1024;

    console.log(`  RSS Increase:              ${rssIncrease >= 0 ? '+' : ''}${rssIncrease.toFixed(2)} MB`);
    console.log(`  Heap Used Increase:        ${heapIncrease >= 0 ? '+' : ''}${heapIncrease.toFixed(2)} MB`);
    console.log(`  Heap Total Increase:       ${heapTotalIncrease >= 0 ? '+' : ''}${heapTotalIncrease.toFixed(2)} MB`);

    // Memory snapshots over time
    console.log(`\n${colors.cyan}Memory Snapshots (every 10 switches):${colors.reset}`);
    memorySnapshots.forEach(snapshot => {
      const heapMB = (snapshot.memory.heapUsed / 1024 / 1024).toFixed(2);
      const rssMB = (snapshot.memory.rss / 1024 / 1024).toFixed(2);
      console.log(`  [${snapshot.iteration}] Heap: ${heapMB} MB | RSS: ${rssMB} MB`);
    });

    // Check for memory leak pattern
    console.log(`\n${colors.cyan}Memory Leak Analysis:${colors.reset}`);
    let leakDetected = false;

    if (memorySnapshots.length >= 3) {
      // Check if memory consistently increases
      let consistentIncreases = 0;
      for (let i = 1; i < memorySnapshots.length; i++) {
        const prev = memorySnapshots[i - 1].memory.heapUsed;
        const curr = memorySnapshots[i].memory.heapUsed;
        if (curr > prev * 1.05) { // 5% increase threshold
          consistentIncreases++;
        }
      }

      if (consistentIncreases >= memorySnapshots.length - 2) {
        leakDetected = true;
        console.log(`  ${colors.red}⚠ Potential memory leak detected${colors.reset}`);
        console.log(`  Memory consistently increased across ${consistentIncreases} snapshots`);
      } else {
        console.log(`  ${colors.green}✓ No consistent memory growth pattern${colors.reset}`);
      }
    }

    // Determine test result
    console.log(`\n${colors.bright}${'='.repeat(70)}`);
    console.log('TEST RESULTS');
    console.log('='.repeat(70) + colors.reset);

    const THRESHOLD_MB = 50;
    const rssPassed = rssIncrease < THRESHOLD_MB;
    const noLeak = !leakDetected;

    console.log(`\n${colors.cyan}Requirement Checks:${colors.reset}`);
    console.log(`  ${rssPassed ? colors.green + '✓' : colors.red + '✗'} Memory increase < ${THRESHOLD_MB}MB: ${rssIncrease.toFixed(2)} MB${colors.reset}`);
    console.log(`  ${noLeak ? colors.green + '✓' : colors.red + '✗'} No memory leaks detected${colors.reset}`);

    const testPassed = rssPassed && noLeak;

    if (testPassed) {
      console.log(`\n${colors.bright}${colors.green}✅ TEST PASSED${colors.reset}`);
      console.log(`Memory remains stable after ${NUM_SWITCHES} theme switches`);
    } else {
      console.log(`\n${colors.bright}${colors.red}❌ TEST FAILED${colors.reset}`);
      if (!rssPassed) {
        console.log(`Memory increase (${rssIncrease.toFixed(2)} MB) exceeds threshold (${THRESHOLD_MB} MB)`);
      }
      if (!noLeak) {
        console.log(`Memory leak pattern detected`);
      }
    }

    console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}\n`);

    // Write detailed results to file
    const resultsPath = path.join(__dirname, 'TEST_118_MEMORY_RESULTS.json');
    const results = {
      testName: 'Memory Stability - Test #118',
      timestamp: new Date().toISOString(),
      numSwitches: NUM_SWITCHES,
      numThemes: allThemes.length,
      durationSeconds: totalTime,
      initialMemory: initialMemory.main,
      finalMemory: finalMemory.main,
      memoryIncrease: {
        rss: rssIncrease,
        heapUsed: heapIncrease,
        heapTotal: heapTotalIncrease
      },
      snapshots: memorySnapshots,
      leakDetected,
      passed: testPassed,
      threshold: THRESHOLD_MB
    };

    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`${colors.blue}Detailed results saved to: ${resultsPath}${colors.reset}\n`);

    // Close the app
    await electronApp.close();

    process.exit(testPassed ? 0 : 1);

  } catch (error) {
    console.error(`\n${colors.red}Error during test:${colors.reset}`, error);
    if (electronApp) {
      await electronApp.close();
    }
    process.exit(1);
  }
}

// Run the test
runTest();
