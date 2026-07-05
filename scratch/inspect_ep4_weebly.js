const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');

const parseWeeblyTitle = (titleText) => {
    const decoded = titleText.trim();
    let epMatch = decoded.match(/第\s*(\d+)\s*集/);
    let episode_id = epMatch ? parseInt(epMatch[1], 10) : null;
    if (!episode_id) {
        const altMatch = decoded.match(/^(\d{4,12})-(\d+)/);
        if (altMatch) episode_id = parseInt(altMatch[2], 10);
    }
    return { episode_id };
};

const weeblyFiles = fs.readdirSync(CACHE_WEEBLY_DIR).filter(f => f.startsWith('page_') && f.endsWith('.html'));
weeblyFiles.forEach(file => {
    const html = fs.readFileSync(path.join(CACHE_WEEBLY_DIR, file), 'utf-8');
    const $ = cheerio.load(html);
    $('.blog-post').each((i, el) => {
        const titleText = $(el).find('.blog-title').text().trim();
        const meta = parseWeeblyTitle(titleText);
        if (meta.episode_id === 4) {
            console.log(`Found Ep 4 in Weebly file: ${file}`);
            const fullText = $(el).find('.blog-content').text().trim();
            console.log("  Weebly fullText length:", fullText.length);
            console.log("  Weebly hasFffd:", fullText.includes('\uFFFD'));
            if (fullText.includes('\uFFFD')) {
                const idx = fullText.indexOf('\uFFFD');
                console.log(`    FFFD at: "${fullText.substring(idx - 30, idx + 30)}"`);
            }
        }
    });
});
