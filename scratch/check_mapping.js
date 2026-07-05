const fs = require('fs');
const path = require('path');

const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));

const topic8963 = forumTopics.find(t => t.href.includes('t8963-topic'));
console.log("Topic 8963 in forum_topics.json:", topic8963);

const ep1726Topics = forumTopics.filter(t => t.episode_id === 1726);
console.log("Topics mapped to Ep 1726:", ep1726Topics);
