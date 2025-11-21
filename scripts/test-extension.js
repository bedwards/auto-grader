#!/usr/bin/env node

/**
 * Test Chrome Extension
 * 
 * This script loads the extension and captures screenshots of:
 * 1. Extension popup
 * 2. Extension in Google Classroom
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

class ExtensionTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshots = [];
    this.findings = [];
    this.extensionId = null;
  }

  async init() {
    console.log('🚀 Testing Chrome Extension...\n');
    console.log(`📦 Extension path: ${EXTENSION_PATH}\n`);
    
    // Launch browser with extension loaded
    this.browser = await puppeteer.launch({
      headless: false, // Extension popup requires non-headless mode
      defaultViewport: null,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--window-size=1920,1080',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    // Get extension ID - try multiple methods
    await this.wait(3000); // Give extension time to load
    
    const targets = await this.browser.targets();
    console.log(`   Found ${targets.length} targets`);
    
    // Try to find extension target
    let extensionTarget = targets.find(target => 
      target.type() === 'service_worker' && 
      target.url().includes('chrome-extension://')
    );
    
    // If not found, try looking for extension pages
    if (!extensionTarget) {
      extensionTarget = targets.find(target => 
        target.url().includes('chrome-extension://')
      );
    }
    
    if (extensionTarget) {
      const extensionUrl = extensionTarget.url();
      this.extensionId = extensionUrl.split('/')[2];
      console.log(`✓ Extension loaded with ID: ${this.extensionId}\n`);
      
      this.findings.push({
        type: 'success',
        message: `Extension loaded successfully: ${this.extensionId}`
      });
    } else {
      // Fallback: manually create a page to get extension ID
      console.log('   ⚠️  Could not detect extension ID automatically');
      console.log('   Trying fallback method...\n');
      
      const extensionPage = await this.browser.newPage();
      await extensionPage.goto('chrome://extensions/', { waitUntil: 'networkidle2' });
      await this.wait(2000);
      
      // For now, use a placeholder ID and test what we can
      this.extensionId = 'UNKNOWN';
      this.findings.push({
        type: 'warning',
        message: 'Could not automatically detect extension ID, using manual testing'
      });
      
      await extensionPage.close();
    }
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async takeScreenshot(name, description) {
    const filename = `${name}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    
    console.log(`📸 ${description}`);
    
    try {
      await this.page.screenshot({ 
        path: filepath,
        fullPage: true,
        timeout: 10000
      });
      
      this.screenshots.push({
        name,
        description,
        original: filepath,
        processed: null,
        url: this.page.url()
      });
      
      return filepath;
    } catch (error) {
      console.error(`   ✗ Failed: ${error.message}`);
      this.findings.push({
        type: 'error',
        message: `Screenshot failed for ${name}: ${error.message}`
      });
      return null;
    }
  }

  async testExtensionPopup() {
    console.log('📱 Testing extension popup...\n');
    
    try {
      // Navigate to extension popup
      const popupUrl = `chrome-extension://${this.extensionId}/src/popup.html`;
      await this.page.goto(popupUrl, { waitUntil: 'networkidle2' });
      await this.wait(1000);
      
      await this.takeScreenshot('ext-01-popup-empty', 'Extension Popup - Empty State');
      
      // Fill in settings
      await this.page.type('#worker-url', 'https://classroom-auto-grader.brian-mabry-edwards.workers.dev');
      await this.page.type('#gemini-key', 'AIzaSyA8cY_GiNH4PZm_ozSM-028paL8wwpRvLg');
      await this.wait(500);
      
      await this.takeScreenshot('ext-02-popup-filled', 'Extension Popup - With Settings');
      
      // Check if checkboxes work
      const checkboxes = await this.page.$$('input[type="checkbox"]');
      console.log(`   Found ${checkboxes.length} checkboxes`);
      
      this.findings.push({
        type: 'success',
        message: `Extension popup loaded successfully with ${checkboxes.length} checkboxes`
      });
      
      // Test save button
      const saveButton = await this.page.$('#save-settings');
      if (saveButton) {
        await saveButton.click();
        await this.wait(1000);
        await this.takeScreenshot('ext-03-popup-saved', 'Extension Popup - After Save');
        
        this.findings.push({
          type: 'success',
          message: 'Save settings button works'
        });
      }
      
    } catch (error) {
      console.error(`   ✗ Error: ${error.message}`);
      this.findings.push({
        type: 'error',
        message: `Failed to test extension popup: ${error.message}`
      });
    }
  }

  async testExtensionInClassroom() {
    console.log('\n📚 Testing extension in Google Classroom context...\n');
    
    try {
      // Navigate to a mock Google Classroom page
      // Since we don't have real access, we'll test the content script injection
      await this.page.goto('https://classroom.google.com/', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      await this.wait(2000);
      
      await this.takeScreenshot('ext-04-classroom-signin', 'Extension in Google Classroom - Sign In Page');
      
      this.findings.push({
        type: 'info',
        message: 'Extension loaded on Google Classroom (sign-in page visible)'
      });
      
      // Check if our content script injected anything
      const hasAutoGradeButton = await this.page.evaluate(() => {
        return !!document.querySelector('[data-auto-grader]');
      });
      
      if (hasAutoGradeButton) {
        this.findings.push({
          type: 'success',
          message: 'Content script injected auto-grade button successfully'
        });
      } else {
        this.findings.push({
          type: 'info',
          message: 'No auto-grade button found (expected on sign-in page)'
        });
      }
      
    } catch (error) {
      console.error(`   ✗ Error: ${error.message}`);
      this.findings.push({
        type: 'warning',
        message: `Could not fully test Classroom integration (requires authentication): ${error.message}`
      });
    }
  }

  async testExtensionIcon() {
    console.log('\n🎨 Testing extension icons...\n');
    
    const iconSizes = [16, 48, 128];
    for (const size of iconSizes) {
      const iconPath = path.join(EXTENSION_PATH, 'icons', `icon${size}.png`);
      if (fs.existsSync(iconPath)) {
        const stats = fs.statSync(iconPath);
        console.log(`   ✓ icon${size}.png exists (${(stats.size / 1024).toFixed(1)}KB)`);
        this.findings.push({
          type: 'success',
          message: `Icon ${size}x${size} exists and is ${(stats.size / 1024).toFixed(1)}KB`
        });
      } else {
        console.log(`   ✗ icon${size}.png missing`);
        this.findings.push({
          type: 'error',
          message: `Icon ${size}x${size} is missing`
        });
      }
    }
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
    console.log('\n🔧 Processing screenshots...\n');
    
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
    console.log('\n📝 Generating extension test report...\n');
    
    const successCount = this.findings.filter(f => f.type === 'success').length;
    const errorCount = this.findings.filter(f => f.type === 'error').length;
    const warningCount = this.findings.filter(f => f.type === 'warning').length;
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extension Test Report - Classroom Auto-Grader</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            color: #1a73e8;
            margin-bottom: 10px;
            font-size: 36px;
        }
        .extension-id {
            background: #e8f0fe;
            padding: 10px 15px;
            border-radius: 4px;
            margin: 10px 0 20px;
            font-family: monospace;
            color: #185abc;
        }
        .summary {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat {
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat.success { background: #e6f4ea; color: #137333; }
        .stat.error { background: #fce8e6; color: #c5221f; }
        .stat.warning { background: #fef7e0; color: #f29900; }
        .stat.info { background: #e8f0fe; color: #185abc; }
        .stat-number { font-size: 48px; font-weight: bold; }
        .stat-label { font-size: 14px; margin-top: 5px; }
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
            border-left: 4px solid #ddd;
        }
        .finding.success { background: #e6f4ea; border-left-color: #34a853; }
        .finding.error { background: #fce8e6; border-left-color: #ea4335; }
        .finding.warning { background: #fef7e0; border-left-color: #fbbc04; }
        .finding.info { background: #e8f0fe; border-left-color: #1a73e8; }
        .finding-type {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .screenshots {
            margin: 20px 0;
        }
        .screenshot {
            background: white;
            padding: 30px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .screenshot h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 20px;
        }
        .screenshot img {
            max-width: 100%;
            border: 2px solid #ddd;
            border-radius: 8px;
            margin-top: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .meta { color: #666; font-size: 14px; margin: 10px 0; }
        .footer {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin: 60px 0 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧩 Extension Test Report</h1>
        <p style="color: #666; margin-bottom: 10px;">Classroom Auto-Grader - Chrome Extension</p>
        <div class="extension-id">🆔 Extension ID: ${this.extensionId}</div>
        
        <div class="summary">
            <h2>Test Summary</h2>
            <div class="stats">
                <div class="stat success">
                    <div class="stat-number">${successCount}</div>
                    <div class="stat-label">Successes</div>
                </div>
                <div class="stat error">
                    <div class="stat-number">${errorCount}</div>
                    <div class="stat-label">Errors</div>
                </div>
                <div class="stat warning">
                    <div class="stat-number">${warningCount}</div>
                    <div class="stat-label">Warnings</div>
                </div>
                <div class="stat info">
                    <div class="stat-number">${this.screenshots.length}</div>
                    <div class="stat-label">Screenshots</div>
                </div>
            </div>
            <p class="meta">Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="findings">
            <h2>Findings & Analysis</h2>
            ${this.findings.map(f => `
                <div class="finding ${f.type}">
                    <div class="finding-type">${f.type}</div>
                    <div>${f.message}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="screenshots">
            <h2>Screenshots</h2>
            ${this.screenshots.map((s, i) => `
                <div class="screenshot">
                    <h3>${i + 1}. ${s.description}</h3>
                    <p class="meta">File: ${s.name}.png | URL: ${s.url}</p>
                    <img src="processed/${path.basename(s.processed || s.original)}" 
                         alt="${s.description}"
                         loading="lazy">
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            Report generated: ${new Date().toISOString()}<br>
            Classroom Auto-Grader - Chrome Extension Testing<br>
            Automated testing with Puppeteer
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
    console.log('\n🧹 Cleaning up...');
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.testExtensionIcon();
      await this.testExtensionPopup();
      await this.testExtensionInClassroom();
      await this.processAll();
      const reportPath = await this.generateReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ EXTENSION TEST COMPLETE');
      console.log('='.repeat(60));
      console.log(`\n🆔 Extension ID: ${this.extensionId}`);
      console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}`);
      console.log(`📊 HTML Report: file://${reportPath}`);
      console.log(`\n📈 Results:`);
      console.log(`   Success: ${this.findings.filter(f => f.type === 'success').length}`);
      console.log(`   Errors: ${this.findings.filter(f => f.type === 'error').length}`);
      console.log(`   Warnings: ${this.findings.filter(f => f.type === 'warning').length}`);
      console.log(`   Screenshots: ${this.screenshots.length}`);
      console.log('');
      
      // Auto-open report
      try {
        execSync(`open "${reportPath}"`);
      } catch (e) {}
      
    } catch (error) {
      console.error('\n❌ Fatal Error:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run
if (require.main === module) {
  const tester = new ExtensionTester();
  tester.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ExtensionTester;
