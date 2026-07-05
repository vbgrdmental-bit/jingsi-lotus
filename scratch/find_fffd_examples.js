const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

console.log("Total episodes:", rawEpisodes.length);

const fffdEpisodes = rawEpisodes.filter(ep => {
    const title = ep.title || "";
    const summary = ep.summary || "";
    const fullText = ep.full_text || "";
    return title.includes('\uFFFD') || summary.includes('\uFFFD') || fullText.includes('\uFFFD');
});

console.log("Episodes with \\uFFFD:", fffdEpisodes.length);

// Print details of the first 5
for (let i = 0; i < Math.min(5, fffdEpisodes.length); i++) {
    const ep = fffdEpisodes[i];
    console.log(`\n--- Episode ${ep.episode_id}: ${ep.title} ---`);
    if (ep.title.includes('\uFFFD')) {
        console.log(`Title contains FFFD: ${ep.title}`);
    }
    if (ep.summary.includes('\uFFFD')) {
        console.log(`Summary contains FFFD around:`);
        printContext(ep.summary);
    }
    if (ep.full_text.includes('\uFFFD')) {
        console.log(`Full text contains FFFD around:`);
        printContext(ep.full_text);
    }
}

function printContext(text) {
    let index = text.indexOf('\uFFFD');
    while (index !== -1) {
        const start = Math.max(0, index - 30);
        const end = Math.min(text.length, index + 30);
        console.log(`  ...${text.substring(start, end).replace(/\n/g, ' ')}...`);
        index = text.indexOf('\uFFFD', index + 1);
    }
}
