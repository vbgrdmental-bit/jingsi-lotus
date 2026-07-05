const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../data/cache_forum_detail/topic_17171.html');
const content = fs.readFileSync(file, 'utf-8');

const head = content.substring(0, 2000);
console.log(head);
