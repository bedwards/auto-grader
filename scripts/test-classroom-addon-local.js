#!/usr/bin/env node

/**
 * Screenshot Test for Google Classroom Add-on
 * Tests the Flask add-on running locally
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/classroom-addon');
const ADDON_URL = 'https://localhost:5002'; // Using different port

// Ensure directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

class ClassroomAddonTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshots = [];
  }

  async init() {
    console.log('🚀 Launching browser with SSL certificate bypass...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: 1280, height: 800 },
      args: [
        '--window-size=1280,800',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors', // Accept self-signed certs
        '--allow-insecure-localhost',
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
      path: filepath
    });
    
    return filepath;
  }

  async testAddonPages() {
    console.log('\n🎓 Testing Google Classroom Add-on\n');
    
    const pages = [
      { path: '/', name: '01-landing', desc: 'Landing Page' },
      { path: '/addon-discovery', name: '02-discovery', desc: 'Add-on Discovery (First Screen)' },
      { path: '/teacher-view?itemId=123&itemType=COURSE_WORK&courseId=456', name: '03-teacher-view', desc: 'Teacher Configuration View' },
      { path: '/student-view?itemId=123&attachmentId=789&submissionId=101', name: '04-student-view', desc: 'Student Submission View' },
      { path: '/grader-view?itemId=123&attachmentId=789&submissionId=101', name: '05-grader-view', desc: 'Teacher Grader View' },
    ];

    for (const pageInfo of pages) {
      try {
        const url = `${ADDON_URL}${pageInfo.path}`;
        console.log(`\nNavigating to: ${url}`);
        
        await this.page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        await this.wait(500);
        await this.takeScreenshot(pageInfo.name, pageInfo.desc);
        
      } catch (error) {
        console.error(`   ✗ Failed to load ${pageInfo.path}: ${error.message}`);
        // Take screenshot of error page
        await this.takeScreenshot(pageInfo.name + '-error', `${pageInfo.desc} (Error)`);
      }
    }
  }

  async generateReport() {
    console.log('\n📝 Generating HTML Report...\n');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Classroom Add-on Test Report</title>
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
    </style>
</head>
<body>
    <h1>Classroom Add-on Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <p>Testing URL: ${ADDON_URL}</p>
    
    ${this.screenshots.map(s => `
        <div class="screenshot">
            <h3>${s.description}</h3>
            <p class="meta">File: ${s.name}.png</p>
            <img src="${path.basename(s.path)}" alt="${s.description}">
        </div>
    `).join('')}
    
</body>
</html>`;
    
    const reportPath = path.join(SCREENSHOTS_DIR, 'report.html');
    fs.writeFileSync(reportPath, html);
    console.log(`✓ Report saved to: ${reportPath}`);
    console.log(`  Open: file://${reportPath}`);
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
      await this.testAddonPages();
      await this.generateReport();
      
      console.log('\n✅ Classroom Add-on testing complete!');
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
  console.log('⚠️  Make sure the Flask add-on is running on https://localhost:5002');
  console.log('   Start it with: cd classroom-addon && python app.py');
  console.log('');
  
  const tester = new ClassroomAddonTester();
  tester.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ClassroomAddonTester;
