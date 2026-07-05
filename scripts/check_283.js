const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('data/cache_forum_detail/topic_20187.html', 'utf-8');
const $ = cheerio.load(html);
$('iframe').each((i, el) => {
    console.log('iframe:', $(el).attr('src'));
});
