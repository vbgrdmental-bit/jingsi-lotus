const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/cache_forum_detail/topic_22037.html');
if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`topic_22037.html exists! size = ${stat.size}, hasFffd = ${content.includes('\uFFFD')}`);
} else {
    console.log(`topic_22037.html does NOT exist!`);
}
