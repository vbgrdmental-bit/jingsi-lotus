const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');

const parseWeeblyTitle = (titleText) => {
    let epMatch = titleText.match(/第\s*(\d+)\s*集/);
    let episode_id = epMatch ? parseInt(epMatch[1], 10) : null;
    return episode_id;
};

// Check Weebly
const weeblyFiles = fs.readdirSync(CACHE_WEEBLY_DIR).filter(f => f.startsWith('page_') && f.endsWith('.html'));
let weeblyEpFound = null;
for (const file of weeblyFiles) {
    const html = fs.readFileSync(path.join(CACHE_WEEBLY_DIR, file), 'utf-8');
    const $ = cheerio.load(html);
    $('.blog-post').each((i, el) => {
        const titleText = $(el).find('.blog-title').text().trim();
        const epId = parseWeeblyTitle(titleText);
        if (epId === 10) {
            weeblyEpFound = {
                file,
                title: titleText,
                hasFffd: $(el).html().includes('\uFFFD')
            };
        }
    });
}
console.log("Weebly Ep 10 found:", weeblyEpFound);

// Check Forum
const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));
const topics = forumTopics.filter(t => t.episode_id === 10);
topics.forEach(t => {
    const topicId = t.href.match(/\/t(\d+)-topic/)[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, 'utf-8');
        console.log(`Forum topic ${topicId} for Ep 10: hasFffd = ${html.includes('\uFFFD')}, size = ${html.length}`);
    } else {
        console.log(`Forum topic ${topicId} cache file NOT found!`);
    }
});
