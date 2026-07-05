const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const ep324 = rawEpisodes.find(e => e.episode_id === 324);

const summary = ep324.summary || "";
const isMissing = !summary || summary === "（本集尚無經文提綱）" || summary.includes("尚無經文提綱");
console.log("Ep 324 summary is missing?", isMissing);
console.log("Length of summary:", summary.length);
console.log("Summary:", JSON.stringify(summary));
