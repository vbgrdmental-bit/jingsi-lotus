const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

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
        }
    });

    return result;
}

const topics = ['17162', '5994'];
topics.forEach(id => {
    const file = path.join(CACHE_DETAIL_DIR, `topic_${id}.html`);
    const html = fs.readFileSync(file, 'utf-8');
    const parsed = parseForumPost(html);
    console.log(`Topic ${id}: parsed length = ${parsed.full_text.length}, hasFffd = ${parsed.full_text.includes('\uFFFD')}`);
    let idx = parsed.full_text.indexOf('\uFFFD');
    if (idx !== -1) {
        console.log(`  FFFD found at ${idx}: "${parsed.full_text.substring(idx - 30, idx + 30)}"`);
    }
});
