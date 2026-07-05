const fs = require('fs');
const path = require('path');

const cacheDir = path.join(__dirname, '../data/cache_yt_search');
if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir);
    console.log("Total cache files in cache_yt_search:", files.length);
    if (files.length > 0) {
        console.log("First 10 files:", files.slice(0, 10));
    }
} else {
    console.log("cache_yt_search directory does not exist.");
}
