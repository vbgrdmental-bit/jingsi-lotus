const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const ep273 = rawEpisodes.find(e => e.episode_id === 273);

const summary = ep273.summary || "";
const isMissing = !summary || summary === "（本集尚無經文提綱）" || summary.includes("尚無經文提綱");
console.log("Ep 273 summary is missing?", isMissing);
console.log("Summary:", JSON.stringify(summary));
