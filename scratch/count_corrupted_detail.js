const fs = require('fs');
const path = require('path');

const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const files = fs.readdirSync(CACHE_DETAIL_DIR).filter(f => f.startsWith('topic_') && f.endsWith('.html'));

let corruptedCount = 0;
const corruptedFiles = [];

files.forEach(file => {
    const filePath = path.join(CACHE_DETAIL_DIR, file);
    const stat = fs.statSync(filePath);
    if (stat.size < 2000) {
        corruptedCount++;
        corruptedFiles.push({
            file,
            size: stat.size
        });
    }
});

console.log("Total detail files:", files.length);
console.log("Corrupted detail files (< 2000 bytes) now:", corruptedCount);
if (corruptedCount > 0) {
    console.log("Corrupted files:", corruptedFiles);
}
