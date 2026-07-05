const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

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

function parseForumPostImproved(htmlContent) {
    const $ = cheerio.load(htmlContent);
    let summaryLines = [];
    let transcriptLines = [];

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

const missingSummaryEps = [20, 23, 67, 273, 342, 343, 344, 345, 346, 349, 390, 409, 524, 529, 584];
const missingTextEps = [164, 166, 367, 1762];

console.log("=== TESTING IMPROVED PARSER FOR MISSING SUMMARIES ===");
missingSummaryEps.forEach(id => {
    const t = forumTopics.find(x => x.episode_id === id);
    if (!t) return;
    const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
    const topicId = topicIdMatch[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, 'utf-8');
        const parsed = parseForumPostImproved(html);
        console.log(`Ep ${id}: summary len = ${parsed.summary.length}, text len = ${parsed.full_text.length}`);
        if (parsed.summary.length < 50) {
            console.log(`  [Warning] Short summary: "${parsed.summary}"`);
        }
    }
});

console.log("\n=== TESTING IMPROVED PARSER FOR MISSING TRANSCRIPTS ===");
missingTextEps.forEach(id => {
    const t = forumTopics.find(x => x.episode_id === id);
    if (!t) return;
    const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
    const topicId = topicIdMatch[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, 'utf-8');
        const parsed = parseForumPostImproved(html);
        console.log(`Ep ${id}: summary len = ${parsed.summary.length}, text len = ${parsed.full_text.length}`);
    }
});
