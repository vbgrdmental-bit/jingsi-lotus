const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/cache_forum_detail');
const files = fs.readdirSync(dir);

const corrupted = [];
files.forEach(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('\uFFFD')) {
        corrupted.push(file);
    }
});

console.log("Remaining corrupted detail files:", corrupted.length);
if (corrupted.length > 0) {
    console.log("First 10 remaining corrupted files:", corrupted.slice(0, 10));
}
