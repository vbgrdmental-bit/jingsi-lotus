const fs = require('fs');
const path = require('path');

const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');

const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));
const missingFiles = [];

forumTopics.forEach(t => {
    if (t.episode_id === null) return;
    const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
    if (!topicIdMatch) return;
    const topicId = topicIdMatch[1];
    const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
    if (!fs.existsSync(cacheFile)) {
        missingFiles.push({
            episode_id: t.episode_id,
            topicId,
            href: t.href
        });
    }
});

console.log("Total missing cache files:", missingFiles.length);
if (missingFiles.length > 0) {
    console.log("First 20 missing files:", missingFiles.slice(0, 20));
}
