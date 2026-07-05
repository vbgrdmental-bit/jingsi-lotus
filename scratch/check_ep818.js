const fs = require('fs');
const path = require('path');
const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const ep818 = rawEpisodes.find(e => e.episode_id === 818);
console.log("Ep 818 YouTube URL on disk:", ep818.youtube_url);
