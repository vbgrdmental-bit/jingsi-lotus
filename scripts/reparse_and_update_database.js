const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');

// Safe file reader that retries on EBUSY or EACCES (OneDrive file locks on Windows)
function readFileSyncSafe(filePath) {
    let retries = 5;
    while (retries > 0) {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (err) {
            if ((err.code === 'EBUSY' || err.code === 'EACCES') && retries > 1) {
                console.warn(`  [Warning] File busy or locked: ${filePath}. Retrying in 500ms...`);
                // Synchronous wait
                const start = Date.now();
                while (Date.now() - start < 500) {}
                retries--;
            } else {
                throw err;
            }
        }
    }
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

// Clean Weebly title
function parseWeeblyTitle(titleText) {
    const decoded = unescapeHtml(titleText).trim();
    let epMatch = decoded.match(/第\s*(\d+)\s*集/);
    let episode_id = epMatch ? parseInt(epMatch[1], 10) : null;
    if (!episode_id) {
        const altMatch = decoded.match(/^(\d{4,12})-(\d+)/);
        if (altMatch) {
            episode_id = parseInt(altMatch[2], 10);
        }
    }
    
    let cleanTitle = decoded;
    cleanTitle = cleanTitle.replace(/^\d+-\d+\s*/, '').replace(/^\d+\s*/, '');
    cleanTitle = cleanTitle.replace(/《靜思妙蓮華》/g, '');
    cleanTitle = cleanTitle.replace(/\(第\s*\d+\s*集\)/g, '').replace(/第\s*\d+\s*集/g, '');
    cleanTitle = cleanTitle.replace(/（法華經·[^（）]+）/g, '')
                           .replace(/（[^（）]*品[^（）]*）/g, '')
                           .replace(/\([^()]*品[^()]*\)/g, '');
    cleanTitle = cleanTitle.replace(/^[\s_—-]+|[\s_—-]+$/g, '').trim();

    return { episode_id, title: cleanTitle };
}

// Clean Forum title
function cleanForumTitle(title) {
    let clean = title.trim();
    clean = clean.replace(/^\d+[\/\-]?\d+[\/\-]?\d+\s*/, '').replace(/^\d+\s*/, '');
    clean = clean.replace(/[《【]靜思妙蓮華[》】]/g, '').replace(/[《【]靜思晨語[》】]/g, '').replace(/靜思晨語‧法華經/g, '');
    clean = clean.replace(/\(第\s*\d+\s*集\)/g, '').replace(/第\s*\d+\s*集/g, '').replace(/\(第\s*\d+\s*\)/g, '');
    clean = clean.replace(/（法華經·[^（）]+）/g, '')
                 .replace(/（[^（）]*品[^（）]*）/g, '')
                 .replace(/\([^()]*品[^()]*\)/g, '');
    clean = clean.replace(/^[\s_—\-:\/·⊙]+|[\s_—\-:\/·⊙]+$/g, '').trim();
    return clean;
}

// Parse single Weebly page HTML file
function parseWeeblyPage(filePath) {
    const htmlContent = readFileSyncSafe(filePath);
    const $ = cheerio.load(htmlContent);
    const posts = $('.blog-post');
    const results = [];

    posts.each((i, postEl) => {
        const $post = $(postEl);
        const rawTitleText = $post.find('.blog-title').text().trim();
        if (!rawTitleText) return;

        const meta = parseWeeblyTitle(rawTitleText);
        if (!meta.episode_id) return;

        const episode = {
            episode_id: meta.episode_id,
            title: meta.title,
            summary: '',
            full_text: ''
        };

        const $content = $post.find('.blog-content');
        const firstParagraph = $content.find('.paragraph').first();
        if (firstParagraph.length > 0) {
            const html = firstParagraph.html() || '';
            const lines = html.split(/<br\s*\/?>/i);
            const summaryLines = [];
            const transcriptLines = [];
            let isTranscript = false;

            lines.forEach(lineHtml => {
                const lineText = cheerio.load(lineHtml).text().trim();
                if (!lineText) return;

                if (lineText.startsWith('⊙')) {
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

        results.push(episode);
    });

    return results;
}

function htmlToText(html) {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n');
    const $ = cheerio.load(text);
    return $.text().trim();
}

// Parse single Forum detail HTML file using improved heuristic
function parseForumPost(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const summaryLines = [];
    const transcriptLines = [];

    $('.postbody').each((i, el) => {
        const html = $(el).html() || '';
        const text = htmlToText(html);
        if (!text) return;

        const lines = text.split('\n');
        let isTranscript = false;

        const hasExplicitMarker = text.includes('證嚴上人開示') || text.includes('證嚴法師開示') || text.includes('上人開示') || text.includes('【證嚴上人開示】');

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Skip title-like first line
            if (trimmed.includes('《靜思妙蓮華》') && trimmed.includes('集)')) {
                return;
            }

            if (hasExplicitMarker) {
                if (trimmed.includes('證嚴上人開示') || trimmed.includes('證嚴法師開示') || trimmed.includes('上人開示') || trimmed.includes('【證嚴上人開示】')) {
                    isTranscript = true;
                    return;
                }
                if (isTranscript) {
                    transcriptLines.push(trimmed);
                } else {
                    const cleaned = trimmed.replace(/^[⊙☉※•◎◎]\s*/, '').trim();
                    if (cleaned) summaryLines.push(cleaned);
                }
            } else {
                // Heuristic: if line length > 80, it starts the transcript
                if (!isTranscript && trimmed.length > 80 && !trimmed.startsWith('⊙') && !trimmed.startsWith('☉') && !trimmed.startsWith('◎') && !trimmed.startsWith('※') && !trimmed.startsWith('•')) {
                    isTranscript = true;
                }
                
                if (isTranscript) {
                    transcriptLines.push(trimmed);
                } else {
                    const cleaned = trimmed.replace(/^[⊙☉※•◎◎]\s*/, '').trim();
                    if (cleaned) summaryLines.push(cleaned);
                }
            }
        });
    });

    return {
        summary: summaryLines.join('\n'),
        full_text: transcriptLines.join('\n')
    };
}


// Parse clean title from the HTML content of the forum detail page
function parseForumTitleFromHtml(htmlContent) {
    const $ = cheerio.load(htmlContent);
    let rawTitle = '';
    $('.postbody').each((i, el) => {
        const text = htmlToText($(el).html() || '');
        if (text) {
            const lines = text.split('\n');
            if (lines.length > 0) {
                const candidate = lines[0].trim();
                // Ensure it looks like a title (contains episode details or broadcast date)
                if (candidate.includes('第') && candidate.includes('集') || candidate.includes('靜思妙蓮華')) {
                    rawTitle = candidate;
                    return false; // Break loop
                }
            }
        }
    });
    return rawTitle;
}

function run() {
    console.log("=== STARTING REPARSE AND DATABASE UPDATE ===");

    if (!fs.existsSync(RAW_FILE)) {
        console.error("Database file not found!");
        return;
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    console.log(`Loaded ${rawEpisodes.length} episodes from raw_episodes.json.`);

    // 1. Build Weebly Clean Map
    const weeblyMap = {};
    if (fs.existsSync(CACHE_WEEBLY_DIR)) {
        const weeblyFiles = fs.readdirSync(CACHE_WEEBLY_DIR).filter(f => f.startsWith('page_') && f.endsWith('.html'));
        console.log(`Parsing Weebly cache (${weeblyFiles.length} files)...`);
        weeblyFiles.forEach(file => {
            const filePath = path.join(CACHE_WEEBLY_DIR, file);
            const eps = parseWeeblyPage(filePath);
            eps.forEach(ep => {
                // Keep the one with longer full_text if duplicate occurs
                const existing = weeblyMap[ep.episode_id];
                if (!existing || ep.full_text.length > existing.full_text.length) {
                    weeblyMap[ep.episode_id] = ep;
                }
            });
        });
        console.log(`Weebly Clean Map compiled: ${Object.keys(weeblyMap).length} episodes.`);
    }

    // 2. Build Forum Clean Map
    const forumMap = {};
    if (fs.existsSync(FORUM_FILE) && fs.existsSync(CACHE_DETAIL_DIR)) {
        const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));
        console.log(`Parsing Forum detail cache (${forumTopics.length} topics mapped)...`);
        
        forumTopics.forEach(t => {
            if (t.episode_id === null) return;
            const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
            if (!topicIdMatch) return;
            const topicId = topicIdMatch[1];
            const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
            
            if (fs.existsSync(cacheFile)) {
                const htmlContent = readFileSyncSafe(cacheFile);
                const parsed = parseForumPost(htmlContent);
                
                const htmlTitle = parseForumTitleFromHtml(htmlContent);
                const rawTitleForCleaning = (htmlTitle && !htmlTitle.includes('\uFFFD')) ? htmlTitle : t.title;
                const cleanTitle = cleanForumTitle(rawTitleForCleaning);
                
                const existing = forumMap[t.episode_id];
                const cleanEp = {
                    episode_id: t.episode_id,
                    title: cleanTitle,
                    summary: parsed.summary,
                    full_text: parsed.full_text
                };

                // Pick the topic with the longest full_text for this episode ID
                if (!existing || cleanEp.full_text.length > existing.full_text.length) {
                    forumMap[t.episode_id] = cleanEp;
                }
            }
        });
        console.log(`Forum Clean Map compiled: ${Object.keys(forumMap).length} episodes.`);
    }

    // 3. Update raw_episodes.json where FFFD is present
    let titleRepairs = 0;
    let summaryRepairs = 0;
    let textRepairs = 0;
    let repairedEpisodeIds = new Set();

    rawEpisodes.forEach(ep => {
        const id = ep.episode_id;
        
        // Exclude placeholders at the end of the database
        if (id >= 1870) return;

        const hasFffdTitle = ep.title && ep.title.includes('\uFFFD');
        const hasFffdSummary = ep.summary && ep.summary.includes('\uFFFD');
        const hasFffdText = ep.full_text && ep.full_text.includes('\uFFFD');

        const isTitleMissing = !ep.title || !ep.title.trim() || ep.title.includes("待新增") || ep.title.includes("待更新");
        const isSummaryMissing = !ep.summary || ep.summary === "（本集尚無經文提綱）" || ep.summary.includes("尚無經文提綱");
        const isTextMissing = !ep.full_text || ep.full_text.includes("此集暫無開示內容") || ep.full_text.includes("暫無逐字稿");

        if (hasFffdTitle || hasFffdSummary || hasFffdText || isTitleMissing || isSummaryMissing || isTextMissing) {
            const weeblyEp = weeblyMap[id];
            const forumEp = forumMap[id];

            // 3a. Heal Title
            if (hasFffdTitle || isTitleMissing) {
                const cleanTitle = (weeblyEp && weeblyEp.title && !weeblyEp.title.includes('\uFFFD')) ? weeblyEp.title :
                                   (forumEp && forumEp.title && !forumEp.title.includes('\uFFFD')) ? forumEp.title : null;
                if (cleanTitle && cleanTitle !== ep.title) {
                    console.log(`  [Ep ${id}] Title repaired: "${ep.title}" -> "${cleanTitle}"`);
                    ep.title = cleanTitle;
                    titleRepairs++;
                    repairedEpisodeIds.add(id);
                }
            }

            // 3b. Heal Summary
            if (hasFffdSummary || isSummaryMissing) {
                const cleanSummary = (weeblyEp && weeblyEp.summary && !weeblyEp.summary.includes('\uFFFD') && weeblyEp.summary.length > 5) ? weeblyEp.summary :
                                     (forumEp && forumEp.summary && !forumEp.summary.includes('\uFFFD') && forumEp.summary.length > 5) ? forumEp.summary : null;
                if (cleanSummary && cleanSummary !== ep.summary) {
                    console.log(`  [Ep ${id}] Summary repaired (length ${(ep.summary || '').length} -> ${cleanSummary.length})`);
                    ep.summary = cleanSummary;
                    summaryRepairs++;
                    repairedEpisodeIds.add(id);
                }
            }

            // 3c. Heal Full Text (Transcript)
            if (hasFffdText || isTextMissing) {
                let cleanText = null;
                if (weeblyEp && weeblyEp.full_text && !weeblyEp.full_text.includes('\uFFFD') && weeblyEp.full_text.length >= 350) {
                    cleanText = weeblyEp.full_text;
                } else if (forumEp && forumEp.full_text && !forumEp.full_text.includes('\uFFFD') && forumEp.full_text.length >= 350) {
                    cleanText = forumEp.full_text;
                } else {
                    cleanText = (weeblyEp && weeblyEp.full_text && !weeblyEp.full_text.includes('\uFFFD') && weeblyEp.full_text.length > 10) ? weeblyEp.full_text :
                                (forumEp && forumEp.full_text && !forumEp.full_text.includes('\uFFFD') && forumEp.full_text.length > 10) ? forumEp.full_text : null;
                }

                if (cleanText && cleanText !== ep.full_text) {
                    console.log(`  [Ep ${id}] FullText repaired (length ${(ep.full_text || '').length} -> ${cleanText.length})`);
                    ep.full_text = cleanText;
                    textRepairs++;
                    repairedEpisodeIds.add(id);
                }
            }
        }
    });

    console.log(`\n=== REPAIR REPORT ===`);
    console.log(`- Total episodes with repairs applied: ${repairedEpisodeIds.size}`);
    console.log(`- Title repairs: ${titleRepairs}`);
    console.log(`- Summary repairs: ${summaryRepairs}`);
    console.log(`- FullText repairs: ${textRepairs}`);

    if (repairedEpisodeIds.size > 0) {
        fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
        console.log(`Successfully saved repaired database to ${RAW_FILE}.`);
    } else {
        console.log("No repairs were needed or could be applied.");
    }
}

run();
