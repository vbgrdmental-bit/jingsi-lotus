const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '../data_audit_report.md');
if (fs.existsSync(REPORT_FILE)) {
    const lines = fs.readFileSync(REPORT_FILE, 'utf-8').split('\n');
    console.log("Report lines 1-15:");
    lines.slice(0, 15).forEach((line, idx) => {
        console.log(`${idx + 1}: ${line}`);
    });
} else {
    console.log("Report file not found!");
}
