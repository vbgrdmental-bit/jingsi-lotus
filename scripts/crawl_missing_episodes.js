const fs = require('fs');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');

const BASE_URL = 'https://neptuner.666forum.com';
const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_DIR = path.join(__dirname, '../data/cache_forum_detail');
const DELAY_MS = 200;

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };
        https.get(url, options, (res) => {
            if (res.statusCode === 404) return reject(new Error('404'));
            const chunks = [];
            res.on('data', (chunk) => { chunks.push(chunk); });
            res.on('end', () => { resolve(Buffer.concat(chunks).toString('utf-8')); });
        }).on('error', reject);
    });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        if (src.includes('youtube.com/embed/')) {
            const idMatch = src.match(/\/embed\/([^/?]+)/);
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
            // Clean up text
            episode.full_text = text;
        } 
        // Outline post (points summary)
        else if (text.includes('重點整理') || text.includes('開示重點') || text.includes('☉') || text.includes('•')) {
            // Clean up bullet lines
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

// Clean title markers
function cleanEpisodeTitle(title) {
    let clean = title.trim();
    // Remove date prefix (e.g. 20130319)
    clean = clean.replace(/^\d+[\/\-]?\d+[\/\-]?\d+\s*/, '').replace(/^\d+\s*/, '');
    // Remove 《靜思妙蓮華》
    clean = clean.replace(/[《【]靜思妙蓮華[》】]/g, '').replace(/[《【]靜思晨語[》】]/g, '').replace(/靜思晨語‧法華經/g, '');
    // Remove episode markers
    clean = clean.replace(/\(第\s*\d+\s*集\)/g, '').replace(/第\s*\d+\s*集/g, '').replace(/\(第\s*\d+\s*\)/g, '');
    // Remove chapter names in parentheses
    clean = clean.replace(/（法華經·[^（）]+）/g, '')
                 .replace(/（[^（）]*品[^（）]*）/g, '')
                 .replace(/\([^()]*品[^()]*\)/g, '');
    // Clean remaining symbols
    clean = clean.replace(/^[\s_—\-:\/·⊙]+|[\s_—\-:\/·⊙]+$/g, '').trim();
    return clean;
}

async function run() {
    if (!fs.existsSync(RAW_FILE)) {
        console.error("raw_episodes.json not found.");
        return;
    }
    if (!fs.existsSync(FORUM_FILE)) {
        console.error("forum_topics.json not found.");
        return;
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));

    console.log(`Loaded ${rawEpisodes.length} Weebly episodes.`);
    console.log(`Loaded ${forumTopics.length} forum topics.`);

    // Map forum topics by episode ID (keeping the oldest topic for each episode ID as the primary/correct source)
    const forumMap = {};
    forumTopics.forEach(t => {
        if (t.episode_id !== null) {
            const existing = forumMap[t.episode_id];
            if (!existing) {
                forumMap[t.episode_id] = t;
            } else {
                // If there are duplicates, pick the one with the earliest broadcast date (the original run)
                const existingDate = existing.broadcast_date ? new Date(existing.broadcast_date.replace(/\//g, '-')) : new Date();
                const newDate = t.broadcast_date ? new Date(t.broadcast_date.replace(/\//g, '-')) : new Date();
                if (newDate < existingDate) {
                    forumMap[t.episode_id] = t;
                }
            }
        }
    });

    // 1. Correct broadcast dates for existing episodes
    console.log("Correcting broadcast dates for existing episodes using forum original dates...");
    let dateCorrectionCount = 0;
    rawEpisodes.forEach(ep => {
        const forumEp = forumMap[ep.episode_id];
        if (forumEp && forumEp.broadcast_date) {
            if (ep.raw_date !== forumEp.broadcast_date) {
                ep.raw_date = forumEp.broadcast_date;
                dateCorrectionCount++;
            }
        }
    });
    console.log(`Updated ${dateCorrectionCount} broadcast dates to original Da Ai TV dates.`);

    // 2. Identify missing episode IDs
    const existingEpIds = new Set(rawEpisodes.map(ep => ep.episode_id));
    const missingEpIds = [];
    
    // Dynamically find the max episode ID in the forum topics
    let maxEpId = 1641;
    forumTopics.forEach(t => {
        if (t.episode_id && t.episode_id > maxEpId) {
            maxEpId = t.episode_id;
        }
    });
    console.log(`Max episode ID in forum is ${maxEpId}. Identifying missing episodes up to this ID.`);

    for (let id = 1; id <= maxEpId; id++) {
        if (!existingEpIds.has(id)) {
            missingEpIds.push(id);
        }
    }

    console.log(`Identified ${missingEpIds.length} missing episode numbers.`);

    // 3. Crawl missing episodes details from forum
    let crawlCount = 0;
    let successCount = 0;

    for (const missingId of missingEpIds) {
        const topic = forumMap[missingId];
        if (!topic) {
            // Not found on forum either
            continue;
        }

        crawlCount++;
        const topicId = topic.href.match(/\/t(\d+)-topic/)[1];
        const cacheFile = path.join(CACHE_DIR, `topic_${topicId}.html`);
        let html = '';

        console.log(`[Crawl ${crawlCount}] Parsing missing Episode ${missingId}: ${topic.title} (${topic.href})`);

        if (fs.existsSync(cacheFile)) {
            html = fs.readFileSync(cacheFile, 'utf-8');
        } else {
            try {
                const url = BASE_URL + topic.href;
                html = await fetchUrl(url);
                fs.writeFileSync(cacheFile, html, 'utf-8');
                await sleep(DELAY_MS);
            } catch (err) {
                console.error(`  Failed to fetch topic ${topicId}:`, err.message);
                continue;
            }
        }

        try {
            const parsed = parseForumPost(html);
            
            // Clean title
            const cleanTitle = cleanEpisodeTitle(topic.title);

            const newEpisode = {
                episode_id: missingId,
                title: cleanTitle,
                chapter_name: '', // Will be assigned by export.js ranges
                raw_date: topic.broadcast_date,
                youtube_url: parsed.youtube_url,
                pdf_url: parsed.pdf_url,
                summary: parsed.summary,
                full_text: parsed.full_text
            };

            rawEpisodes.push(newEpisode);
            successCount++;
        } catch (err) {
            console.error(`  Failed to parse topic ${topicId}:`, err);
        }
    }

    console.log(`Crawl completed. Added ${successCount} new episodes from forum.`);

    // Sort all episodes by ID and save
    rawEpisodes.sort((a, b) => a.episode_id - b.episode_id);
    fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
    console.log(`Saved merged database (${rawEpisodes.length} total episodes) to ${RAW_FILE}.`);
}

run().catch(console.error);
