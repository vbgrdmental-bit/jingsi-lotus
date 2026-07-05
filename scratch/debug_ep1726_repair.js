const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');

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
        } else if (text.includes('重點整理') || text.includes('開示重點') || text.includes('☉') || text.includes('•') || text.includes('⊙')) {
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

    return result;
}

const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));

const ep = rawEpisodes.find(e => e.episode_id === 1726);
console.log("Original Episode 1726 in DB:", {
    episode_id: ep.episode_id,
    title: ep.title,
    summaryLength: ep.summary ? ep.summary.length : 0,
    fullTextLength: ep.full_text ? ep.full_text.length : 0,
    hasFffdText: ep.full_text && ep.full_text.includes('\uFFFD')
});

const t = forumTopics.find(t => t.episode_id === 1726);
const topicId = t.href.match(/\/t(\d+)-topic/)[1];
const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);

const htmlContent = fs.readFileSync(cacheFile, 'utf-8');
const parsed = parseForumPost(htmlContent);

console.log("Parsed Forum Post details:");
console.log("  summaryLength:", parsed.summary.length);
console.log("  fullTextLength:", parsed.full_text.length);
console.log("  fullTextIncludesFFFD:", parsed.full_text.includes('\uFFFD'));

// Check logic
let cleanText = null;
if (parsed.full_text && !parsed.full_text.includes('\uFFFD') && parsed.full_text.length >= 350) {
    cleanText = parsed.full_text;
}
console.log("cleanText result:", cleanText ? cleanText.substring(0, 100) : "null");
