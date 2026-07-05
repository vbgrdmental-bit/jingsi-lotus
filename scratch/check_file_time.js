const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '../data_audit_report.md');
const stats = fs.statSync(REPORT_FILE);
console.log("Last modified:", stats.mtime);
const content = fs.readFileSync(REPORT_FILE, 'utf-8');
const lines = content.split('\n');
console.log("Lines 1-5:");
lines.slice(0, 5).forEach((l, idx) => console.log(`${idx+1}: ${l}`));
