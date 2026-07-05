const fs = require('fs');
const path = require('path');

const dirs = [
    path.join(__dirname, '../data/cache'),
    path.join(__dirname, '../data/cache_forum'),
    path.join(__dirname, '../data/cache_forum_detail')
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log(`Directory does not exist: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir);
    let corrupted = 0;
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('\uFFFD')) {
                corrupted++;
            }
        }
    });
    console.log(`Directory ${dir}: Total files: ${files.length}, Corrupted files (with FFFD): ${corrupted}`);
});
