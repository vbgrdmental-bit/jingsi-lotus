const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const OUTPUT_DIR = path.join(__dirname, '../data/episodes');
const METADATA_FILE = path.join(__dirname, '../data/metadata.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 28 Chapters of the Lotus Sutra
const CHAPTERS = [
    { id: 1, name: "序品第一", range: [1, 185] },
    { id: 2, name: "方便品第二", range: [186, 456] },
    { id: 3, name: "譬喻品第三", range: [457, 722] },
    { id: 4, name: "信解品第四", range: [723, 866] },
    { id: 5, name: "藥草喻品第五", range: [867, 927] },
    { id: 6, name: "授記品第六", range: [928, 974] },
    { id: 7, name: "化城喻品第七", range: [975, 1104] },
    { id: 8, name: "五百弟子受記品第八", range: [1105, 1162] },
    { id: 9, name: "授學無學人記品第九", range: [1163, 1196] },
    { id: 10, name: "法師品第十", range: [1197, 1253] },
    { id: 11, name: "見寶塔品第十一", range: [1254, 1318] },
    { id: 12, name: "提婆達多品第十二", range: [1319, 1359] },
    { id: 13, name: "勸持品第十三", range: [1360, 1384] },
    { id: 14, name: "安樂行品第十四", range: [1385, 1457] },
    { id: 15, name: "從地涌出品第十五", range: [1458, 1506] },
    { id: 16, name: "如來壽量品第十六", range: [1507, 1555] },
    { id: 17, name: "分別功德品第十七", range: [1556, 1615] },
    { id: 18, name: "隨喜功德品第十八", range: [1616, 1650] },
    { id: 19, name: "法師功德品第十九", range: [1651, 1725] },
    { id: 20, name: "常不輕菩薩品第二十", range: [1726, 1762] },
    { id: 21, name: "如來神力品第二十一", range: [1763, 1796] },
    { id: 22, name: "囑累品第二十二", range: [1797, 1808] },
    { id: 23, name: "藥王菩薩本事品第二十三", range: [1809, 1999] }, // Estimated, will handle 1809+ in fallback
    { id: 24, name: "妙音菩薩品第二十四", range: [9999, 9999] },
    { id: 25, name: "觀世音菩薩普門品第二十五", range: [9999, 9999] },
    { id: 26, name: "陀羅尼品第二十六", range: [9999, 9999] },
    { id: 27, name: "妙莊嚴王本事品第二十七", range: [9999, 9999] },
    { id: 28, name: "普賢菩薩勸發品第二十八", range: [9999, 9999] }
];

function getChapterId(episode) {
    const epId = episode.episode_id;
    const chName = episode.chapter_name || '';

    // Method 1: Match by extracted chapter name keyword
    for (const ch of CHAPTERS) {
        // Strip suffixes to match keywords like "方便" or "序"
        const coreName = ch.name.replace('品第一', '').replace('品第二', '').replace('品第三', '').replace('品第四', '')
                                .replace('品第五', '').replace('品第六', '').replace('品第七', '').replace('品第八', '')
                                .replace('品第九', '').replace('品第', '').replace('品', '');
        if (chName.includes(coreName)) {
            return ch.id;
        }
    }

    // Method 2: Fallback to episode number range
    for (const ch of CHAPTERS) {
        if (ch.id === 23 && epId >= 1809) {
            // Chapter 23 is 1809 onwards (until we know chapter 24 starts)
            return 23;
        }
        if (epId >= ch.range[0] && epId <= ch.range[1]) {
            return ch.id;
        }
    }

    return 23; // Fallback to current ongoing chapter
}

function run() {
    if (!fs.existsSync(RAW_FILE)) {
        console.error(`Raw data file not found: ${RAW_FILE}. Run the crawler first!`);
        return;
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    console.log(`Loaded ${rawEpisodes.length} raw episodes.`);

    // Initialize chapter mapping buckets
    const chapterBuckets = {};
    CHAPTERS.forEach(ch => {
        chapterBuckets[ch.id] = [];
    });

    // Populate buckets
    rawEpisodes.forEach(ep => {
        const chId = getChapterId(ep);
        if (chapterBuckets[chId]) {
            // Unify date properties to ensure compatibility in UI
            ep.broadcast_date = ep.broadcast_date || ep.raw_date;
            // Inject chapter_id
            ep.chapter_id = chId;
            chapterBuckets[chId].push(ep);
        }
    });

    // 1. Export Chapter files and calculate totals
    const chaptersMeta = CHAPTERS.map(ch => {
        const eps = chapterBuckets[ch.id];
        
        // Sort episodes ascending by ID
        eps.sort((a, b) => a.episode_id - b.episode_id);

        // Write complete chapter JSON file
        const chFileName = path.join(OUTPUT_DIR, `chapter_${ch.id}.json`);
        fs.writeFileSync(chFileName, JSON.stringify(eps), 'utf-8');

        return {
            id: ch.id,
            name: ch.name,
            total_episodes: eps.length
        };
    });

    // 2. Export main metadata.json (index)
    // Extract lightweight headers to keep metadata file small
    const episodeHeaders = rawEpisodes.map(ep => {
        return {
            episode_id: ep.episode_id,
            chapter_id: ep.chapter_id,
            title: ep.title,
            broadcast_date: ep.raw_date,
            youtube_url: ep.youtube_url,
            pdf_url: ep.pdf_url,
            is_edited: ep.is_edited || false
        };
    });

    // Sort index headers
    episodeHeaders.sort((a, b) => a.episode_id - b.episode_id);

    const metadata = {
        chapters: chaptersMeta,
        episodes: episodeHeaders,
        last_updated: new Date().toISOString()
    };

    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata), 'utf-8');

    console.log(`Compilation complete:`);
    console.log(`  - Exported 28 chapter files to ${OUTPUT_DIR}`);
    console.log(`  - Exported metadata index to ${METADATA_FILE}`);
    
    // Print out summary
    chaptersMeta.forEach(ch => {
        if (ch.total_episodes > 0) {
            console.log(`  - ${ch.name}: ${ch.total_episodes} episodes`);
        }
    });
}

if (require.main === module) {
    run();
}

module.exports = { run };
