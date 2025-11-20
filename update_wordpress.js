#!/usr/bin/env node

/**
 * WordPress Auto-Updater for Julemenyen
 * Renders pages with JSDOM and uploads to WordPress
 */

const { JSDOM } = require('jsdom');
const https = require('https');
const fs = require('fs');

// WordPress configuration
const WP_URL = 'https://julemarkedet-trondheim.no';
const WP_USERNAME = 'admin';
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || '';
const PAGE_ID_NO = 8498;
const PAGE_ID_EN = 8500;

/**
 * WordPress REST API helper
 */
function wpRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');

    const options = {
      hostname: new URL(WP_URL).hostname,
      path: `/wp-json/wp/v2/${endpoint}`,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Render page with JSDOM and execute menu.js
 */
async function renderPage(htmlFile) {
  console.log(`🌐 Rendering ${htmlFile}...`);

  // Read HTML file
  const html = fs.readFileSync(htmlFile, 'utf8');

  // Create JSDOM instance
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'file://' + __dirname + '/' + htmlFile
  });

  const { window } = dom;
  global.window = window;
  global.document = window.document;

  // Wait for menu.js to execute
  await new Promise((resolve) => {
    window.addEventListener('DOMContentLoaded', () => {
      // Give menu.js time to fetch CSV and render
      setTimeout(resolve, 3000);
    });
  });

  // Extract rendered content
  const content = dom.serialize();

  console.log(`✅ Rendered ${htmlFile} (${content.length} chars)`);
  return content;
}

/**
 * Update WordPress page
 */
async function updatePage(pageId, content) {
  console.log(`📝 Updating WordPress page ${pageId}...`);

  try {
    await wpRequest(`pages/${pageId}`, 'POST', { content });
    console.log(`✅ Updated page ${pageId}`);
  } catch (error) {
    console.error(`❌ Error updating page ${pageId}:`, error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🎄 Julemenyen WordPress Auto-Updater');
  console.log('='.repeat(60));

  if (!WP_APP_PASSWORD) {
    console.error('❌ ERROR: WP_APP_PASSWORD environment variable not set');
    process.exit(1);
  }

  try {
    // Process Norwegian page
    console.log('\n' + '='.repeat(60));
    console.log('🇳🇴 Processing Norwegian page...');
    console.log('='.repeat(60));

    const renderedNO = await renderPage('html-no-local.html');
    await updatePage(PAGE_ID_NO, renderedNO);

    // Process English page
    console.log('\n' + '='.repeat(60));
    console.log('🇬🇧 Processing English page...');
    console.log('='.repeat(60));

    const renderedEN = await renderPage('html-en-local.html');
    await updatePage(PAGE_ID_EN, renderedEN);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Update process completed successfully');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
