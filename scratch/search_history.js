const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\vbgrd\\.gemini\\antigravity-ide\\brain\\04cad0fc-97f3-4a89-a76b-eee59a3b4998\\.system_generated\\logs\\transcript.jsonl';
if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, 'utf-8').split('\n');
    let matchedLines = [];
    lines.forEach((line, idx) => {
        if (line.includes('私人') || line.includes('401') || line.includes('17')) {
            // Only print a summary of the line to keep it clean
            matchedLines.push(`${idx + 1}: ${line.substring(0, 150)}`);
        }
    });
    console.log("Total matched lines in transcript:", matchedLines.length);
    console.log("First 30 matched lines:");
    matchedLines.slice(0, 30).forEach(l => console.log(l));
} else {
    console.log("Transcript log file not found!");
}
