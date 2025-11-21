#!/usr/bin/env node

/**
 * Authenticated Screenshot Testing
 * 
 * This script will:
 * 1. Open browser in visible mode
 * 2. Let you sign in manually
 * 3. Capture screenshots of all authenticated pages
 * 4. Process and analyze them
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/authenticated');
const PROCESSED_DIR = path.join(SCREENSHOTS_DIR, 'processed');
const MAX_WIDTH = 2000;

// Ensure directories exist
[SCREENSHOTS_DIR, PROCESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

class AuthenticatedScreenshotTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshots = [];
  }

  async init() {
    console.log('\n🚀 Starting browser in VISIBLE mode...\n');
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
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
    
    console.log(`📸 ${description}`);
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
    
    try {
      execSync(`magick "${filepath}" -resize ${MAX_WIDTH}x\\> "${processedPath}"`);
      return processedPath;
    } catch (error) {
      console.error(`   ✗ Error processing ${filename}`);
      return null;
    }
  }

  async authenticateAndTest() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  STEP 1: Navigate to App and Authenticate');
    console.log('═══════════════════════════════════════════════════\n');
    
    const appUrl = 'http://localhost:3000/auto-grader/';
    console.log(`Opening: ${appUrl}`);
    await this.page.goto(appUrl, { waitUntil: 'networkidle2' });
    await this.wait(2000);
    
    // Load environment variables
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    const clientId = process.env.GOOGLE_CLIENT_ID || 'your-client-id.apps.googleusercontent.com';
    const geminiKey = process.env.GEMINI_API_KEY || 'your-api-key-here';
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL || 'https://your-worker.workers.dev';
    
    console.log('\n📝 MANUAL ACTION REQUIRED:\n');
    console.log('1. Go to Settings tab in the browser');
    console.log('2. Enter your credentials:');
    console.log(`   - Google Client ID: ${clientId}`);
    console.log(`   - Gemini API Key: ${geminiKey}`);
    console.log(`   - Cloudflare Worker: ${workerUrl}`);
    console.log('3. Click "Save Settings"');
    console.log('4. Go to Dashboard tab');
    console.log('5. Click "Sign in with Google"');
    console.log('6. Complete the OAuth flow');
    console.log('');
    
    await prompt('Press ENTER when you are signed in and ready to continue...');
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  STEP 2: Capturing Screenshots');
    console.log('═══════════════════════════════════════════════════\n');
    
    // Wait for page to be ready
    await this.wait(2000);
    
    // Dashboard
    console.log('📸 Dashboard...');
    await this.takeScreenshot('01-dashboard', 'Dashboard - Authenticated');
    await this.wait(1000);
    
    // Navigate through tabs
    const tabs = [
      { id: 'courses', name: 'Courses' },
      { id: 'assignments', name: 'Assignments' },
      { id: 'rubrics', name: 'Rubrics' },
      { id: 'grading', name: 'Auto-Grade' },
      { id: 'settings', name: 'Settings' }
    ];
    
    for (const tab of tabs) {
      try {
        console.log(`📸 ${tab.name} tab...`);
        await this.page.click(`[data-tab="${tab.id}"]`);
        await this.wait(1500);
        await this.takeScreenshot(`02-${tab.id}`, `${tab.name} Tab`);
      } catch (error) {
        console.log(`   ⚠️  Could not capture ${tab.name}`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  STEP 3: Test Chrome Extension');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📝 MANUAL ACTION:\n');
    console.log('1. Open Chrome extension popup');
    console.log('2. Take a manual screenshot or leave it open');
    console.log('');
    
    await prompt('Press ENTER to continue to Google Classroom...');
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  STEP 4: Test Google Classroom Integration');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('Opening Google Classroom...');
    await this.page.goto('https://classroom.google.com/', { waitUntil: 'networkidle2' });
    await this.wait(3000);
    
    await this.takeScreenshot('03-classroom-home', 'Google Classroom - Authenticated');
    
    console.log('\n📝 If you have courses, navigate to one and look for auto-grade buttons');
    console.log('');
    
    await prompt('Press ENTER when done exploring...');
    
    // Take final screenshot
    await this.takeScreenshot('04-classroom-current', 'Google Classroom - Current View');
  }

  async processAll() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  STEP 5: Processing Screenshots');
    console.log('═══════════════════════════════════════════════════\n');
    
    for (const screenshot of this.screenshots) {
      console.log(`🔧 Processing: ${screenshot.name}.png`);
      const processed = await this.processScreenshot(screenshot.original);
      screenshot.processed = processed;
    }
  }

  async generateReport() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  STEP 6: Generating Report');
    console.log('═══════════════════════════════════════════════════\n');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authenticated Screenshot Report - Classroom Auto-Grader</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #1a73e8;
            border-bottom: 3px solid #1a73e8;
            padding-bottom: 10px;
        }
        .meta {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .screenshot {
            background: white;
            padding: 30px;
            margin: 30px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .screenshot h3 {
            margin-top: 0;
            color: #333;
            font-size: 24px;
        }
        .screenshot img {
            max-width: 100%;
            border: 2px solid #ddd;
            border-radius: 8px;
            margin-top: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .description {
            color: #666;
            font-size: 16px;
            margin: 10px 0;
        }
        .timestamp {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <h1>📸 Authenticated Screenshot Report</h1>
    <div class="meta">
        <h2>Classroom Auto-Grader - Full UI Testing</h2>
        <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Mode:</strong> Authenticated with Google Account</p>
        <p><strong>Total Screenshots:</strong> ${this.screenshots.length}</p>
    </div>
    
    ${this.screenshots.map((s, i) => `
        <div class="screenshot">
            <h3>${i + 1}. ${s.description}</h3>
            <p class="description">File: ${s.name}.png</p>
            <img src="processed/${path.basename(s.processed || s.original)}" alt="${s.description}">
        </div>
    `).join('')}
    
    <p class="timestamp">
        Report generated: ${new Date().toISOString()}<br>
        Classroom Auto-Grader v1.0.0
    </p>
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
    console.log('\n🧹 Closing browser...');
    rl.close();
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.authenticateAndTest();
      await this.processAll();
      const reportPath = await this.generateReport();
      
      console.log('\n✅ TESTING COMPLETE!\n');
      console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}`);
      console.log(`📊 HTML Report: file://${reportPath}`);
      console.log('');
      
      // Auto-open report
      try {
        execSync(`open "${reportPath}"`);
      } catch (e) {}
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run
const tester = new AuthenticatedScreenshotTester();
tester.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
