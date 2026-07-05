const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../app.css');
const content = fs.readFileSync(cssPath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('chapter-card') || line.includes('arrow') || line.includes('accordion') || line.includes('episode-item')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
