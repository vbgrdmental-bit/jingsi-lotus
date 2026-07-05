const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '../data_audit_report.md');
const content = fs.readFileSync(REPORT_FILE, 'utf-8');
const lines = content.split('\n');
console.log("Remaining invalid videos:");
lines.forEach(line => {
    if (line.startsWith('|') && !line.includes('集數') && !line.includes(':---')) {
        const parts = line.split('|');
        if (parts.length >= 5) {
            const epId = parts[1].trim();
            const title = parts[2].trim();
            const reason = parts[4].trim();
            if (reason !== '無影片網址') {
                console.log(`  Ep ${epId}: "${title}" - ${reason}`);
            }
        }
    }
});
