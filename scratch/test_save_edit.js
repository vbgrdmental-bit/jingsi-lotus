const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/raw_episodes.json');

function testSaveEdit(mode, newText) {
    const rawEpisodes = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const ep = rawEpisodes.find(e => e.episode_id === 164);
    if (!ep) {
        console.log("Episode 164 not found");
        return;
    }

    console.log("Original ep 164:");
    console.log("  Summary length:", ep.summary ? ep.summary.length : 0);
    console.log("  FullText length:", ep.full_text ? ep.full_text.length : 0);

    // Simulate payload creation in app.js
    let title = ep.title || '';
    let summary = ep.summary || '';
    let full_text = ep.full_text || '';

    if (mode === 'summary') {
        summary = newText;
    } else if (mode === 'full_text') {
        full_text = newText;
    }

    const payload = {
        episode_id: 164,
        title: title,
        summary: summary,
        full_text: full_text,
        author: "Test User",
        date: "2026/07/01"
    };

    // Simulate server.js handler
    const epInDb = rawEpisodes.find(e => e.episode_id === Number(payload.episode_id));
    if (epInDb) {
        const titleModified = payload.title && payload.title.trim() !== epInDb.title.trim();
        const contentModified = (payload.summary !== undefined && payload.summary !== epInDb.summary) || 
                                (payload.full_text !== undefined && payload.full_text !== epInDb.full_text);
        
        if (titleModified) {
            epInDb.title = payload.title.trim();
        }
        
        if (contentModified) {
            epInDb.summary = payload.summary;
            epInDb.full_text = payload.full_text;
            epInDb.is_edited = true;
            epInDb.edited_by = payload.author;
            epInDb.edited_date = payload.date;
        }
    }

    console.log("Simulated saved ep 164:");
    console.log("  Summary length:", epInDb.summary ? epInDb.summary.length : 0);
    console.log("  FullText length:", epInDb.full_text ? epInDb.full_text.length : 0);
}

testSaveEdit('full_text', 'New Transcript Content');
