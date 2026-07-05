const fs = require('fs');
const path = require('path');
const https = require('https');

const SEARCH_CACHE_DIR = path.join(__dirname, '../data/cache_yt_search');
const epId = 818;
const cacheFile = path.join(SEARCH_CACHE_DIR, `search_${epId}.html`);

if (fs.existsSync(cacheFile)) {
    const html = fs.readFileSync(cacheFile, 'utf-8');
    const match = html.match(/ytInitialData\s*=\s*({.+?});/);
    if (match) {
        const json = JSON.parse(match[1]);
        const videoResults = [];
        
        function findVideoIds(obj) {
            if (!obj || typeof obj !== 'object') return;
            if (obj.videoRenderer) {
                videoResults.push({
                    videoId: obj.videoRenderer.videoId,
                    title: obj.videoRenderer.title?.runs?.[0]?.text || obj.videoRenderer.title?.simpleText || ''
                });
            }
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    findVideoIds(obj[key]);
                }
            }
        }
        
        findVideoIds(json);
        console.log(`Search results for Ep ${epId}:`);
        videoResults.slice(0, 10).forEach((v, i) => {
            console.log(`  ${i+1}. [${v.videoId}] "${v.title}"`);
        });
    } else {
        console.log("ytInitialData not found in cache file.");
    }
} else {
    console.log("Cache file not found for Ep 818.");
}
