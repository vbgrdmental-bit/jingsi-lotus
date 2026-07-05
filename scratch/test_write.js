const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const ep4 = rawEpisodes.find(e => e.episode_id === 4);

console.log("Before: length =", ep4.full_text.length, "hasFffd =", ep4.full_text.includes('\uFFFD'));

// Repair directly
const forumFile = path.join(__dirname, '../data/cache_forum_detail/topic_5994.html');
const cheerio = require('cheerio');

function htmlToText(html) {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n');
    const $ = cheerio.load(text);
    return $.text().trim();
}

const html = fs.readFileSync(forumFile, 'utf-8');
const $ = cheerio.load(html);
let cleanText = '';
$('.postbody').each((i, el) => {
    const text = htmlToText($(el).html());
    if (text.includes('證嚴上人開示') || text.includes('證嚴法師開示') || text.includes('上人開示')) {
        if (text.length > cleanText.length) {
            cleanText = text;
        }
    }
});

console.log("Forum clean length:", cleanText.length, "hasFffd:", cleanText.includes('\uFFFD'));

ep4.full_text = cleanText;
fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
console.log("Saved!");

const reloaded = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const ep4_reloaded = reloaded.find(e => e.episode_id === 4);
console.log("After reload: length =", ep4_reloaded.full_text.length, "hasFffd =", ep4_reloaded.full_text.includes('\uFFFD'));
