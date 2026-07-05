const fs = require('fs');
const path = require('path');
const cheerio = require('Cheerio');

const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');

const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));

function htmlToText(html) {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n');
    const $ = cheerio.load(text);
    return $.text().trim();
}

function parseForumPost(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const result = {
        summary: '',
        full_text: ''
    };

    $('.postbody').each((i, el) => {
        const html = $(el).html() || '';
        const text = htmlToText(html);
        if (!text) return;

        if (text.includes('證嚴上人開示') || text.includes('證嚴法師開示') || text.includes('上人開示') || text.includes('【證嚴上人開示】')) {
            if (text.length > result.full_text.length) {
                result.full_text = text;
            }
        } else if (text.includes('重點整理') || text.includes('開示重點') || text.includes('☉') || text.includes('•') || text.includes('⊙') || text.includes('※')) {
            const lines = text.split('\n');
            const summaryLines = [];
            lines.forEach(line => {
                const cleaned = line.trim().replace(/^[⊙☉※•]\s*/, '').trim();
                if (cleaned) {
                    summaryLines.push(cleaned);
                }
            });
            const summaryText = summaryLines.join('\n');
            if (summaryText.length > result.summary.length) {
                result.summary = summaryText;
            }
        }
    });

    if (!result.summary && result.full_text) {
        const lines = result.full_text.split('\n');
        const summaryLines = [];
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('☉') || trimmed.startsWith('⊙') || trimmed.startsWith('•') || trimmed.startsWith('※')) {
                const cleaned = trimmed.replace(/^[⊙☉※•]\s*/, '').trim();
                if (cleaned) {
                    summaryLines.push(cleaned);
                }
            }
        });
        if (summaryLines.length > 0) {
            result.summary = summaryLines.join('\n');
        }
    }

    return result;
}

const missingSummaryEps = [20, 23, 67, 273, 342, 343, 344, 345, 346, 349, 390, 409, 524, 529, 584];
const missingTextEps = [164, 166, 367, 1762];

console.log("=== CHECKING MISSING SUMMARIES ===");
missingSummaryEps.forEach(id => {
    const t = forumTopics.find(x => x.episode_id === id);
    if (!t) {
        console.log(`Ep ${id}: No forum topic found`);
        return;
    }
    const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
    if (!topicIdMatch) return;
    const topicId = topicIdMatch[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, 'utf-8');
        const parsed = parseForumPost(html);
        console.log(`Ep ${id}: Cache exists, parsed summary length = ${parsed.summary.length}, full text length = ${parsed.full_text.length}`);
    } else {
        console.log(`Ep ${id}: Cache file does not exist`);
    }
});

console.log("\n=== CHECKING MISSING TRANSCRIPTS ===");
missingTextEps.forEach(id => {
    const t = forumTopics.find(x => x.episode_id === id);
    if (!t) {
        console.log(`Ep ${id}: No forum topic found`);
        return;
    }
    const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
    if (!topicIdMatch) return;
    const topicId = topicIdMatch[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, 'utf-8');
        const parsed = parseForumPost(html);
        console.log(`Ep ${id}: Cache exists, parsed summary length = ${parsed.summary.length}, full text length = ${parsed.full_text.length}`);
    } else {
        console.log(`Ep ${id}: Cache file does not exist`);
    }
});
