const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const missingSummary = [];
const missingFullText = [];

rawEpisodes.forEach(ep => {
    const id = ep.episode_id;
    const title = ep.title || '';
    const summary = ep.summary || '';
    const fullText = ep.full_text || '';

    const isSummaryMissing = !summary.trim() || summary === "（本集尚無經文提綱）" || summary.includes("尚無經文提綱");
    const isTextMissing = !fullText.trim() || fullText.includes("此集暫無開示內容") || fullText.includes("暫無逐字稿");

    const isPlaceholder = id >= 1870 && (title.includes("待新增") || title.includes("待更新") || !title.trim());

    if (isSummaryMissing) {
        missingSummary.push({ id, title, isPlaceholder });
    }
    if (isTextMissing) {
        missingFullText.push({ id, title, isPlaceholder });
    }
});

console.log("=== MISSING SUMMARY (大綱) ===");
missingSummary.forEach(e => {
    console.log(`第 ${e.id} 集: ${e.title} ${e.isPlaceholder ? '(預留集數)' : ''}`);
});

console.log("\n=== MISSING FULL TEXT (逐字稿) ===");
missingFullText.forEach(e => {
    console.log(`第 ${e.id} 集: ${e.title} ${e.isPlaceholder ? '(預留集數)' : ''}`);
});
