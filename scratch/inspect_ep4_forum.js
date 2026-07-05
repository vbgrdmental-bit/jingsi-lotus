const fs = require('fs');
const path = require('path');

const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));
const ep4Topics = forumTopics.filter(t => t.episode_id === 4);
console.log("Topics mapped to Ep 4:", ep4Topics);
