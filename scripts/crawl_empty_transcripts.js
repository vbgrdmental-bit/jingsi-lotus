const fs = require('fs');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');

const BASE_URL = 'https://neptuner.666forum.com';
const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_DIR = path.join(__dirname, '../data/cache_forum_detail');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

if (!fs.existsSync(RAW_FILE) || !fs.existsSync(FORUM_FILE)) {
    console.error("Required data files not found.");
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
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

function htmlToText(html) {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n');
    const $ = cheerio.load(text);
    return $.text().trim();
}

function parseForumPost(html) {
    const $ = cheerio.load(html);
    const episode = {
        youtube_url: '',
        pdf_url: '',
        summary: '',
        full_text: ''
    };

    // 1. YouTube link
    $('iframe').each((i, el) => {
        const src = $(el).attr('src') || '';
        if (src.includes('youtube')) {
            const idMatch = src.match(/(?:embed\/|v=)([^?&]+)/);
            if (idMatch) {
                episode.youtube_url = `https://www.youtube.com/watch?v=${idMatch[1]}`;
            }
        }
    });

    // 2. Parse PDF Link if available
    $('a[href$=".pdf"]').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href && !episode.pdf_url) {
            episode.pdf_url = href.startsWith('/') ? BASE_URL + href : href;
        }
    });

    // 3. Parse posts semantically
    $('.postbody').each((i, el) => {
        const htmlContent = $(el).html() || '';
        const text = htmlToText(htmlContent);
        if (!text) return;

        // Transcript post
        if (text.includes('證嚴上人開示') || text.includes('證嚴法師開示') || text.includes('上人開示') || text.includes('【證嚴上人開示】')) {
            episode.full_text = text;
        } 
        // Outline post (points summary)
        else if (text.includes('重點整理') || text.includes('開示重點') || text.includes('☉') || text.includes('•') || text.includes('⊙')) {
            const lines = text.split('\n');
            const summaryLines = [];
            lines.forEach(line => {
                const cleaned = line.trim().replace(/^[⊙☉※•]\s*/, '').trim();
                if (cleaned) {
                    summaryLines.push(cleaned);
                }
            });
            episode.summary = summaryLines.join('\n');
        }
    });

    return episode;
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
    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));

    // Filter to get the newest topic for each episode
    const newestTopics = {};
    forumTopics.forEach(t => {
        const epId = t.episode_id;
        if (epId === null) return;
        if (!newestTopics[epId]) {
            newestTopics[epId] = t;
        } else {
            const currentNewest = newestTopics[epId];
            const currentDate = new Date(currentNewest.broadcast_date.replace(/\//g, '-'));
            const thisDate = new Date(t.broadcast_date.replace(/\//g, '-'));
            if (thisDate > currentDate) {
                newestTopics[epId] = t;
            }
        }
    });

    // Identify episodes with empty transcripts
    const emptyEpisodes = rawEpisodes.filter(ep => !ep.full_text || ep.full_text.trim() === '');
    console.log(`Found ${emptyEpisodes.length} episodes with empty transcripts.`);

    if (emptyEpisodes.length === 0) {
        console.log("All episodes already have transcripts.");
        return;
    }

    let crawlCount = 0;
    let successCount = 0;

    const tasks = emptyEpisodes.map(ep => async () => {
        const topic = newestTopics[ep.episode_id];
        if (!topic) {
            return;
        }

        crawlCount++;
        const topicIdMatch = topic.href.match(/\/t(\d+)-topic/);
        if (!topicIdMatch) return;
        const topicId = topicIdMatch[1];
        const cacheFile = path.join(CACHE_DIR, `topic_${topicId}.html`);
        let html = '';

        // Add a gentle sleep delay
        await delay(80);

        if (fs.existsSync(cacheFile)) {
            html = fs.readFileSync(cacheFile, 'utf-8');
        } else {
            try {
                const url = BASE_URL + topic.href;
                html = await fetchUrl(url);
                fs.writeFileSync(cacheFile, html, 'utf-8');
            } catch (err) {
                console.error(`  [Ep ${ep.episode_id}] Failed to fetch topic ${topicId}:`, err.message);
                return;
            }
        }

        try {
            const parsed = parseForumPost(html);
            if (parsed.full_text) {
                ep.full_text = parsed.full_text;
                successCount++;
            }
            if (parsed.summary) {
                ep.summary = parsed.summary;
            }
            if (parsed.youtube_url) {
                ep.youtube_url = parsed.youtube_url;
            }
            if (parsed.pdf_url) {
                ep.pdf_url = parsed.pdf_url;
            }
            console.log(`  [Ep ${ep.episode_id}] Successfully parsed transcript from forum.`);
        } catch (err) {
            console.error(`  [Ep ${ep.episode_id}] Error parsing HTML:`, err.message);
        }
    });

    console.log("Starting crawl batch with concurrency 10...");
    await batchExecute(tasks, 10);

    // Save updated database
    fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
    console.log(`Crawl complete. Successfully filled ${successCount} empty transcripts.`);
}

run().catch(console.error);
