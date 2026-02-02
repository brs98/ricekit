/**
 * Test URL-based theme import functionality
 * Test #125: URL-based theme import works from clipboard or drag-drop
 */

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Simple HTTP server to serve theme files
function createTestServer(port = 8888) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      console.log(`Request: ${req.url}`);

      if (req.url === '/test-theme.zip') {
        // Serve the exported theme file
        const themePath = path.join(__dirname, 'test-theme-export.zip');

        if (!fs.existsSync(themePath)) {
          res.writeHead(404);
          res.end('Theme file not found');
          return;
        }

        const stat = fs.statSync(themePath);
        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Length': stat.size
        });

        const readStream = fs.createReadStream(themePath);
        readStream.pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, () => {
      console.log(`Test server listening on http://localhost:${port}`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

async function runTest() {
  console.log('===========================================');
  console.log('Test #125: URL-based Theme Import');
  console.log('===========================================\n');

  let electronApp;
  let server;

  try {
    // Step 0: Export a theme first to use for testing
    console.log('Step 0: Exporting a theme to use for testing...');
    electronApp = await electron.launch({
      args: ['.'],
      cwd: process.cwd(),
      timeout: 30000
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Export tokyo-night theme via IPC directly
    console.log('Exporting tokyo-night theme...');
    const exportPath = path.join(__dirname, 'test-theme-export.zip');

    // Remove old export if exists
    if (fs.existsSync(exportPath)) {
      fs.unlinkSync(exportPath);
    }

    // Use evaluate to call the export API
    const exported = await window.evaluate(async ([themeName, exportPath]) => {
      try {
        const result = await window.electronAPI.exportTheme(themeName, exportPath);
        return { success: true, path: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, ['tokyo-night', exportPath]);

    if (!exported.success) {
      throw new Error(`Failed to export theme: ${exported.error}`);
    }

    console.log(`✅ Theme exported to: ${exported.path}\n`);

    // Close the app before starting test server
    await electronApp.close();
    electronApp = null;

    // Step 1: Start test HTTP server
    console.log('Step 1: Starting test HTTP server...');
    server = await createTestServer(8888);
    console.log('✅ Test server started\n');

    // Step 2: Launch app again for testing
    console.log('Step 2: Launching Ricekit application...');
    electronApp = await electron.launch({
      args: ['.'],
      cwd: process.cwd(),
      timeout: 30000
    });

    const testWindow = await electronApp.firstWindow();
    await testWindow.waitForLoadState('domcontentloaded');
    await testWindow.waitForTimeout(2000);
    console.log('✅ App launched\n');

    // Step 3: Navigate to Themes view (should already be there)
    console.log('Step 3: Verifying we are on Themes view...');
    const themesButton = await testWindow.$('button:has-text("🎨 Themes")');
    if (themesButton) {
      await themesButton.click();
      await testWindow.waitForTimeout(500);
    }
    console.log('✅ On Themes view\n');

    // Step 4: Click "Import from URL" button
    console.log('Step 4: Clicking "Import from URL" button...');
    const importUrlButton = await testWindow.$('button:has-text("Import from URL")');

    if (!importUrlButton) {
      throw new Error('Import from URL button not found!');
    }

    await importUrlButton.click();
    await testWindow.waitForTimeout(1000);
    console.log('✅ Import from URL button clicked\n');

    // Step 5: Verify modal appears
    console.log('Step 5: Verifying import modal appears...');
    const modal = await testWindow.$('.modal-overlay');
    if (!modal) {
      throw new Error('Import modal did not appear!');
    }
    console.log('✅ Import modal displayed\n');

    // Step 6: Enter URL in the input field
    console.log('Step 6: Entering test URL...');
    const urlInput = await testWindow.$('input[type="url"]');
    if (!urlInput) {
      throw new Error('URL input field not found!');
    }

    const testUrl = 'http://localhost:8888/test-theme.zip';
    await urlInput.fill(testUrl);
    await testWindow.waitForTimeout(500);
    console.log(`✅ URL entered: ${testUrl}\n`);

    // Step 7: Click Import button
    console.log('Step 7: Clicking Import button...');
    const importButton = await testWindow.$('button.primary-button:has-text("Import")');
    if (!importButton) {
      throw new Error('Import button not found!');
    }

    await importButton.click();
    console.log('Import button clicked, waiting for download and import...');

    // Wait for import to complete (should show alert)
    await testWindow.waitForTimeout(5000);
    console.log('✅ Import completed\n');

    // Step 8: Verify theme was imported
    console.log('Step 8: Verifying theme was imported...');

    // Check if theme exists in custom-themes directory
    const customThemesDir = path.join(
      process.env.HOME,
      'Library/Application Support/Ricekit/custom-themes'
    );

    const themes = fs.readdirSync(customThemesDir);
    console.log(`Found ${themes.length} custom themes:`);
    themes.forEach(theme => console.log(`  - ${theme}`));

    // Look for tokyo-night or tokyo-night-1, tokyo-night-2, etc.
    const importedTheme = themes.find(t => t.startsWith('tokyo-night'));

    if (!importedTheme) {
      throw new Error('Imported theme not found in custom-themes directory!');
    }

    console.log(`✅ Theme imported successfully: ${importedTheme}\n`);

    // Verify theme has required files
    const themePath = path.join(customThemesDir, importedTheme);
    const themeFiles = fs.readdirSync(themePath);
    console.log('Theme files:', themeFiles);

    if (!themeFiles.includes('theme.json')) {
      throw new Error('theme.json not found in imported theme!');
    }

    console.log('✅ Theme structure is valid\n');

    console.log('===========================================');
    console.log('TEST RESULT: ✅ PASSED');
    console.log('===========================================');
    console.log('All steps completed successfully!');
    console.log('URL-based theme import is working correctly.\n');

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    return false;
  } finally {
    if (electronApp) {
      await electronApp.close();
    }

    if (server) {
      server.close();
      console.log('Test server stopped');
    }
  }
}

runTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});
