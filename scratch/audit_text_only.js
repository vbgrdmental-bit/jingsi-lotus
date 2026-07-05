const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');

function runAudit() {
    if (!fs.existsSync(RAW_FILE)) {
        console.error("Missing file!");
        return;
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    console.log(`Starting text-only audit on ${rawEpisodes.length} episodes...`);

    const results = {
        gibberishIssues: []
    };

    rawEpisodes.forEach(ep => {
        const id = ep.episode_id;
        const title = ep.title ? ep.title.trim() : "";
        const summary = ep.summary ? ep.summary.trim() : "";
        const fullText = ep.full_text ? ep.full_text.trim() : "";

        if (title.includes('\uFFFD') || summary.includes('\uFFFD') || fullText.includes('\uFFFD')) {
            results.gibberishIssues.push(id);
        }
    });

    console.log(`Text-only audit complete. Remaining episodes with FFFD errors: ${results.gibberishIssues.length}`);
}

runAudit();
