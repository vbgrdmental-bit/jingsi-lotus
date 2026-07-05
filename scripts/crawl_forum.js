const fs = require('fs');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');

const BASE_URL = 'https://neptuner.666forum.com';
const CACHE_DIR = path.join(__dirname, '../data/cache_forum');
const OUTPUT_FILE = path.join(__dirname, '../data/forum_topics.json');
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

// Chinese numerals helper
function parseChineseNumeral(str) {
    const mapping = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
        '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15
    };
    return mapping[str] || null;
}

function parseForumTitle(titleText) {
    // Example: "20130319《靜思妙蓮華》求法傳法一念心(第3集)"
    // Example: "20200204《靜思妙蓮華》貪著利養斷功德本(第145)（法華經·序品第一)"
    // Example: "20130320《靜思妙蓮華》(第四集) 法華經序(三)"
    const decoded = titleText.trim();
    
    // 1. Extract 8-digit date prefix (broadcast date)
    const dateMatch = decoded.match(/^(\d{8})/);
    let broadcast_date = '';
    if (dateMatch) {
        const d = dateMatch[1];
        broadcast_date = `${d.substring(0, 4)}/${d.substring(4, 6)}/${d.substring(6, 8)}`;
    }

    // 2. Extract Episode ID
    let episode_id = null;
    
    // Check for pattern "第X集" or "第X"
    const epMatch = decoded.match(/第\s*(\d+)\s*集/) || 
                    decoded.match(/\(第\s*(\d+)\s*\)/) ||
                    decoded.match(/第\s*(\d+)\s*/) ||
                    decoded.match(/第\s*(\d+)集/);
    if (epMatch) {
        episode_id = parseInt(epMatch[1], 10);
    } else {
        // Check for Chinese numerals
        const chEpMatch = decoded.match(/第\s*([一二三四五六七八九十]+)\s*集/) || 
                          decoded.match(/\(第\s*([一二三四五六七八九十]+)集\)/) ||
                          decoded.match(/\(第\s*([一二三四五六七八九十]+)集\)/) ||
                          decoded.match(/第\s*([一二三四五六七八九十]+)集/);
        if (chEpMatch) {
            episode_id = parseChineseNumeral(chEpMatch[1]);
        }
    }

    // Fallback for older prefix format without explicit episode numbers but with sequence markers
    if (!episode_id) {
        if (decoded.includes('法華經序(二)')) episode_id = 2;
        else if (decoded.includes('法華經序(三)')) episode_id = 3;
        else if (decoded.includes('法華經序(四)')) episode_id = 4;
        else if (decoded.includes('法華經序(五)')) episode_id = 5;
    }

    return { episode_id, broadcast_date, rawTitle: decoded };
}

async function run() {
    let allTopics = [];
    
    console.log("Crawl forum lists starting...");
    
    // The forum has 72 pages, we crawl page 1 to 72
    for (let pageNum = 1; pageNum <= 72; pageNum++) {
        const startParam = (pageNum - 1) * 50;
        const url = pageNum === 1 
            ? `${BASE_URL}/f81-forum` 
            : `${BASE_URL}/f81p${startParam}-forum`;
            
        console.log(`[Page ${pageNum}/72] Crawling: ${url}`);
        const cacheFile = path.join(CACHE_DIR, `list_page_${pageNum}.html`);
        let htmlContent = '';

        if (fs.existsSync(cacheFile)) {
            htmlContent = fs.readFileSync(cacheFile, 'utf-8');
        } else {
            try {
                htmlContent = await fetchUrl(url);
                fs.writeFileSync(cacheFile, htmlContent, 'utf-8');
                await sleep(DELAY_MS);
            } catch (err) {
                console.error(`Error fetching page ${pageNum}:`, err.message);
                continue;
            }
        }

        const $ = cheerio.load(htmlContent);
        $('.topictitle a').each((i, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().trim().replace(/\s+/g, ' ');
            
            if (text.includes('靜思妙蓮華') || text.includes('靜思法華') || text.includes('法華經')) {
                const parsed = parseForumTitle(text);
                allTopics.push({
                    episode_id: parsed.episode_id,
                    broadcast_date: parsed.broadcast_date,
                    title: text,
                    href: href
                });
            }
        });
    }

    // Save topics mapping
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTopics, null, 2), 'utf-8');
    console.log(`Successfully compiled ${allTopics.length} forum topic links to ${OUTPUT_FILE}`);
}

run().catch(console.error);
