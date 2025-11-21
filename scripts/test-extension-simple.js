#!/usr/bin/env node

/**
 * Simple Extension Test
 * Tests the extension popup as a standalone page
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXTENSION_PATH = path.join(__dirname, '../extension');
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/extension');
const PROCESSED_DIR = path.join(SCREENSHOTS_DIR, 'processed');
const MAX_WIDTH = 2000;

// Ensure directories exist
[SCREENSHOTS_DIR, PROCESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class SimpleExtensionTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshots = [];
    this.findings = [];
  }

  async init() {
    console.log('🚀 Testing Extension UI...\n');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: 400, height: 600 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
  }

  async takeScreenshot(name, description) {
    const filename = `${name}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    
    console.log(`📸 ${description}`);
    
    try {
      await this.page.screenshot({ 
        path: filepath,
        fullPage: true
      });
      
      this.screenshots.push({
        name,
        description,
        original: filepath,
        processed: null
      });
      
      return filepath;
    } catch (error) {
      console.error(`   ✗ Failed: ${error.message}`);
      return null;
    }
  }

  async testPopupUI() {
    console.log('📱 Testing popup UI...\n');
    
    const popupPath = `file://${path.join(EXTENSION_PATH, 'src/popup.html')}`;
    await this.page.goto(popupPath, { waitUntil: 'networkidle2' });
    await this.wait(500);
    
    await this.takeScreenshot('ext-01-popup-initial', 'Extension Popup - Initial State');
    
    // Load environment variables
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL || 'https://your-worker.workers.dev';
    const geminiKey = process.env.GEMINI_API_KEY || 'your-api-key-here';
    
    // Fill in fields
    await this.page.type('#worker-url', workerUrl);
    await this.page.type('#gemini-key', geminiKey);
    await this.wait(500);
    
    await this.takeScreenshot('ext-02-popup-filled', 'Extension Popup - With Credentials');
    
    // Test checkboxes
    await this.page.click('#use-phi2');
    await this.wait(300);
    
    await this.takeScreenshot('ext-03-popup-phi2', 'Extension Popup - Phi-2 Selected');
    
    // Analyze UI structure
    const analysis = await this.page.evaluate(() => {
      return {
        title: document.querySelector('h2')?.textContent,
        hasWorkerUrl: !!document.querySelector('#worker-url'),
        hasGeminiKey: !!document.querySelector('#gemini-key'),
        hasUseGemini: !!document.querySelector('#use-gemini'),
        hasUsePhi2: !!document.querySelector('#use-phi2'),
        hasSaveButton: !!document.querySelector('#save-settings'),
        hasGradeButton: !!document.querySelector('#grade-current'),
        buttonCount: document.querySelectorAll('button').length,
        inputCount: document.querySelectorAll('input').length
      };
    });
    
    console.log('\n✓ UI Analysis:');
    console.log(`   Title: ${analysis.title}`);
    console.log(`   Buttons: ${analysis.buttonCount}`);
    console.log(`   Inputs: ${analysis.inputCount}`);
    console.log(`   Worker URL field: ${analysis.hasWorkerUrl}`);
    console.log(`   Gemini key field: ${analysis.hasGeminiKey}`);
    console.log(`   Save button: ${analysis.hasSaveButton}`);
    console.log(`   Grade button: ${analysis.hasGradeButton}\n`);
    
    this.findings.push({
      type: 'success',
      message: `Popup UI complete: ${analysis.buttonCount} buttons, ${analysis.inputCount} inputs`
    });
  }

  async testManifest() {
    console.log('📋 Testing manifest...\n');
    
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    console.log(`   Name: ${manifest.name}`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Manifest Version: ${manifest.manifest_version}`);
    console.log(`   Permissions: ${manifest.permissions.join(', ')}`);
    
    this.findings.push({
      type: 'success',
      message: `Manifest valid: ${manifest.name} v${manifest.version}`
    });
    
    // Check icons
    const iconSizes = [16, 48, 128];
    for (const size of iconSizes) {
      const iconPath = path.join(EXTENSION_PATH, 'icons', `icon${size}.png`);
      if (fs.existsSync(iconPath)) {
        const stats = fs.statSync(iconPath);
        console.log(`   ✓ icon${size}.png: ${(stats.size / 1024).toFixed(1)}KB`);
      } else {
        console.log(`   ✗ icon${size}.png: MISSING`);
      }
    }
    console.log('');
  }

  async processScreenshot(filepath) {
    const filename = path.basename(filepath);
    const processedPath = path.join(PROCESSED_DIR, filename);
    
    try {
      execSync(`magick "${filepath}" -resize ${MAX_WIDTH}x\\> "${processedPath}"`, { 
        stdio: 'pipe' 
      });
      return processedPath;
    } catch (error) {
      return null;
    }
  }

  async processAll() {
    console.log('🔧 Processing screenshots...\n');
    
    for (const screenshot of this.screenshots) {
      if (!screenshot.original) continue;
      
      const processed = await this.processScreenshot(screenshot.original);
      screenshot.processed = processed;
      
      if (processed) {
        const originalSize = fs.statSync(screenshot.original).size;
        const processedSize = fs.statSync(processed).size;
        console.log(`   ✓ ${screenshot.name}: ${(originalSize / 1024).toFixed(1)}KB → ${(processedSize / 1024).toFixed(1)}KB`);
      }
    }
  }

  async generateReport() {
    console.log('\n📝 Generating report...\n');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extension UI Test - Classroom Auto-Grader</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { color: #1a73e8; margin-bottom: 20px; font-size: 36px; }
        .screenshots {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .screenshot {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .screenshot h3 { color: #333; margin-bottom: 15px; font-size: 18px; }
        .screenshot img {
            max-width: 100%;
            border: 2px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .findings {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .finding {
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            background: #e6f4ea;
            border-left: 4px solid #34a853;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧩 Extension UI Test</h1>
        
        <div class="findings">
            <h2>Test Results</h2>
            ${this.findings.map(f => `
                <div class="finding">✓ ${f.message}</div>
            `).join('')}
        </div>
        
        <div class="screenshots">
            ${this.screenshots.map((s, i) => `
                <div class="screenshot">
                    <h3>${i + 1}. ${s.description}</h3>
                    <img src="processed/${path.basename(s.processed || s.original)}" 
                         alt="${s.description}">
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
    
    const reportPath = path.join(SCREENSHOTS_DIR, 'report.html');
    fs.writeFileSync(reportPath, html);
    console.log(`✓ Report saved: ${reportPath}`);
    
    return reportPath;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.testManifest();
      await this.testPopupUI();
      await this.processAll();
      const reportPath = await this.generateReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ EXTENSION UI TEST COMPLETE');
      console.log('='.repeat(60));
      console.log(`\n📊 Report: file://${reportPath}`);
      console.log(`📸 Screenshots: ${this.screenshots.length}\n`);
      
      try {
        execSync(`open "${reportPath}"`);
      } catch (e) {}
      
    } catch (error) {
      console.error('\n❌ Error:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run
if (require.main === module) {
  const tester = new SimpleExtensionTester();
  tester.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SimpleExtensionTester;
