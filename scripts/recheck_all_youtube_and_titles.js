const fs = require('fs');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const TOPICS_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_DIR = path.join(__dirname, '../data/cache_forum_detail');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

if (!fs.existsSync(RAW_FILE) || !fs.existsSync(TOPICS_FILE)) {
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

function cleanTitle(title) {
    if (!title) return '';
    let clean = title.trim();
    // 1. Remove date prefix (e.g. 20130319, 2013/03/19, 2013-03-19)
    clean = clean.replace(/^\d{4}[\/\-]?\d{2}[\/\-]?\d{2}\s*/, '');
    clean = clean.replace(/^\d{8}\s*/, '');
    clean = clean.replace(/^\d+\s*/, '');
    
    // 2. Remove program name variants
    clean = clean.replace(/[《【]靜思妙蓮華[》】]/g, '');
    clean = clean.replace(/[《【]靜思晨語[》】]/g, '');
    clean = clean.replace(/靜思晨語‧法華經/g, '');
    clean = clean.replace(/靜思妙蓮華/g, '');
    
    // 3. Remove episode markers
    clean = clean.replace(/\(第\s*\d+\s*集\)/g, '');
    clean = clean.replace(/第\s*\d+\s*集/g, '');
    clean = clean.replace(/\(第\s*\d+\s*\)/g, '');
    
    // 4. Remove chapter names in parentheses
    clean = clean.replace(/（法華經·[^（）]+）/g, '');
    clean = clean.replace(/（[^（）]*品[^（）]*）/g, '');
    clean = clean.replace(/\([^()]*品[^()]*\)/g, '');
    clean = clean.replace(/【[^【】]*品[^【】]*】/g, '');
    
    // 5. Remove empty parentheses of any kind (possibly left over)
    clean = clean.replace(/（\s*）/g, '');
    clean = clean.replace(/\(\s*\)/g, '');
    clean = clean.replace(/\[\s*\]/g, '');
    clean = clean.replace(/【\s*】/g, '');
    
    // 6. Clean remaining leading/trailing symbols
    clean = clean.replace(/^[\s_—\-:\/·⊙+》«<>《」「】「」『』☉*()（）]+|[\s_—\-:\/·⊙+》«<>《」「】「」『』☉*()（）]+$/g, '').trim();
    return clean;
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
    const forumTopics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));

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

    console.log(`Loaded ${rawEpisodes.length} episodes for global YouTube & Title update.`);

    let youtubeUpdated = 0;
    let titlesCleaned = 0;

    const tasks = rawEpisodes.map(ep => async () => {
        // 1. Clean Title
        const oldTitle = ep.title;
        const newTitle = cleanTitle(oldTitle);
        if (oldTitle !== newTitle) {
            ep.title = newTitle;
            titlesCleaned++;
        }

        // 2. Fetch/update YouTube URL
        const topic = newestTopics[ep.episode_id];
        if (!topic) {
            return;
        }

        const topicIdMatch = topic.href.match(/\/t(\d+)-topic/);
        if (!topicIdMatch) return;
        const topicId = topicIdMatch[1];
        const cacheFile = path.join(CACHE_DIR, `topic_${topicId}.html`);
        let html = '';

        if (fs.existsSync(cacheFile)) {
            html = fs.readFileSync(cacheFile, 'utf-8');
        } else {
            // Delay 250ms when hitting network to respect rate limits
            await delay(250);
            try {
                const url = `https://neptuner.666forum.com${topic.href}`;
                html = await fetchUrl(url);
                fs.writeFileSync(cacheFile, html, 'utf-8');
            } catch (err) {
                console.error(`  [Ep ${ep.episode_id}] Failed to fetch topic ${topicId}:`, err.message);
                return;
            }
        }

        try {
            const $ = cheerio.load(html);
            let ytUrl = null;

            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.includes('youtube')) {
                    const ytIdMatch = src.match(/(?:embed\/|v=)([^?&]+)/);
                    if (ytIdMatch) {
                        ytUrl = `https://www.youtube.com/watch?v=${ytIdMatch[1]}`;
                    }
                }
            });

            if (ytUrl) {
                const oldUrl = ep.youtube_url;
                if (oldUrl !== ytUrl) {
                    ep.youtube_url = ytUrl;
                    youtubeUpdated++;
                    console.log(`  [Ep ${ep.episode_id}] YouTube updated: ${oldUrl} -> ${ytUrl}`);
                }
            }
        } catch (err) {
            console.error(`  [Ep ${ep.episode_id}] Error parsing HTML:`, err.message);
        }
    });

    console.log("Starting master checking run with concurrency 5...");
    await batchExecute(tasks, 5);

    // Save updated database
    fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
    console.log(`\n=== Master Check Summary ===`);
    console.log(`- YouTube links updated: ${youtubeUpdated}`);
    console.log(`- Titles cleaned/standardized: ${titlesCleaned}`);
}

run().catch(console.error);
