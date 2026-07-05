const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '../data_audit_report.md');
const stats = fs.statSync(REPORT_FILE);
console.log("File stats modification time:", stats.mtime);
const content = fs.readFileSync(REPORT_FILE, 'utf-8');
console.log("Length:", content.length);
console.log("Summary block:");
const lines = content.split('\n');
console.log(lines.slice(0, 20).join('\n'));
