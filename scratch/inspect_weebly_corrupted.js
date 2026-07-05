const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');
const files = fs.readdirSync(CACHE_WEEBLY_DIR).filter(f => f.startsWith('page_') && f.endsWith('.html'));

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

// Find the file containing Ep 1828
let foundFile = null;
let foundPost = null;

for (const file of files) {
    const html = fs.readFileSync(path.join(CACHE_WEEBLY_DIR, file), 'utf-8');
    const $ = cheerio.load(html);
    $('.blog-post').each((i, el) => {
        const titleText = $(el).find('.blog-title').text().trim();
        const meta = parseWeeblyTitle(titleText);
        if (meta.episode_id === 1828) {
            foundFile = file;
            foundPost = $(el).html();
        }
    });
    if (foundFile) break;
}

if (foundFile) {
    console.log(`Ep 1828 found in file: ${foundFile}`);
    const $post = cheerio.load(foundPost);
    console.log("Title text:", $post('.blog-title').text().trim());
    
    // Check paragraphs
    const paragraphs = $post('.blog-content .paragraph');
    console.log("Number of paragraphs:", paragraphs.length);
    paragraphs.each((i, el) => {
        const html = $(el).html();
        console.log(`Paragraph ${i} preview:`, $(el).text().substring(0, 300));
        
        // Print lines parsed
        const lines = html.split(/<br\s*\/?>/i);
        console.log(`  Lines count: ${lines.length}`);
        lines.slice(0, 10).forEach((lineHtml, lineIdx) => {
            console.log(`    Line ${lineIdx}: "${cheerio.load(lineHtml).text().trim()}"`);
        });
    });
} else {
    console.log("Ep 1828 NOT found in Weebly Cache.");
}
