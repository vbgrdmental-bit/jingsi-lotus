const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const ep4 = rawEpisodes.find(e => e.episode_id === 4);

console.log("Episode 4 details:");
console.log("  hasFffd:", ep4.full_text.includes('\uFFFD'));
console.log("  length:", ep4.full_text.length);

// Find the position of FFFD
let idx = ep4.full_text.indexOf('\uFFFD');
while (idx !== -1) {
    console.log(`  FFFD at index ${idx}: "${ep4.full_text.substring(idx - 30, idx + 30)}"`);
    idx = ep4.full_text.indexOf('\uFFFD', idx + 1);
}
