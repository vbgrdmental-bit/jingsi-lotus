const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '../data_audit_report.md');
const content = fs.readFileSync(REPORT_FILE, 'utf-8');
const lines = content.split('\n');

const idx = lines.findIndex(l => l.includes('### 4. 無逐字稿全文集數'));
if (idx !== -1) {
    console.log("Transcript list block:");
    console.log(lines.slice(idx, idx + 5).join('\n'));
} else {
    console.log("Transcript block not found in report.");
}
