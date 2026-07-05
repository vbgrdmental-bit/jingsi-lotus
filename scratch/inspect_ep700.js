const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');

const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));
const topics = forumTopics.filter(t => t.episode_id === 700);
topics.forEach(t => {
    const topicId = t.href.match(/\/t(\d+)-topic/)[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, 'utf-8');
        console.log(`Forum topic ${topicId} for Ep 700: hasFffd = ${html.includes('\uFFFD')}, size = ${html.length}`);
    } else {
        console.log(`Forum topic ${topicId} cache file NOT found!`);
    }
});
