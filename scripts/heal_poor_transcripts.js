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

    // Filter poor episodes
    const poorEpisodes = rawEpisodes.filter(ep => 
        ep.full_text && (ep.full_text.length < 350 || ep.full_text.includes('感恩合十'))
    );

    console.log(`Healing ${poorEpisodes.length} episodes with poor/notes-only transcripts...`);

    let healedCount = 0;

    for (const ep of poorEpisodes) {
        const epId = ep.episode_id;
        const topic = newestTopics[epId];
        if (!topic) {
            console.log(`  [Ep ${epId}] No forum topic found, skipping.`);
            continue;
        }

        const topicIdMatch = topic.href.match(/\/t(\d+)-topic/);
        if (!topicIdMatch) continue;
        const topicId = topicIdMatch[1];
        const cacheFile = path.join(CACHE_DIR, `topic_${topicId}.html`);
        let html = '';

        if (fs.existsSync(cacheFile)) {
            html = fs.readFileSync(cacheFile, 'utf-8');
        } else {
            await delay(100);
            try {
                const url = BASE_URL + topic.href;
                html = await fetchUrl(url);
                fs.writeFileSync(cacheFile, html, 'utf-8');
            } catch (err) {
                console.error(`  [Ep ${epId}] Failed to fetch topic ${topicId}:`, err.message);
                continue;
            }
        }

        try {
            const parsed = parseForumPost(html);
            if (parsed.full_text && parsed.full_text.length >= 350 && !parsed.full_text.includes('感恩合十')) {
                ep.full_text = parsed.full_text;
                ep.summary = parsed.summary || ep.summary;
                if (parsed.youtube_url) ep.youtube_url = parsed.youtube_url;
                if (parsed.pdf_url) ep.pdf_url = parsed.pdf_url;
                console.log(`  [Ep ${epId}] Healed with full transcript (${parsed.full_text.length} chars).`);
                healedCount++;
            } else {
                // If the newest topic is also poor, check older topics in forum_topics.json
                const allEpTopics = forumTopics.filter(t => t.episode_id === epId && t.href !== topic.href);
                let foundAlt = false;

                for (const altTopic of allEpTopics) {
                    const altIdMatch = altTopic.href.match(/\/t(\d+)-topic/);
                    if (!altIdMatch) continue;
                    const altId = altIdMatch[1];
                    const altCacheFile = path.join(CACHE_DIR, `topic_${altId}.html`);
                    let altHtml = '';

                    if (fs.existsSync(altCacheFile)) {
                        altHtml = fs.readFileSync(altCacheFile, 'utf-8');
                    } else {
                        await delay(100);
                        try {
                            const url = BASE_URL + altTopic.href;
                            altHtml = await fetchUrl(url);
                            fs.writeFileSync(altCacheFile, altHtml, 'utf-8');
                        } catch (err) {
                            continue;
                        }
                    }

                    const altParsed = parseForumPost(altHtml);
                    if (altParsed.full_text && altParsed.full_text.length >= 350 && !altParsed.full_text.includes('感恩合十')) {
                        ep.full_text = altParsed.full_text;
                        ep.summary = altParsed.summary || ep.summary;
                        if (altParsed.youtube_url) ep.youtube_url = altParsed.youtube_url;
                        if (altParsed.pdf_url) ep.pdf_url = altParsed.pdf_url;
                        console.log(`  [Ep ${epId}] Healed using alternative topic ${altId} (${altParsed.full_text.length} chars).`);
                        healedCount++;
                        foundAlt = true;
                        break;
                    }
                }

                if (!foundAlt) {
                    console.log(`  [Ep ${epId}] Could not find full transcript in alternative topics.`);
                }
            }
        } catch (err) {
            console.error(`  [Ep ${epId}] Error parsing HTML:`, err.message);
        }
    }

    // Save updated database
    fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
    console.log(`\n=== Transcript Healing Summary ===`);
    console.log(`- Successfully healed transcripts: ${healedCount}`);
}

run().catch(console.error);
