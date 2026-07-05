const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/raw_episodes.json');

function runTest() {
    const rawEpisodesOriginal = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    
    // Test Case 1: Normal Episode - Modify Transcript, check summary is preserved
    // Let's use Episode 186
    const ep186 = rawEpisodesOriginal.find(e => e.episode_id === 186);
    if (!ep186) {
        console.error("Episode 186 not found");
        return;
    }
    const originalSummary186 = ep186.summary;
    const originalTitle186 = ep186.title;

    console.log("=== Test Case 1: Normal Episode, edit full_text ===");
    console.log(`Original Summary 186 (len: ${originalSummary186.length}):`, JSON.stringify(originalSummary186));

    // Simulate server side save logic for mode === 'full_text'
    let ep = JSON.parse(JSON.stringify(ep186)); // Deep clone
    let payload = {
        episode_id: 186,
        mode: 'full_text',
        title: originalTitle186,
        summary: '', // Client doesn't need to send correct summary in full_text mode now
        full_text: 'New Transcript for 186 (修訂測試)',
        author: '測試人員',
        date: '2026/07/02'
    };

    // Server-side logic:
    if (payload.mode === 'full_text') {
        if (payload.full_text !== ep.full_text) {
            ep.full_text = payload.full_text;
            ep.is_edited = true;
            ep.edited_by = payload.author;
            ep.edited_date = payload.date;
        }
    }

    console.log(`Saved Summary 186 (len: ${ep.summary ? ep.summary.length : 0}):`, JSON.stringify(ep.summary));
    console.log(`Saved FullText 186:`, JSON.stringify(ep.full_text));
    
    if (ep.summary === originalSummary186) {
        console.log("🟢 PASS: Summary is preserved successfully!");
    } else {
        console.log("🔴 FAIL: Summary was lost or altered!");
    }


    // Test Case 2: Notes-Only Episode - Add Transcript (mode === 'full_text')
    // Let's use Episode 23 (notes-only, unedited)
    const ep23 = rawEpisodesOriginal.find(e => e.episode_id === 23);
    if (!ep23) {
        console.error("Episode 23 not found");
        return;
    }
    const originalNotes23 = ep23.full_text; // Notes are stored in full_text initially

    console.log("\n=== Test Case 2: Notes-Only Episode, edit full_text (add transcript) ===");
    console.log(`Original Notes 23 (len: ${originalNotes23.length}):`, JSON.stringify(originalNotes23));

    let ep2 = JSON.parse(JSON.stringify(ep23));
    payload = {
        episode_id: 23,
        mode: 'full_text',
        title: ep23.title,
        summary: '',
        full_text: '這是第23集新寫入的逐字稿全文',
        author: '測試人員',
        date: '2026/07/02'
    };

    // Server-side notes-only transition check:
    const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];
    const isNotesOnly = notesOnlyEpisodes.includes(ep2.episode_id) && !ep2.is_edited;

    if (payload.mode === 'full_text') {
        if (payload.full_text !== ep2.full_text) {
            if (isNotesOnly) {
                ep2.summary = ep2.full_text || ''; // Move old notes to summary
            }
            ep2.full_text = payload.full_text;
            ep2.is_edited = true;
            ep2.edited_by = payload.author;
            ep2.edited_date = payload.date;
        }
    }

    console.log(`Saved Summary 23 (Old Notes):`, JSON.stringify(ep2.summary));
    console.log(`Saved FullText 23 (New Transcript):`, JSON.stringify(ep2.full_text));

    if (ep2.summary === originalNotes23 && ep2.full_text === payload.full_text) {
        console.log("🟢 PASS: Notes-only transition succeeded! Old notes moved to summary, new transcript set to full_text.");
    } else {
        console.log("🔴 FAIL: Notes-only transition failed!");
    }


    // Test Case 3: Notes-Only Episode - Edit Notes (mode === 'summary')
    console.log("\n=== Test Case 3: Notes-Only Episode, edit summary (edit notes) ===");
    let ep3 = JSON.parse(JSON.stringify(ep23));
    payload = {
        episode_id: 23,
        mode: 'summary',
        title: ep23.title,
        summary: '修改後的心得與筆記大綱內容',
        full_text: '',
        author: '測試人員',
        date: '2026/07/02'
    };

    const isNotesOnly3 = notesOnlyEpisodes.includes(ep3.episode_id) && !ep3.is_edited;

    if (payload.mode === 'summary') {
        if (payload.summary !== ep3.summary) {
            ep3.summary = payload.summary;
            if (isNotesOnly3) {
                ep3.full_text = payload.summary; // Keep notes in full_text to match notes-only rendering
            }
            ep3.is_edited = true;
            ep3.edited_by = payload.author;
            ep3.edited_date = payload.date;
        }
    }

    console.log(`Saved Summary 23:`, JSON.stringify(ep3.summary));
    console.log(`Saved FullText 23:`, JSON.stringify(ep3.full_text));

    if (ep3.summary === payload.summary && ep3.full_text === payload.summary) {
        console.log("🟢 PASS: Notes-only summary edit succeeded! Both summary and full_text updated to match.");
    } else {
        console.log("🔴 FAIL: Notes-only summary edit failed!");
    }
}

runTest();
