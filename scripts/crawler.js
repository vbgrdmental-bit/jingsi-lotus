const fs = require('fs');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');

// Configuration
const BASE_URL = 'https://www.neptune-it.com';
const START_URL = `${BASE_URL}/master-dharma-learning-club.html`;
const CACHE_DIR = path.join(__dirname, '../data/cache');
const DATA_FILE = path.join(__dirname, '../data/raw_episodes.json');
const DELAY_MS = 200; // Polite delay between HTTP requests

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Helper to decode HTML entities
function unescapeHtml(htmlStr) {
    if (!htmlStr) return '';
    return htmlStr
        .replace(/&nbsp;/g, ' ')
        .replace(/&middot;/g, '·')
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Helper to fetch URL content with Node https
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };
        https.get(url, options, (res) => {
            if (res.statusCode === 404) {
                return reject(new Error(`404 Not Found: ${url}`));
            }
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Handle redirect
                const redirectUrl = res.headers.location.startsWith('http') 
                    ? res.headers.location 
                    : BASE_URL + res.headers.location;
                return fetchUrl(redirectUrl).then(resolve).catch(reject);
            }
            
            const chunks = [];
            res.on('data', (chunk) => { chunks.push(chunk); });
            res.on('end', () => { resolve(Buffer.concat(chunks).toString('utf-8')); });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Parse title text to extract structured metadata
function parseEpisodeTitle(titleText) {
    // Example: "20241110-1641《靜思妙蓮華》心平舒坦 喻真誠相 (第1641集) （法華經·隨喜功德品第十八）"
    const decoded = unescapeHtml(titleText).trim();
    
    // 1. Episode ID
    let epMatch = decoded.match(/第\s*(\d+)\s*集/);
    let episode_id = epMatch ? parseInt(epMatch[1], 10) : null;
    if (!episode_id) {
        const altMatch = decoded.match(/^(\d{4,12})-(\d+)/);
        if (altMatch) {
            episode_id = parseInt(altMatch[2], 10);
        }
    }
    
    // 2. Chapter name (e.g. 隨喜功德品第十八)
    let chapter_name = '';
    const chMatch = decoded.match(/（法華經·([^（）]+)）/) || 
                    decoded.match(/（法華經·([^（）]+)）/) ||
                    decoded.match(/（法華經·([^（）]+)）/) ||
                    decoded.match(/（([^（）]*品[^（）]*)）/) ||
                    decoded.match(/\(([^()]*品[^()]*)\)/);
    if (chMatch) {
        chapter_name = chMatch[1].replace('法華經·', '').trim();
    } else {
        // Default mapping fallback if name contains specific keywords
        if (decoded.includes('序品')) chapter_name = '序品第一';
        else if (decoded.includes('方便品')) chapter_name = '方便品第二';
        else if (decoded.includes('譬喻品')) chapter_name = '譬喻品第三';
        else if (decoded.includes('信解品')) chapter_name = '信解品第四';
        else if (decoded.includes('藥草喻品')) chapter_name = '藥草喻品第五';
        else if (decoded.includes('授記品')) chapter_name = '授記品第六';
        else if (decoded.includes('化城喻品')) chapter_name = '化城喻品第七';
        else if (decoded.includes('五百弟子')) chapter_name = '五百弟子受記品第八';
        else if (decoded.includes('授學無學')) chapter_name = '授學無學人記品第九';
        else if (decoded.includes('法師品')) chapter_name = '法師品第十';
        else if (decoded.includes('見寶塔品')) chapter_name = '見寶塔品第十一';
        else if (decoded.includes('提婆達多')) chapter_name = '提婆達多品第十二';
        else if (decoded.includes('勸持品') || decoded.includes('持品')) chapter_name = '持品第十三';
        else if (decoded.includes('安樂行品')) chapter_name = '安樂行品第十四';
        else if (decoded.includes('從地涌出')) chapter_name = '從地涌出品第十五';
        else if (decoded.includes('如來壽量')) chapter_name = '如來壽量品第十六';
        else if (decoded.includes('分別功德')) chapter_name = '分別功德品第十七';
        else if (decoded.includes('隨喜功德')) chapter_name = '隨喜功德品第十八';
        else if (decoded.includes('法師功德')) chapter_name = '法師功德品第十九';
        else if (decoded.includes('常不輕')) chapter_name = '常不輕菩薩品第二十';
        else if (decoded.includes('如來神力')) chapter_name = '如來神力品第二十一';
        else if (decoded.includes('囑累品')) chapter_name = '囑累品第二十二';
        else if (decoded.includes('藥王菩薩')) chapter_name = '藥王菩薩本事品第二十三';
    }

    // 3. Clean Title
    let cleanTitle = decoded;
    // Remove date prefix (e.g. 20241110-1641 or 20240327)
    cleanTitle = cleanTitle.replace(/^\d+-\d+\s*/, '').replace(/^\d+\s*/, '');
    // Remove 《靜思妙蓮華》
    cleanTitle = cleanTitle.replace(/《靜思妙蓮華》/g, '');
    // Remove episode markers
    cleanTitle = cleanTitle.replace(/\(第\s*\d+\s*集\)/g, '').replace(/第\s*\d+\s*集/g, '');
    // Remove chapter markers
    cleanTitle = cleanTitle.replace(/（法華經·[^（）]+）/g, '')
                           .replace(/（[^（）]*品[^（）]*）/g, '')
                           .replace(/\([^()]*品[^()]*\)/g, '');
    // Clean up extra symbols
    cleanTitle = cleanTitle.replace(/^[\s_—-]+|[\s_—-]+$/g, '').trim();

    return { episode_id, chapter_name, title: cleanTitle };
}

// Main page crawler
async function crawl() {
    let pageNum = 1;
    let currentUrl = START_URL;
    let allEpisodes = [];
    
    // Load existing data if available
    if (fs.existsSync(DATA_FILE)) {
        try {
            allEpisodes = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            console.log(`Loaded ${allEpisodes.length} existing episodes from database.`);
        } catch (e) {
            console.log("Failed to load existing raw episodes, starting fresh.");
        }
    }

    const scrapedEpisodeIds = new Set(allEpisodes.map(ep => ep.episode_id).filter(id => id !== null));

    console.log("Starting Jing Si Lotus Sutra crawler...");
    
    while (currentUrl) {
        console.log(`[Page ${pageNum}] Crawling: ${currentUrl}`);
        const cacheFile = path.join(CACHE_DIR, `page_${pageNum}.html`);
        let htmlContent = '';

        // Read from cache if exists
        if (fs.existsSync(cacheFile)) {
            htmlContent = fs.readFileSync(cacheFile, 'utf-8');
            // console.log(`  Loaded from local cache.`);
        } else {
            try {
                htmlContent = await fetchUrl(currentUrl);
                fs.writeFileSync(cacheFile, htmlContent, 'utf-8');
                console.log(`  Fetched from web, saved to cache.`);
                await sleep(DELAY_MS); // Polite delay
            } catch (err) {
                console.error(`Error fetching page ${pageNum}:`, err.message);
                break;
            }
        }

        const $ = cheerio.load(htmlContent);
        const posts = $('.blog-post');
        
        if (posts.length === 0) {
            console.log(`  No blog posts found on page ${pageNum}. Stopping.`);
            break;
        }

        let newEpisodesOnPage = 0;

        posts.each((i, postEl) => {
            const $post = $(postEl);
            const rawTitleText = $post.find('.blog-title').text().trim();
            const rawDateText = $post.find('.blog-date').text().trim();
            
            if (!rawTitleText) return;

            // Parse metadata
            const meta = parseEpisodeTitle(rawTitleText);
            if (!meta.episode_id) {
                console.log(`  Skipping item without episode ID: "${rawTitleText}"`);
                return;
            }

            // Skip if already scraped in a previous page
            if (scrapedEpisodeIds.has(meta.episode_id)) {
                // update details if needed, but let's avoid duplicates in console
                return;
            }

            const episode = {
                episode_id: meta.episode_id,
                title: meta.title,
                chapter_name: meta.chapter_name,
                raw_date: rawDateText,
                youtube_url: '',
                pdf_url: '',
                summary: '',
                full_text: ''
            };

            const $content = $post.find('.blog-content');

            // 1. YouTube link
            const iframeSrc = $content.find('iframe').attr('src') || '';
            if (iframeSrc) {
                const ytMatch = iframeSrc.match(/\/embed\/([^/?]+)/);
                if (ytMatch) {
                    episode.youtube_url = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
                }
            }

            // 2. PDF Download link
            const pdfLink = $content.find('a[href$=".pdf"]').first();
            if (pdfLink.length > 0) {
                let href = pdfLink.attr('href');
                if (href.startsWith('/')) {
                    href = BASE_URL + href;
                }
                episode.pdf_url = href;
            }

            // 3. Extract Outline and Transcript
            const firstParagraph = $content.find('.paragraph').first();
            if (firstParagraph.length > 0) {
                const html = firstParagraph.html() || '';
                // Split by <br> or <br/> or <p> tags
                const lines = html.split(/<br\s*\/?>/i);
                const summaryLines = [];
                const transcriptLines = [];
                let isTranscript = false;

                lines.forEach(lineHtml => {
                    const lineText = cheerio.load(lineHtml).text().trim();
                    if (!lineText) return;

                    if (lineText.startsWith('⊙')) {
                        // Outline bullet
                        const cleaned = lineText.replace(/^⊙\s*/, '');
                        if (cleaned) summaryLines.push(cleaned);
                    } else if (lineText.includes('【證嚴上人開示】')) {
                        isTranscript = true;
                    } else {
                        if (isTranscript) {
                            transcriptLines.push(lineText);
                        }
                    }
                });

                episode.summary = summaryLines.join('\n');
                episode.full_text = transcriptLines.join('\n');
            }

            allEpisodes.push(episode);
            scrapedEpisodeIds.add(episode.episode_id);
            newEpisodesOnPage++;
        });

        console.log(`  Parsed ${newEpisodesOnPage} new episodes from page ${pageNum} (Total: ${allEpisodes.length})`);

        // Find previous page link
        // Typically a link containing "previous" or text containing "上一步" or "Previous"
        let nextUrl = '';
        const prevLink = $('.previous-link a, a:contains("上一步"), a:contains("Previous")').first();
        if (prevLink.length > 0) {
            let href = prevLink.attr('href');
            if (href) {
                if (href.startsWith('/')) {
                    href = BASE_URL + href;
                }
                nextUrl = href;
            }
        } else {
            // Alternative: look through all links for previous/pageNum
            $('a').each((i, aEl) => {
                const href = $(aEl).attr('href') || '';
                const text = $(aEl).text();
                if (href.includes('previous') || text.includes('上一步')) {
                    let fullHref = href.startsWith('/') ? BASE_URL + href : href;
                    if (fullHref !== currentUrl) {
                        nextUrl = fullHref;
                    }
                }
            });
        }

        // Prevent going backward or infinite loops
        if (nextUrl) {
            const nextPageMatch = nextUrl.match(/previous\/(\d+)/);
            if (nextPageMatch) {
                const nextPageNum = parseInt(nextPageMatch[1], 10);
                if (nextPageNum <= pageNum) {
                    console.log(`  Next page (${nextPageNum}) is a backward or duplicate link compared to current page (${pageNum}). Stopping.`);
                    nextUrl = '';
                }
            }
        }

        if (nextUrl === currentUrl || !nextUrl) {
            console.log(`No more pagination link found. Crawl completed.`);
            break;
        }

        currentUrl = nextUrl;
        pageNum++;
    }

    // Save sorted data
    allEpisodes.sort((a, b) => a.episode_id - b.episode_id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(allEpisodes, null, 2), 'utf-8');
    console.log(`Saved all ${allEpisodes.length} episodes to ${DATA_FILE}.`);
}

crawl().catch(console.error);
