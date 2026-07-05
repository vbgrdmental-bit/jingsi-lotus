const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');

function run() {
    if (!fs.existsSync(RAW_FILE)) {
        console.error(`Raw file not found at: ${RAW_FILE}`);
        return;
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    const existingIds = new Set(rawEpisodes.map(e => e.episode_id));
    
    const missingIds = [];
    const maxEpisode = 1885;
    
    for (let i = 1; i <= maxEpisode; i++) {
        if (!existingIds.has(i)) {
            missingIds.push(i);
        }
    }
    
    console.log(`Found ${missingIds.length} missing episodes:`, missingIds);
    
    if (missingIds.length === 0) {
        console.log("No missing episodes to insert!");
        return;
    }
    
    // Create placeholders
    missingIds.forEach(id => {
        rawEpisodes.push({
            episode_id: id,
            title: "（待新增）",
            chapter_name: "",
            summary: "",
            full_text: "（此集暫無開示內容，請點選右上角「修改大綱」或「修改逐字稿」按鈕以手動輸入內容）",
            is_edited: false,
            edited_by: "",
            edited_date: ""
        });
    });
    
    // Sort array by episode_id ascending
    rawEpisodes.sort((a, b) => a.episode_id - b.episode_id);
    
    // Save back to disk
    fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
    console.log(`Successfully inserted ${missingIds.length} placeholders into raw_episodes.json!`);
    
    // Run compiler
    try {
        const exportScript = require('./export.js');
        exportScript.run();
        console.log("Database successfully compiled with placeholders!");
    } catch (err) {
        console.error("Failed to compile database:", err.message);
    }
}

run();
