const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const ep324 = rawEpisodes.find(e => e.episode_id === 324);
console.log("Ep 324 in DB:");
console.log("  Title:", ep324.title);
console.log("  Summary:", JSON.stringify(ep324.summary));
console.log("  Full Text Length:", ep324.full_text ? ep324.full_text.length : 0);
