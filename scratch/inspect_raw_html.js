const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../data/cache_forum_detail/topic_17171.html');
const content = fs.readFileSync(file, 'utf-8');

let idx = 0;
while (true) {
    idx = content.indexOf('\uFFFD', idx);
    if (idx === -1) break;
    
    const start = Math.max(0, idx - 40);
    const end = Math.min(content.length, idx + 40);
    console.log(`Index ${idx}: ...${content.substring(start, end).replace(/\n/g, '\\n')}...`);
    idx++;
}
