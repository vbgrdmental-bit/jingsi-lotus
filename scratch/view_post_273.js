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

const epId = 273;
const t = forumTopics.find(x => x.episode_id === epId);
const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
const topicId = topicIdMatch[1];
const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);

if (fs.existsSync(cacheFile)) {
    const htmlContent = fs.readFileSync(cacheFile, 'utf-8');
    const $ = cheerio.load(htmlContent);
    $('.postbody').each((i, el) => {
        const text = htmlToText($(el).html() || '');
        console.log(`Postbody ${i+1} (Length: ${text.length}):`);
        console.log(text.substring(0, 1500));
        console.log("-----------------------------------------");
    });
}
