#!/usr/bin/env node

/**
 * Test Google Classroom Add-on
 * Tests all iframe views with screenshot verification
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://localhost:5001';
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/classroom-addon');
const PROCESSED_DIR = path.join(SCREENSHOTS_DIR, 'processed');
const MAX_WIDTH = 2000;

// Ensure directories exist
[SCREENSHOTS_DIR, PROCESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class ClassroomAddonTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshots = [];
    this.findings = [];
  }

  async init() {
    console.log('🚀 Testing Classroom Add-on...\n');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: 800, height: 600 }, // Typical iframe size
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors', // For self-signed cert
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Track console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.findings.push({
          type: 'error',
          message: `Console Error: ${msg.text()}`
        });
      }
    });
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

  async testHomepage() {
    console.log('🏠 Testing homepage...\n');
    
    try {
      await this.page.goto(`${BASE_URL}/`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      await this.wait(1000);
      
      await this.takeScreenshot('addon-01-homepage', 'Add-on Homepage');
      
      this.findings.push({
        type: 'success',
        message: 'Homepage loaded successfully'
      });
    } catch (error) {
      this.findings.push({
        type: 'error',
        message: `Homepage failed: ${error.message}`
      });
    }
  }

  async testAddonDiscovery() {
    console.log('🔍 Testing addon discovery iframe...\n');
    
    try {
      await this.page.goto(`${BASE_URL}/addon-discovery?login_hint=teacher@example.com`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      await this.wait(1000);
      
      await this.takeScreenshot('addon-02-discovery', 'Attachment Discovery iframe');
      
      // Analyze page
      const hasSignInButton = await this.page.$('button:contains("Sign In")') !== null;
      const hasCloseButton = await this.page.$('button:contains("Close")') !== null;
      
      this.findings.push({
        type: 'success',
        message: 'Discovery iframe loaded successfully'
      });
    } catch (error) {
      this.findings.push({
        type: 'error',
        message: `Discovery iframe failed: ${error.message}`
      });
    }
  }

  async testTeacherView() {
    console.log('👩‍🏫 Testing teacher view iframe...\n');
    
    try {
      await this.page.goto(`${BASE_URL}/teacher-view?itemId=123&itemType=courseWork&courseId=456`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      await this.wait(1000);
      
      await this.takeScreenshot('addon-03-teacher-view', 'Teacher View iframe');
      
      // Fill in form
      await this.page.type('#rubric', '{"criteria": [{"name": "Content", "points": 50}]}');
      await this.page.select('#gradeLevel', 'high');
      await this.wait(500);
      
      await this.takeScreenshot('addon-04-teacher-view-filled', 'Teacher View - Form Filled');
      
      this.findings.push({
        type: 'success',
        message: 'Teacher view loaded and form functional'
      });
    } catch (error) {
      this.findings.push({
        type: 'error',
        message: `Teacher view failed: ${error.message}`
      });
    }
  }

  async testStudentView() {
    console.log('🎓 Testing student view iframe...\n');
    
    try {
      await this.page.goto(`${BASE_URL}/student-view?itemId=123&attachmentId=789&submissionId=101`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      await this.wait(1000);
      
      await this.takeScreenshot('addon-05-student-view', 'Student View iframe');
      
      // Type submission
      await this.page.type('#submission', 'This is my test submission for the assignment. I have completed all the required work and addressed each point in the rubric.');
      await this.wait(500);
      
      await this.takeScreenshot('addon-06-student-submission', 'Student View - With Submission');
      
      this.findings.push({
        type: 'success',
        message: 'Student view loaded and submission form functional'
      });
    } catch (error) {
      this.findings.push({
        type: 'error',
        message: `Student view failed: ${error.message}`
      });
    }
  }

  async testGraderView() {
    console.log('✅ Testing grader view iframe...\n');
    
    try {
      await this.page.goto(`${BASE_URL}/grader-view?itemId=123&attachmentId=789&submissionId=101`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      await this.wait(1000);
      
      await this.takeScreenshot('addon-07-grader-view', 'Grader View iframe');
      
      // Add override grade and comments
      await this.page.type('#overrideGrade', '95');
      await this.page.type('#teacherComments', 'Excellent work! You demonstrated mastery of the concepts.');
      await this.wait(500);
      
      await this.takeScreenshot('addon-08-grader-with-comments', 'Grader View - With Comments');
      
      this.findings.push({
        type: 'success',
        message: 'Grader view loaded and review form functional'
      });
    } catch (error) {
      this.findings.push({
        type: 'error',
        message: `Grader view failed: ${error.message}`
      });
    }
  }

  async testMobileView() {
    console.log('📱 Testing mobile responsive design...\n');
    
    try {
      // Test on mobile size
      await this.page.setViewport({ width: 375, height: 667 });
      
      await this.page.goto(`${BASE_URL}/addon-discovery`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      await this.wait(1000);
      
      await this.takeScreenshot('addon-09-mobile', 'Mobile View');
      
      // Reset viewport
      await this.page.setViewport({ width: 800, height: 600 });
      
      this.findings.push({
        type: 'success',
        message: 'Mobile responsive design tested'
      });
    } catch (error) {
      this.findings.push({
        type: 'warning',
        message: `Mobile test failed: ${error.message}`
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
    console.log('\n📝 Generating test report...\n');
    
    const successCount = this.findings.filter(f => f.type === 'success').length;
    const errorCount = this.findings.filter(f => f.type === 'error').length;
    const warningCount = this.findings.filter(f => f.type === 'warning').length;
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Classroom Add-on Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { color: #1a73e8; margin-bottom: 20px; font-size: 36px; }
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
        .screenshots {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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
            border-left: 4px solid #ddd;
        }
        .finding.success { background: #e6f4ea; border-left-color: #34a853; }
        .finding.error { background: #fce8e6; border-left-color: #ea4335; }
        .finding.warning { background: #fef7e0; border-left-color: #fbbc04; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 Classroom Add-on Test Report</h1>
        
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
            <p style="color: #666;">Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="findings">
            <h2>Findings</h2>
            ${this.findings.map(f => `
                <div class="finding ${f.type}">
                    <strong>${f.type.toUpperCase()}:</strong> ${f.message}
                </div>
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
    console.log('\n🧹 Cleaning up...');
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.testHomepage();
      await this.testAddonDiscovery();
      await this.testTeacherView();
      await this.testStudentView();
      await this.testGraderView();
      await this.testMobileView();
      await this.processAll();
      const reportPath = await this.generateReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ CLASSROOM ADD-ON TEST COMPLETE');
      console.log('='.repeat(60));
      console.log(`\n📊 Report: file://${reportPath}`);
      console.log(`📸 Screenshots: ${this.screenshots.length}`);
      console.log(`✅ Success: ${this.findings.filter(f => f.type === 'success').length}`);
      console.log(`❌ Errors: ${this.findings.filter(f => f.type === 'error').length}`);
      console.log(`⚠️  Warnings: ${this.findings.filter(f => f.type === 'warning').length}\n`);
      
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
  const tester = new ClassroomAddonTester();
  tester.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ClassroomAddonTester;
