#!/usr/bin/env node

/**
 * Screenshot Testing Framework for Classroom Auto-Grader
 * 
 * Takes screenshots of:
 * - Web app (all tabs)
 * - Chrome extension popup
 * - Google Classroom integration
 * 
 * Then processes and analyzes them
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
const PROCESSED_DIR = path.join(SCREENSHOTS_DIR, 'processed');
const MAX_WIDTH = 2000;

// Ensure directories exist
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}
if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

class ScreenshotTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshots = [];
  }

  async init() {
    console.log('🚀 Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--window-size=1920,1080',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });
    
    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();
  }

  async takeScreenshot(name, description) {
    const filename = `${name}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    
    console.log(`📸 Taking screenshot: ${description}`);
    await this.page.screenshot({ path: filepath, fullPage: true });
    
    this.screenshots.push({
      name,
      description,
      original: filepath,
      processed: null
    });
    
    return filepath;
  }

  async processScreenshot(filepath) {
    const filename = path.basename(filepath);
    const processedPath = path.join(PROCESSED_DIR, filename);
    
    console.log(`🔧 Processing: ${filename}`);
    
    // Resize to max 2000px width using ImageMagick
    try {
      await execPromise(`magick "${filepath}" -resize ${MAX_WIDTH}x\\> "${processedPath}"`);
      console.log(`   ✓ Resized to max ${MAX_WIDTH}px width`);
      return processedPath;
    } catch (error) {
      console.error(`   ✗ Error processing: ${error.message}`);
      return null;
    }
  }

  async testWebApp() {
    console.log('\n📱 Testing Web App...\n');
    
    // Navigate to local dev server
    const url = 'http://localhost:3000';
    console.log(`Navigating to: ${url}`);
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
    } catch (error) {
      console.error('⚠️  Could not load web app. Is dev server running? (npm run dev)');
      console.error('   Skipping web app tests...\n');
      return;
    }

    // Wait for page to load
    await this.page.waitForSelector('#app', { timeout: 5000 });
    await this.wait(1000);

    // Homepage (not authenticated)
    await this.takeScreenshot('01-homepage', 'Homepage - Not Authenticated');

    // Check if we can access settings (would need auth in real scenario)
    const tabs = ['dashboard', 'courses', 'assignments', 'rubrics', 'grading', 'settings'];
    
    for (const tab of tabs) {
      try {
        // Try to click tab button if it exists
        const tabSelector = `[data-tab="${tab}"]`;
        const tabExists = await this.page.$(tabSelector);
        
        if (tabExists) {
          await this.page.click(tabSelector);
          await this.wait(500);
          await this.takeScreenshot(`02-${tab}-tab`, `${tab.charAt(0).toUpperCase() + tab.slice(1)} Tab`);
        }
      } catch (error) {
        console.log(`   ⓘ Could not access ${tab} tab (may require auth)`);
      }
    }

    // Settings page specifically
    try {
      await this.takeScreenshot('03-settings-form', 'Settings Form Detail');
    } catch (error) {
      console.log('   ⓘ Could not capture settings detail');
    }
  }

  async testChromeExtension() {
    console.log('\n🧩 Testing Chrome Extension...\n');
    
    // Extension popup is harder to screenshot with Puppeteer
    // We'll capture the extension popup HTML if we can
    
    try {
      // Get extension ID
      const targets = await this.browser.targets();
      const extensionTarget = targets.find(target => 
        target.type() === 'background_page' || 
        target.url().includes('chrome-extension://')
      );
      
      if (extensionTarget) {
        console.log('✓ Extension loaded');
        console.log(`  Extension URL: ${extensionTarget.url()}`);
        
        // Try to navigate to extension popup
        const extensionId = extensionTarget.url().match(/chrome-extension:\/\/([^\/]+)/)?.[1];
        if (extensionId) {
          const popupUrl = `chrome-extension://${extensionId}/src/popup.html`;
          await this.page.goto(popupUrl, { waitUntil: 'networkidle2' });
          await this.wait(500);
          await this.takeScreenshot('04-extension-popup', 'Chrome Extension Popup');
        }
      } else {
        console.log('⚠️  Extension not loaded');
      }
    } catch (error) {
      console.error(`   Error testing extension: ${error.message}`);
    }
  }

  async testGoogleClassroom() {
    console.log('\n🎓 Testing Google Classroom Integration...\n');
    
    const classroomUrl = 'https://classroom.google.com/';
    console.log(`Navigating to: ${classroomUrl}`);
    
    try {
      await this.page.goto(classroomUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await this.wait(2000);
      
      // Take screenshot of Classroom (may show login page)
      await this.takeScreenshot('05-classroom-home', 'Google Classroom Homepage');
      
      console.log('ⓘ  Note: This may show login page if not authenticated');
      console.log('   To test with real data, authenticate manually and re-run');
      
    } catch (error) {
      console.error(`⚠️  Could not load Google Classroom: ${error.message}`);
    }
  }

  async processAllScreenshots() {
    console.log('\n🔧 Processing all screenshots...\n');
    
    for (const screenshot of this.screenshots) {
      const processed = await this.processScreenshot(screenshot.original);
      screenshot.processed = processed;
    }
  }

  async analyzeScreenshots() {
    console.log('\n🔍 Analyzing screenshots...\n');
    
    for (const screenshot of this.screenshots) {
      if (!screenshot.processed) continue;
      
      console.log(`📊 Analysis: ${screenshot.name}`);
      console.log(`   Description: ${screenshot.description}`);
      console.log(`   Original: ${screenshot.original}`);
      console.log(`   Processed: ${screenshot.processed}`);
      
      // Get file sizes
      const originalSize = fs.statSync(screenshot.original).size;
      const processedSize = fs.statSync(screenshot.processed).size;
      console.log(`   Size: ${(originalSize / 1024).toFixed(2)}KB → ${(processedSize / 1024).toFixed(2)}KB`);
      console.log('');
    }
  }

  async generateReport() {
    console.log('\n📝 Generating HTML Report...\n');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Screenshot Test Report - Classroom Auto-Grader</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #1a73e8;
        }
        .screenshot {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .screenshot h3 {
            margin-top: 0;
            color: #333;
        }
        .screenshot img {
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .meta {
            color: #666;
            font-size: 14px;
            margin: 10px 0;
        }
        .timestamp {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <h1>Screenshot Test Report</h1>
    <p>Classroom Auto-Grader - Automated UI Testing</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    ${this.screenshots.map(s => `
        <div class="screenshot">
            <h3>${s.description}</h3>
            <p class="meta">File: ${s.name}.png</p>
            <img src="processed/${path.basename(s.processed || s.original)}" alt="${s.description}">
        </div>
    `).join('')}
    
    <p class="timestamp">Report generated on ${new Date().toISOString()}</p>
</body>
</html>`;
    
    const reportPath = path.join(SCREENSHOTS_DIR, 'report.html');
    fs.writeFileSync(reportPath, html);
    console.log(`✓ Report saved to: ${reportPath}`);
    console.log(`  Open in browser: file://${reportPath}`);
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
      await this.testWebApp();
      await this.testChromeExtension();
      await this.testGoogleClassroom();
      await this.processAllScreenshots();
      await this.analyzeScreenshots();
      await this.generateReport();
      
      console.log('\n✅ Screenshot testing complete!');
      console.log(`\n📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
      console.log(`📊 View report: ${path.join(SCREENSHOTS_DIR, 'report.html')}\n`);
      
    } catch (error) {
      console.error('\n❌ Error during testing:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ScreenshotTester();
  tester.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ScreenshotTester;
