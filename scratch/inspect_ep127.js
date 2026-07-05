const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');

// Find Weebly Ep 127
const weeblyFiles = fs.readdirSync(CACHE_WEEBLY_DIR).filter(f => f.startsWith('page_') && f.endsWith('.html'));
let weeblyEp = null;
weeblyFiles.forEach(file => {
    const html = fs.readFileSync(path.join(CACHE_WEEBLY_DIR, file), 'utf-8');
    const $ = cheerio.load(html);
    $('.blog-post').each((i, el) => {
        const titleText = $(el).find('.blog-title').text().trim();
        if (titleText.includes('127')) {
            weeblyEp = {
                file,
                title: titleText,
                summary: $(el).find('.paragraph').text().substring(0, 100)
            };
        }
    });
});
console.log("Weebly Ep 127:", weeblyEp);

// Find Forum Ep 127
const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));
const topics = forumTopics.filter(t => t.episode_id === 127);
topics.forEach(t => {
    const topicId = t.href.match(/\/t(\d+)-topic/)[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, 'utf-8');
        console.log(`Forum topic ${topicId} for Ep 127: hasFffd = ${html.includes('\uFFFD')}, size = ${html.length}`);
    } else {
        console.log(`Forum topic ${topicId} cache file NOT found!`);
    }
});
