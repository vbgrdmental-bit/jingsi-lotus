const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const filePath = path.join(__dirname, '../data/cache_forum_detail/topic_22382.html');

function htmlToText(html) {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n');
    const $ = cheerio.load(text);
    return $.text().trim();
}

const htmlContent = fs.readFileSync(filePath, 'utf-8');
const $ = cheerio.load(htmlContent);

console.log("Number of postbodies:", $('.postbody').length);
$('.postbody').each((i, el) => {
    const html = $(el).html() || '';
    const text = htmlToText(html);
    console.log(`\nPost ${i}:`);
    console.log(`  Length: ${text.length}`);
    console.log(`  Preview (first 300 chars):`);
    console.log(text.substring(0, 300));
});
