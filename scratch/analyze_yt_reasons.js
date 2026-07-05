const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '../data_audit_report.md');
if (fs.existsSync(REPORT_FILE)) {
    const content = fs.readFileSync(REPORT_FILE, 'utf-8');
    const lines = content.split('\n');
    const reasons = {};
    lines.forEach(line => {
        if (line.startsWith('|') && !line.includes('集數')) {
            const parts = line.split('|');
            if (parts.length >= 5) {
                const ep = parts[1].trim();
                const title = parts[2].trim();
                const reason = parts[4].trim();
                reasons[reason] = (reasons[reason] || 0) + 1;
            }
        }
    });
    console.log("Reasons count:", reasons);
} else {
    console.log("Report file not found!");
}
