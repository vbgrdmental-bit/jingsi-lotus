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

function parseForumPostHeuristic(htmlContent) {
    const $ = cheerio.load(htmlContent);
    let summaryLines = [];
    let transcriptLines = [];
    
    $('.postbody').each((i, el) => {
        const html = $(el).html() || '';
        const text = htmlToText(html);
        if (!text) return;

        const lines = text.split('\n');
        let isTranscript = false;
        
        // If the post explicitly contains a transcript marker, we can use it
        const hasExplicitMarker = text.includes('證嚴上人開示') || text.includes('證嚴法師開示') || text.includes('上人開示') || text.includes('【證嚴上人開示】');

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Skip title-like line if it's the very first line of the post
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
                    if (trimmed.startsWith('☉') || trimmed.startsWith('⊙') || trimmed.startsWith('•') || trimmed.startsWith('※')) {
                        const cleaned = trimmed.replace(/^[⊙☉※•]\s*/, '').trim();
                        if (cleaned) summaryLines.push(cleaned);
                    } else {
                        summaryLines.push(trimmed);
                    }
                }
            } else {
                // Heuristic mapping for posts without explicit markers
                if (trimmed.startsWith('☉') || trimmed.startsWith('⊙') || trimmed.startsWith('•') || trimmed.startsWith('※')) {
                    const cleaned = trimmed.replace(/^[⊙☉※•]\s*/, '').trim();
                    if (cleaned) summaryLines.push(cleaned);
                } else if (!isTranscript && trimmed.length > 80) {
                    isTranscript = true; // Transcript starts on first long paragraph
                    transcriptLines.push(trimmed);
                } else if (isTranscript) {
                    transcriptLines.push(trimmed);
                } else {
                    // Definition lines or short notes before transcript starts
                    summaryLines.push(trimmed);
                }
            }
        });
    });

    return {
        summary: summaryLines.join('\n'),
        full_text: transcriptLines.join('\n')
    };
}

const eps = [164, 166, 367, 1762];
eps.forEach(id => {
    const t = forumTopics.find(x => x.episode_id === id);
    const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
    const topicId = topicIdMatch[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, 'utf-8');
        const parsed = parseForumPostHeuristic(html);
        console.log(`Ep ${id}:`);
        console.log(`  Summary length:`, parsed.summary.length);
        console.log(`  Full Text length:`, parsed.full_text.length);
        console.log(`  Transcript preview (first 150 chars):`);
        console.log(`    ${parsed.full_text.substring(0, 150)}...`);
        console.log("-----------------------------------------");
    }
});
