const fs = require('fs');
const path = require('path');

const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const topics = ['17162', '6003', '5994'];

topics.forEach(id => {
    const file = path.join(CACHE_DETAIL_DIR, `topic_${id}.html`);
    const exists = fs.existsSync(file);
    let size = 0;
    let hasFffd = false;
    if (exists) {
        const content = fs.readFileSync(file, 'utf-8');
        size = content.length;
        hasFffd = content.includes('\uFFFD');
    }
    console.log(`Topic ${id}: exists = ${exists}, size = ${size}, hasFffd = ${hasFffd}`);
});
