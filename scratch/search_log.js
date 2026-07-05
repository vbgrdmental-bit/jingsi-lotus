const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\vbgrd\\.gemini\\antigravity-ide\\brain\\04cad0fc-97f3-4a89-a76b-eee59a3b4998\\.system_generated\\tasks\\task-330.log';
if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, 'utf-8').split('\n');
    console.log("Total lines in log:", lines.length);
    let matchedLines = [];
    lines.forEach((line, idx) => {
        if (line.includes('18965') || line.includes('Topic 18965')) {
            matchedLines.push(`${idx + 1}: ${line}`);
        }
    });
    console.log("Matched lines:", matchedLines);
} else {
    console.log("Log file not found!");
}
