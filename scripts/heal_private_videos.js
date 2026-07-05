const fs = require('fs');
const path = require('path');
const https = require('https');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const CACHE_DIR = path.join(__dirname, '../data/cache_yt_search');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

if (!fs.existsSync(RAW_FILE)) {
    console.error("raw_episodes.json not found.");
    process.exit(1);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url, retries = 3, backoff = 1000) {
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            };
            https.get(url, options, (res) => {
                const { statusCode } = res;
                if (statusCode !== 200) {
                    res.resume();
                    if (retries > 0 && (statusCode === 429 || statusCode >= 500)) {
                        console.warn(`      Rate limited or server error (${statusCode}). Retrying in ${backoff}ms...`);
                        setTimeout(() => attempt(), backoff);
                        backoff *= 2;
                        retries--;
                    } else {
                        reject(new Error(`Request Failed. Status Code: ${statusCode}`));
                    }
                    return;
                }

                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => { resolve(data); });
            }).on('error', (err) => {
                if (retries > 0) {
                    console.warn(`      Network error: ${err.message}. Retrying in ${backoff}ms...`);
                    setTimeout(() => attempt(), backoff);
                    backoff *= 2;
                    retries--;
                } else {
                    reject(err);
                }
            });
        };
        attempt();
    });
}

// Helper to batch execute promises with concurrency limit
async function batchExecute(tasks, concurrency) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        if (concurrency <= tasks.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= concurrency) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
}

async function run() {
    // Parse target episode IDs or ranges from arguments
    // Usage: node scripts/heal_private_videos.js <min_id> <max_id>
    let minId = parseInt(process.argv[2]);
    let maxId = parseInt(process.argv[3]);

    if (isNaN(minId) || isNaN(maxId)) {
        console.error("Usage: node scripts/heal_private_videos.js <min_id> <max_id>");
        console.error("Example: node scripts/heal_private_videos.js 748 866");
        process.exit(1);
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    const targetEpisodes = rawEpisodes.filter(e => e.episode_id >= minId && e.episode_id <= maxId);

    console.log(`Targeting ${targetEpisodes.length} episodes (${minId} to ${maxId}) for public YouTube search healing...`);

    let healedCount = 0;

    const tasks = targetEpisodes.map(ep => async () => {
        const epId = ep.episode_id;
        const cacheFile = path.join(CACHE_DIR, `search_${epId}.html`);
        let html = '';

        if (fs.existsSync(cacheFile)) {
            html = fs.readFileSync(cacheFile, 'utf-8');
        } else {
            // Delay 350ms to respect YouTube limits
            await delay(350);
            try {
                const query = encodeURIComponent(`靜思妙蓮華 第${epId}集`);
                const url = `https://www.youtube.com/results?search_query=${query}`;
                html = await fetchUrl(url);
                fs.writeFileSync(cacheFile, html, 'utf-8');
            } catch (err) {
                console.error(`  [Ep ${epId}] Failed to search YouTube:`, err.message);
                return;
            }
        }

        try {
            const match = html.match(/ytInitialData\s*=\s*({.+?});/);
            if (!match) {
                console.warn(`  [Ep ${epId}] ytInitialData not found in HTML.`);
                return;
            }

            const json = JSON.parse(match[1]);
            const videoIds = [];
            
            function findVideoIds(obj) {
                if (!obj || typeof obj !== 'object') return;
                if (obj.videoRenderer) {
                    videoIds.push({
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

            if (videoIds.length === 0) {
                console.warn(`  [Ep ${epId}] No video results found.`);
                return;
            }

            // Find the first result that matches our episode number (or default to index 0 if titles look good)
            let matchedResult = null;
            const targetMarker = `第${epId}集`;
            const targetMarkerAlt = `第 ${epId} 集`;

            for (const res of videoIds) {
                if (res.title.includes(targetMarker) || res.title.includes(targetMarkerAlt)) {
                    matchedResult = res;
                    break;
                }
            }



            if (matchedResult) {
                const newYt = `https://www.youtube.com/watch?v=${matchedResult.videoId}`;
                if (ep.youtube_url !== newYt) {
                    console.log(`  [Ep ${epId}] Healed: ${ep.youtube_url} -> ${newYt} (${matchedResult.title})`);
                    ep.youtube_url = newYt;
                    healedCount++;
                }
            } else {
                console.warn(`  [Ep ${epId}] No matching video result found in search. First result was: "${videoIds[0]?.title}"`);
            }
        } catch (err) {
            console.error(`  [Ep ${epId}] Error parsing results:`, err.message);
        }
    });

    console.log("Starting batch YouTube search with concurrency 3...");
    await batchExecute(tasks, 3);

    // Save updated database
    fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
    console.log(`\n=== YouTube Search Healing Summary ===`);
    console.log(`- Successfully healed YouTube links: ${healedCount}`);
}

run().catch(console.error);
