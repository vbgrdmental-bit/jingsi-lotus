const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const shortSummary = [];
const shortText = [];

rawEpisodes.forEach(ep => {
    const id = ep.episode_id;
    if (id >= 1870) return; // Skip placeholders

    const summary = ep.summary || '';
    const fullText = ep.full_text || '';

    if (summary.trim().length < 15) {
        shortSummary.push({ id, title: ep.title, text: summary });
    }
    if (fullText.trim().length < 100) {
        shortText.push({ id, title: ep.title, text: fullText });
    }
});

console.log("=== SHORT SUMMARY (< 15 chars) ===");
shortSummary.forEach(e => {
    console.log(`第 ${e.id} 集: ${e.title} (長度: ${e.text.length}) "${e.text}"`);
});

console.log("\n=== SHORT FULL TEXT (< 100 chars) ===");
shortText.forEach(e => {
    console.log(`第 ${e.id} 集: ${e.title} (長度: ${e.text.length}) "${e.text.substring(0, 100)}"`);
});
