const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');

const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

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

// Check Episode 324
const epId = 324;
const epTopic = forumTopics.find(t => t.episode_id === epId);
console.log(`Ep ${epId} Topic:`, epTopic);

if (epTopic) {
    const topicIdMatch = epTopic.href.match(/\/t(\d+)-topic/);
    if (topicIdMatch) {
        const topicId = topicIdMatch[1];
        const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
        console.log(`Cache file path:`, cacheFile);
        if (fs.existsSync(cacheFile)) {
            const htmlContent = fs.readFileSync(cacheFile, 'utf-8');
            const parsed = parseForumPost(htmlContent);
            console.log(`Parsed Summary length:`, parsed.summary.length);
            console.log(`Parsed Summary content:`);
            console.log(parsed.summary);
            console.log(`Parsed Full Text length:`, parsed.full_text.length);
        } else {
            console.log("Cache file does not exist.");
        }
    }
}
