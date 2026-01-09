#!/usr/bin/env node

/**
 * Simple cron-style runner that hits the alert scan endpoint.
 * Usage: node scripts/house-alerts-cron.js <cronUrl>
 * The cronUrl should be a pre-generated Vercel cron URL or deployed worker endpoint.
 */

const https = require('https');

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/house-alerts-cron.js <cronEndpointUrl>');
  process.exit(1);
}

https
  .request(url, { method: 'POST' }, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log('[house-alerts-cron] status:', res.statusCode);
      console.log(body);
    });
  })
  .on('error', (err) => {
    console.error('[house-alerts-cron] request failed', err);
    process.exitCode = 1;
  })
  .end();
