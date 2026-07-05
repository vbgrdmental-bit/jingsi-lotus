const fs = require('fs');
const path = require('path');
const https = require('https');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const REPORT_FILE = path.join(__dirname, '../data_audit_report.md');
const SEARCH_CACHE_DIR = path.join(__dirname, '../data/cache_yt_search');

if (!fs.existsSync(SEARCH_CACHE_DIR)) {
    fs.mkdirSync(SEARCH_CACHE_DIR, { recursive: true });
}

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// oEmbed status checker
function checkVideoStatus(videoId) {
    return new Promise((resolve) => {
        const checkUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        https.get(checkUrl, (res) => {
            if (res.statusCode === 200) {
                resolve(true);
            } else {
                resolve(false);
            }
        }).on('error', () => {
            resolve(false);
        });
    });
}

// Fetch helper with User-Agent
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
                        reject(new Error(`Status Code: ${statusCode}`));
                    }
                    return;
                }
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => { resolve(Buffer.concat(chunks).toString('utf-8')); });
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

// Parse invalid episodes from data_audit_report.md
function getInvalidEpisodesFromReport() {
    if (!fs.existsSync(REPORT_FILE)) {
        return [];
    }
    const content = fs.readFileSync(REPORT_FILE, 'utf-8');
    const lines = content.split('\n');
    const episodes = [];
    lines.forEach(line => {
        if (line.startsWith('|') && !line.includes('集數')) {
            const parts = line.split('|');
            if (parts.length >= 5) {
                const epIdStr = parts[1].trim();
                const reason = parts[4].trim();
                const epId = parseInt(epIdStr, 10);
                if (!isNaN(epId) && reason !== '無影片網址') {
                    episodes.push({ epId, reason });
                }
            }
        }
    });
    return episodes;
}

// Helper to clean strings for semantic matching
function cleanStringForMatching(str) {
    if (!str) return '';
    let clean = str.trim();
    // Remove dates (e.g. 20210519 or 2021/05/19 or 2021-05-19)
    clean = clean.replace(/^\d{4}[\/\-]?\d{2}[\/\-]?\d{2}/g, '');
    clean = clean.replace(/^\d{8}/g, '');
    
    // Remove program names and standard punctuation/spaces
    clean = clean.replace(/[《》【】「」『』（）()\[\]\s\-·:_。，、；：]/g, '');
    clean = clean.replace(/靜思妙蓮華/g, '').replace(/靜思晨語/g, '').replace(/法華經/g, '');
    
    // Remove chapter names (e.g. 信解品, 方便品, 藥草喻品)
    clean = clean.replace(/[^品]{2,5}品/g, '');
    
    // Remove episode numbers (e.g. 第123集, 123集)
    clean = clean.replace(/第?\d+集?/g, '');
    
    return clean;
}

async function searchYouTube(query, epId, cacheSuffix = '') {
    const cacheFile = path.join(SEARCH_CACHE_DIR, `search_${epId}${cacheSuffix}.html`);
    let html = '';

    if (fs.existsSync(cacheFile)) {
        html = fs.readFileSync(cacheFile, 'utf-8');
    } else {
        await delay(1200); // 1.2s polite delay when hitting live search
        try {
            const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            html = await fetchUrl(url);
            fs.writeFileSync(cacheFile, html, 'utf-8');
        } catch (err) {
            console.error(`  [Ep ${epId}] Failed to search YouTube for query "${query}":`, err.message);
            return [];
        }
    }

    try {
        const match = html.match(/ytInitialData\s*=\s*({.+?});/);
        if (!match) return [];
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
        return videoResults;
    } catch (err) {
        console.error(`  [Ep ${epId}] Error parsing results:`, err.message);
        return [];
    }
}

async function run() {
    console.log("=== STARTING AUTOMATED YOUTUBE VIDEO HEALING (SEMANTIC TITLE MATCHING) ===");

    const invalidEps = getInvalidEpisodesFromReport();
    console.log(`Found ${invalidEps.length} invalid/restricted videos from report.`);
    if (invalidEps.length === 0) {
        console.log("No invalid videos found to heal.");
        return;
    }

    console.log("Episodes to heal:", invalidEps.map(e => e.epId).join(', '));

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    let healedCount = 0;

    for (const item of invalidEps) {
        const epId = item.epId;
        const ep = rawEpisodes.find(e => e.episode_id === epId);
        if (!ep) continue;

        const dbTitleClean = cleanStringForMatching(ep.title);
        console.log(`\nProcessing Ep ${epId}... ("${ep.title}" -> Cleaned: "${dbTitleClean}")`);

        // Stage 1: Try searching by Title (most reliable for unique titles)
        let query = `靜思妙蓮華 ${ep.title}`;
        let videoResults = await searchYouTube(query, epId, '_title');

        // Stage 2: Fallback to searching by Episode Number
        if (videoResults.length === 0) {
            query = `靜思妙蓮華 第${epId}集`;
            videoResults = await searchYouTube(query, epId, '_num');
        }

        if (videoResults.length === 0) {
            console.warn(`  [Ep ${epId}] No video results found for either query.`);
            continue;
        }

        // Matching strategy
        let matchedCandidate = null;
        const targetMarker = `第${epId}集`;
        const targetMarkerAlt = `第 ${epId} 集`;
        const epRegex = new RegExp(`(?:\\b|[^\\d])${epId}(?:\\b|[^\\d])`);

        for (const v of videoResults) {
            const vTitleClean = cleanStringForMatching(v.title);
            
            // Check strict episode ID match
            const hasEpId = v.title.includes(targetMarker) || v.title.includes(targetMarkerAlt) || epRegex.test(v.title);
            
            // Check strict title match
            const hasTitleMatch = dbTitleClean && vTitleClean && (vTitleClean.includes(dbTitleClean) || dbTitleClean.includes(vTitleClean));

            if (hasEpId || hasTitleMatch) {
                // Verify with oEmbed
                console.log(`  [Ep ${epId}] Checking candidate: [${v.videoId}] "${v.title}" (Cleaned: "${vTitleClean}")`);
                const isPublic = await checkVideoStatus(v.videoId);
                if (isPublic) {
                    matchedCandidate = v;
                    break;
                } else {
                    console.log(`    Candidate video is not public, checking next...`);
                }
            }
        }

        if (matchedCandidate) {
            const newYt = `https://www.youtube.com/watch?v=${matchedCandidate.videoId}`;
            if (ep.youtube_url !== newYt) {
                console.log(`  [Ep ${epId}] Healed: ${ep.youtube_url} -> ${newYt} ("${matchedCandidate.title}")`);
                ep.youtube_url = newYt;
                healedCount++;
                // Save database progressively
                fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
            } else {
                console.log(`  [Ep ${epId}] Already using the best public link: ${newYt}`);
            }
        } else {
            console.warn(`  [Ep ${epId}] Could not find any matching working public video in search results.`);
        }
    }

    console.log(`\n=== HEALING SUMMARY ===`);
    console.log(`Successfully healed YouTube links: ${healedCount}`);
}

run().catch(console.error);
