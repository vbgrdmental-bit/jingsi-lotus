const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const BASE_URL_FORUM = 'https://neptuner.666forum.com';

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DETAIL_DIR)) {
    fs.mkdirSync(CACHE_DETAIL_DIR, { recursive: true });
}

// Polite delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if a cache file is corrupted
function isCorrupted(filePath) {
    if (!fs.existsSync(filePath)) return true;
    const stat = fs.statSync(filePath);
    if (stat.size < 2000) return true; // 429 page or empty is small
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.includes('\uFFFD');
}

// Robust fetch helper with retry and backoff
function fetchUrl(url, retries = 5, backoff = 2000) {
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const client = url.startsWith('https') ? https : http;
            client.get(url, (res) => {
                const statusCode = res.statusCode;
                if (statusCode === 429) {
                    res.resume();
                    if (retries > 0) {
                        console.warn(`      Rate limited (429) on ${url}. Retrying in ${backoff}ms... (${retries} retries left)`);
                        setTimeout(() => attempt(), backoff);
                        backoff *= 2;
                        retries--;
                    } else {
                        reject(new Error(`429 Rate Limited`));
                    }
                    return;
                }
                if (statusCode !== 200) {
                    res.resume();
                    if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
                        const redirectUrl = res.headers.location.startsWith('http') 
                            ? res.headers.location 
                            : BASE_URL_FORUM + res.headers.location;
                        return fetchUrl(redirectUrl, retries, backoff).then(resolve).catch(reject);
                    }
                    if (retries > 0 && statusCode >= 500) {
                        console.warn(`      Server error (${statusCode}). Retrying in ${backoff}ms...`);
                        setTimeout(() => attempt(), backoff);
                        backoff *= 2;
                        retries--;
                    } else {
                        reject(new Error(`Request Failed. Status Code: ${statusCode}`));
                    }
                    return;
                }
                
                const chunks = [];
                res.on('data', (chunk) => { chunks.push(chunk); });
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

// Concurrency batch executor
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
    console.log("=== STARTING TARGETED CACHE HEALING FOR REMAINING CORRUPTED EPISODES ===");

    if (!fs.existsSync(RAW_FILE) || !fs.existsSync(FORUM_FILE)) {
        console.error("Database or Forum files missing!");
        return;
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));

    // 1. Build Weebly existence map
    const weeblyMap = {};
    if (fs.existsSync(CACHE_WEEBLY_DIR)) {
        const cheerio = require('cheerio');
        const parseWeeblyTitle = (titleText) => {
            const decoded = titleText.trim();
            let epMatch = decoded.match(/第\s*(\d+)\s*集/);
            let episode_id = epMatch ? parseInt(epMatch[1], 10) : null;
            if (!episode_id) {
                const altMatch = decoded.match(/^(\d{4,12})-(\d+)/);
                if (altMatch) episode_id = parseInt(altMatch[2], 10);
            }
            return { episode_id };
        };

        const weeblyFiles = fs.readdirSync(CACHE_WEEBLY_DIR).filter(f => f.startsWith('page_') && f.endsWith('.html'));
        weeblyFiles.forEach(file => {
            const html = fs.readFileSync(path.join(CACHE_WEEBLY_DIR, file), 'utf-8');
            const $ = cheerio.load(html);
            $('.blog-post').each((i, el) => {
                const titleText = $(el).find('.blog-title').text().trim();
                const meta = parseWeeblyTitle(titleText);
                if (meta.episode_id) {
                    weeblyMap[meta.episode_id] = true;
                }
            });
        });
    }

    // 2. Identify corrupted episodes
    const corruptedEpisodes = rawEpisodes.filter(ep => {
        const title = ep.title || "";
        const summary = ep.summary || "";
        const fullText = ep.full_text || "";
        return title.includes('\uFFFD') || summary.includes('\uFFFD') || fullText.includes('\uFFFD');
    });

    console.log(`Corrupted episodes remaining: ${corruptedEpisodes.length}`);

    // 3. Find needed forum topics that are missing or corrupted
    const downloadQueue = [];
    const downloadTasks = [];
    const processedTopics = new Set();

    corruptedEpisodes.forEach(ep => {
        const id = ep.episode_id;
        if (weeblyMap[id]) {
            // Covered by Weebly - can be healed directly by parser re-execution
            return;
        }

        // Must be healed from forum
        const topics = forumTopics.filter(t => t.episode_id === id);
        topics.forEach(t => {
            const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
            if (!topicIdMatch) return;
            const topicId = topicIdMatch[1];

            if (processedTopics.has(topicId)) return;
            processedTopics.add(topicId);

            const filePath = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
            if (isCorrupted(filePath)) {
                downloadQueue.push({
                    episode_id: id,
                    topicId,
                    url: `${BASE_URL_FORUM}/t${topicId}-topic`,
                    filePath
                });
            }
        });
    });

    console.log(`Total forum topics that need downloading/healing: ${downloadQueue.length}`);

    if (downloadQueue.length === 0) {
        console.log("No forum topics need downloading. All cache files are present and clean!");
        return;
    }

    // Create tasks for download
    downloadQueue.forEach(item => {
        downloadTasks.push(async () => {
            await delay(1000); // Conservative 1s delay to be polite and avoid rate limits
            try {
                console.log(`  [Forum Topic ${item.topicId}] (Ep ${item.episode_id}) Downloading...`);
                const html = await fetchUrl(item.url);
                if (!html.includes('429 Too Many Requests') && !html.includes('\uFFFD') && html.length > 5000) {
                    fs.writeFileSync(item.filePath, html, 'utf-8');
                    console.log(`  [Forum Topic ${item.topicId}] Healed successfully (Length: ${html.length}).`);
                } else {
                    console.warn(`  [Forum Topic ${item.topicId}] Downloaded content invalid (size too small or contains 429).`);
                }
            } catch (err) {
                console.error(`  [Error] Failed to download Topic ${item.topicId}:`, err.message);
            }
        });
    });

    // Run downloader with concurrency 2 (very polite!)
    console.log(`Starting downloads with concurrency 2...`);
    await batchExecute(downloadTasks, 2);
    console.log("Targeted cache healing complete!");
}

run().catch(console.error);
