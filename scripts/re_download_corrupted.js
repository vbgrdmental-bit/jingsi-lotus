const fs = require('fs');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');

const BASE_URL_WEEBLY = 'https://www.neptune-it.com';
const BASE_URL_FORUM = 'https://neptuner.666forum.com';

const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');
const CACHE_FORUM_DIR = path.join(__dirname, '../data/cache_forum');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch helper using Buffer.concat to prevent character truncation.
// Rejects on non-200 status codes (like 429) and retries automatically with backoff.
function fetchUrl(url, retries = 5, backoff = 2000) {
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            };
            https.get(url, options, (res) => {
                const { statusCode } = res;
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
                            : (url.includes('neptune-it') ? BASE_URL_WEEBLY : BASE_URL_FORUM) + res.headers.location;
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

// Batch executor to control concurrency
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

// Check if a cache file is corrupted
function isCorrupted(filePath) {
    if (!fs.existsSync(filePath)) return true;
    const stat = fs.statSync(filePath);
    if (stat.size < 2000) return true; // 429 page or empty is small
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.includes('\uFFFD');
}

// Extract Weebly nextPage link
function getWeeblyNextUrl(html) {
    const $ = cheerio.load(html);
    let nextUrl = '';
    const prevLink = $('.previous-link a, a:contains("上一步"), a:contains("Previous")').first();
    if (prevLink.length > 0) {
        let href = prevLink.attr('href');
        if (href) {
            nextUrl = href.startsWith('/') ? BASE_URL_WEEBLY + href : href;
        }
    } else {
        $('a').each((i, aEl) => {
            const href = $(aEl).attr('href') || '';
            const text = $(aEl).text();
            if (href.includes('previous') || text.includes('上一步')) {
                nextUrl = href.startsWith('/') ? BASE_URL_WEEBLY + href : href;
            }
        });
    }
    return nextUrl;
}

async function run() {
    console.log("=== STARTING CACHE HEALING & RE-DOWNLOAD ===");

    console.log("\n--- Part 1 & 2: Skipped (Already healed) ---");

    // ==========================================
    // Part 3: Heal Forum Detail Cache (data/cache_forum_detail)
    // ==========================================
    console.log("\n--- Part 3: Forum Detail Cache (data/cache_forum_detail) ---");
    if (fs.existsSync(CACHE_DETAIL_DIR)) {
        const detailFiles = fs.readdirSync(CACHE_DETAIL_DIR).filter(f => f.startsWith('topic_') && f.endsWith('.html'));
        console.log(`Found ${detailFiles.length} Forum detail cache files.`);

        const detailTasks = [];
        let detailCorruptedCount = 0;

        for (const file of detailFiles) {
            const filePath = path.join(CACHE_DETAIL_DIR, file);
            if (isCorrupted(filePath)) {
                detailCorruptedCount++;
                const topicId = file.match(/topic_(\d+)\.html/)[1];
                const url = `${BASE_URL_FORUM}/t${topicId}-topic`;

                detailTasks.push(async () => {
                    await delay(100); // Polite delay (100ms) to avoid rate limits
                    try {
                        console.log(`  [Forum Topic ${topicId}] Re-downloading...`);
                        const html = await fetchUrl(url);
                        if (!html.includes('429 Too Many Requests') && !html.includes('\uFFFD') && html.length > 5000) {
                            fs.writeFileSync(filePath, html, 'utf-8');
                            console.log(`  [Forum Topic ${topicId}] Healed successfully (Length: ${html.length}).`);
                        } else {
                            console.warn(`  [Forum Topic ${topicId}] Fetched content invalid or empty.`);
                        }
                    } catch (err) {
                        console.error(`  [Error] Failed to fetch Topic ${topicId}:`, err.message);
                    }
                });
            }
        }

        console.log(`Found ${detailCorruptedCount} corrupted Forum detail cache files.`);
        if (detailTasks.length > 0) {
            console.log(`Starting Forum detail re-downloads with concurrency 10 (Polite mode)...`);
            await batchExecute(detailTasks, 10);
            console.log(`Forum detail cache healing complete.`);
        } else {
            console.log(`No Forum detail cache files need healing.`);
        }
    }

    console.log("\n=== ALL CACHE HEALING COMPLETED ===");
}

run().catch(console.error);
