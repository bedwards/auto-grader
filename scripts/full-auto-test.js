#!/usr/bin/env node

/**
 * Fully Automated Screenshot Testing
 * 
 * This script will:
 * 1. Mock authentication by injecting credentials into localStorage
 * 2. Navigate through all pages automatically
 * 3. Take comprehensive screenshots
 * 4. Analyze and report findings
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/auto-test');
const PROCESSED_DIR = path.join(SCREENSHOTS_DIR, 'processed');
const MAX_WIDTH = 2000;

// Test credentials
const TEST_CREDENTIALS = {
  googleClientId: '118866449054-b5i7of5l0191oqd2pumvg63j7bopcop0.apps.googleusercontent.com',
  geminiApiKey: 'AIzaSyA8cY_GiNH4PZm_ozSM-028paL8wwpRvLg',
  cloudflareWorkerUrl: 'https://classroom-auto-grader.brian-mabry-edwards.workers.dev'
};

// Mock user data for testing
const MOCK_USER = {
  name: 'Test Teacher',
  email: 'teacher@example.com',
  picture: 'https://via.placeholder.com/96'
};

// Ensure directories exist
[SCREENSHOTS_DIR, PROCESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class FullAutoTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshots = [];
    this.findings = [];
  }

  async init() {
    console.log('🚀 Initializing automated testing...\n');
    this.browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--window-size=1920,1080',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.findings.push({
          type: 'error',
          message: `Console Error: ${msg.text()}`
        });
      }
    });
    
    // Set up error tracking
    this.page.on('pageerror', error => {
      this.findings.push({
        type: 'error',
        message: `Page Error: ${error.message}`
      });
    });
  }

  async injectMockAuth() {
    console.log('🔐 Injecting mock authentication...');
    
    // Navigate to the app first
    await this.page.goto('http://localhost:3000/auto-grader/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Inject credentials into localStorage
    await this.page.evaluate((creds, user) => {
      // Set credentials
      localStorage.setItem('googleClientId', creds.googleClientId);
      localStorage.setItem('geminiApiKey', creds.geminiApiKey);
      
      localStorage.setItem('autoGraderSettings', JSON.stringify({
        cloudflareWorkerUrl: creds.cloudflareWorkerUrl,
        defaultAiModel: 'gemini',
        feedbackDetail: 'detailed',
        autoReturn: true
      }));
      
      // Enable DEMO MODE for testing
      localStorage.setItem('DEMO_MODE', 'true');
      
      // Mock authentication state (simulate signed in)
      localStorage.setItem('mockUser', JSON.stringify(user));
      
      // Set a fake access token
      sessionStorage.setItem('googleAccessToken', 'mock_token_for_testing');
      
    }, TEST_CREDENTIALS, MOCK_USER);
    
    this.findings.push({
      type: 'info',
      message: 'Mock authentication injected successfully'
    });
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
      console.error(`   ✗ Failed to capture screenshot: ${error.message}`);
      this.findings.push({
        type: 'error',
        message: `Screenshot failed for ${name}: ${error.message}`
      });
      return null;
    }
  }

  async analyzePageStructure() {
    console.log('🔍 Analyzing page structure...');
    
    const analysis = await this.page.evaluate(() => {
      const results = {
        title: document.title,
        hasApp: !!document.getElementById('app'),
        hasAuthSection: !!document.getElementById('auth-section'),
        hasMainContent: !!document.getElementById('main-content'),
        tabs: [],
        buttons: [],
        forms: [],
        errors: []
      };
      
      // Find all tabs
      document.querySelectorAll('.tab-btn').forEach(tab => {
        results.tabs.push({
          text: tab.textContent.trim(),
          dataTab: tab.getAttribute('data-tab'),
          visible: !tab.classList.contains('hidden')
        });
      });
      
      // Find all buttons
      document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.trim()) {
          results.buttons.push({
            text: btn.textContent.trim(),
            id: btn.id,
            disabled: btn.disabled
          });
        }
      });
      
      // Find forms
      document.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.id) {
          results.forms.push({
            id: field.id,
            type: field.type || field.tagName.toLowerCase(),
            value: field.value ? '[has value]' : '[empty]'
          });
        }
      });
      
      // Check for visible errors
      document.querySelectorAll('.error, [class*="error"]').forEach(el => {
        if (el.textContent.trim()) {
          results.errors.push(el.textContent.trim());
        }
      });
      
      return results;
    });
    
    this.findings.push({
      type: 'analysis',
      message: `Page has ${analysis.tabs.length} tabs, ${analysis.buttons.length} buttons, ${analysis.forms.length} form fields`
    });
    
    return analysis;
  }

  async testAllPages() {
    console.log('\n📱 Testing all pages...\n');
    
    // 1. Homepage (before auth simulation)
    await this.page.goto('http://localhost:3000/auto-grader/', { waitUntil: 'networkidle2' });
    await this.wait(1000);
    await this.takeScreenshot('01-homepage-unauthenticated', 'Homepage - Unauthenticated State');
    let analysis = await this.analyzePageStructure();
    console.log(`   Found ${analysis.tabs.length} tabs (should be hidden)\n`);
    
    // 2. Inject auth and reload
    await this.injectMockAuth();
    await this.page.reload({ waitUntil: 'networkidle2' });
    await this.wait(2000);
    
    // 3. Check if Settings are accessible now
    await this.takeScreenshot('02-after-mock-auth', 'After Mock Auth Injection');
    analysis = await this.analyzePageStructure();
    console.log(`   Tabs available: ${analysis.tabs.map(t => t.dataTab).join(', ')}\n`);
    
    // 4. Navigate to Settings first to verify credentials are loaded
    console.log('⚙️  Testing Settings page...');
    const settingsBtn = await this.page.$('[data-tab="settings"]');
    if (settingsBtn) {
      await settingsBtn.click();
      await this.wait(1500);
      await this.takeScreenshot('03-settings-page', 'Settings Page');
      
      // Check if credentials are displayed
      const hasClientId = await this.page.$eval('#google-client-id', el => !!el.value).catch(() => false);
      const hasGeminiKey = await this.page.$eval('#gemini-api-key', el => !!el.value).catch(() => false);
      
      this.findings.push({
        type: hasClientId && hasGeminiKey ? 'success' : 'warning',
        message: `Settings fields populated: Client ID=${hasClientId}, Gemini Key=${hasGeminiKey}`
      });
    }
    
    // 5. Test all tabs
    const tabs = ['dashboard', 'courses', 'assignments', 'rubrics', 'grading', 'settings'];
    
    for (const tabId of tabs) {
      console.log(`📑 Testing ${tabId} tab...`);
      
      try {
        const tabBtn = await this.page.$(`[data-tab="${tabId}"]`);
        if (!tabBtn) {
          console.log(`   ⚠️  Tab button not found for ${tabId}`);
          this.findings.push({
            type: 'warning',
            message: `Tab ${tabId} button not found`
          });
          continue;
        }
        
        await tabBtn.click();
        await this.wait(1500);
        
        // Wait for tab content to load
        await this.page.waitForSelector(`#${tabId}-tab`, { timeout: 5000 }).catch(() => {});
        
        await this.takeScreenshot(`04-tab-${tabId}`, `${tabId.charAt(0).toUpperCase() + tabId.slice(1)} Tab`);
        
        const tabAnalysis = await this.analyzePageStructure();
        this.findings.push({
          type: 'info',
          message: `${tabId} tab: ${tabAnalysis.buttons.length} buttons, ${tabAnalysis.forms.length} inputs`
        });
        
      } catch (error) {
        console.log(`   ✗ Error testing ${tabId}: ${error.message}`);
        this.findings.push({
          type: 'error',
          message: `Failed to test ${tabId} tab: ${error.message}`
        });
      }
    }
    
    // 6. Test specific interactions
    await this.testGradingWorkflow();
    await this.testRubricGeneration();
  }

  async testGradingWorkflow() {
    console.log('\n🎯 Testing Grading Workflow...\n');
    
    // Navigate to grading tab
    const gradingBtn = await this.page.$('[data-tab="grading"]');
    if (gradingBtn) {
      await gradingBtn.click();
      await this.wait(1000);
      
      await this.takeScreenshot('05-grading-initial', 'Grading Tab - Initial State');
      
      // Check for course select
      const hasCourseSelect = await this.page.$('#course-select');
      const hasAssignmentSelect = await this.page.$('#assignment-select');
      const hasStartBtn = await this.page.$('#start-grading-btn');
      
      this.findings.push({
        type: 'info',
        message: `Grading UI elements: Course select=${!!hasCourseSelect}, Assignment select=${!!hasAssignmentSelect}, Start button=${!!hasStartBtn}`
      });
    }
  }

  async testRubricGeneration() {
    console.log('\n📊 Testing Rubric Generation...\n');
    
    const rubricsBtn = await this.page.$('[data-tab="rubrics"]');
    if (rubricsBtn) {
      await rubricsBtn.click();
      await this.wait(1000);
      
      await this.takeScreenshot('06-rubrics-page', 'Rubrics Tab');
      
      // Look for generation button
      const hasGenerateBtn = await this.page.$('#generate-rubric-btn');
      this.findings.push({
        type: 'info',
        message: `Rubric generation button present: ${!!hasGenerateBtn}`
      });
    }
  }

  async testWorkerAPI() {
    console.log('\n🔗 Testing Cloudflare Worker API...\n');
    
    const workerUrl = TEST_CREDENTIALS.cloudflareWorkerUrl;
    
    try {
      // Test health endpoint
      const healthCheck = await this.page.evaluate(async (url) => {
        const response = await fetch(`${url}/health`);
        return {
          status: response.status,
          data: await response.json()
        };
      }, workerUrl);
      
      this.findings.push({
        type: healthCheck.status === 200 ? 'success' : 'error',
        message: `Worker health check: ${healthCheck.status} - ${JSON.stringify(healthCheck.data)}`
      });
      
    } catch (error) {
      this.findings.push({
        type: 'error',
        message: `Worker API test failed: ${error.message}`
      });
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
    console.log('\n📝 Generating comprehensive report...\n');
    
    const successCount = this.findings.filter(f => f.type === 'success').length;
    const errorCount = this.findings.filter(f => f.type === 'error').length;
    const warningCount = this.findings.filter(f => f.type === 'warning').length;
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automated Test Report - Classroom Auto-Grader</title>
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
        <h1>🤖 Automated Test Report</h1>
        <p style="color: #666; margin-bottom: 30px;">Classroom Auto-Grader - Complete System Test</p>
        
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
            Classroom Auto-Grader v1.0.0<br>
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
      await this.testAllPages();
      await this.testWorkerAPI();
      await this.processAll();
      const reportPath = await this.generateReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ AUTOMATED TESTING COMPLETE');
      console.log('='.repeat(60));
      console.log(`\n📁 Screenshots: ${SCREENSHOTS_DIR}`);
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
  const tester = new FullAutoTester();
  tester.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = FullAutoTester;
