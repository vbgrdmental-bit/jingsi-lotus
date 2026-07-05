const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');

const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));
const topics = forumTopics.filter(t => t.episode_id === 1869);
console.log("Topics for Ep 1869:", topics);

topics.forEach(t => {
    const topicId = t.href.match(/\/t(\d+)-topic/)[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        console.log(`Cache file exists: ${cacheFile}`);
        const html = fs.readFileSync(cacheFile, 'utf-8');
        
        // Parse and check post contents
        const $ = cheerio.load(html);
        console.log("Number of postbodies:", $('.postbody').length);
        $('.postbody').each((i, el) => {
            const text = $(el).text().trim();
            console.log(`Post ${i} length: ${text.length}`);
            console.log(`Post ${i} preview: ${text.substring(0, 200).replace(/\n/g, ' ')}...`);
            console.log(`Post ${i} contains FFFD: ${text.includes('\uFFFD')}`);
        });
    } else {
        console.log(`Cache file does NOT exist: ${cacheFile}`);
    }
});
