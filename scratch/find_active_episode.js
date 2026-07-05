const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('activeEpisode')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
