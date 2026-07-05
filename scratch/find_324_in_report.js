const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '../data_audit_report.md');
const content = fs.readFileSync(REPORT_FILE, 'utf-8');
console.log("Is 324 in report?", content.includes(" 324,"));
console.log("Is 329 in report?", content.includes(" 329,"));
console.log("Line 28 of report:");
console.log(content.split('\n')[27]);
