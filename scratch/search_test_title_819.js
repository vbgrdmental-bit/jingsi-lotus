const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        };
        https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed: ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => { resolve(Buffer.concat(chunks).toString('utf-8')); });
        }).on('error', reject);
    });
}

async function run() {
    const query = encodeURIComponent("靜思妙蓮華 悲忍行樂大乘");
    const url = `https://www.youtube.com/results?search_query=${query}`;
    console.log("Searching:", url);
    const html = await fetchUrl(url);
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
        console.log("Search results:");
        videoResults.slice(0, 5).forEach((v, i) => {
            console.log(`  ${i+1}. [${v.videoId}] "${v.title}"`);
        });
    } else {
        console.log("ytInitialData not found.");
    }
}

run().catch(console.error);
