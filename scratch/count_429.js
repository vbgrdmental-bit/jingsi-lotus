const fs = require('fs');
const path = require('path');

const dirs = [
    path.join(__dirname, '../data/cache'),
    path.join(__dirname, '../data/cache_forum'),
    path.join(__dirname, '../data/cache_forum_detail')
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    let count429 = 0;
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('429 Too Many Requests')) {
                count429++;
            }
        }
    });
    console.log(`Directory ${dir}: Total files: ${files.length}, 429 errors: ${count429}`);
});
