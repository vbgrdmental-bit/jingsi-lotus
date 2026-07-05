const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const file = path.join(__dirname, '../data/cache_forum_detail/topic_22492.html');
if (fs.existsSync(file)) {
    const html = fs.readFileSync(file, 'utf-8');
    const $ = cheerio.load(html);
    console.log("HTML length:", html.length);
    console.log("Title tag:", $('title').text());
    
    // Check if there are elements with class post, postbody, content, etc.
    console.log("Class postcount:", $('.post').length);
    console.log("Class postbody count:", $('.postbody').length);
    console.log("Class entry-content count:", $('.entry-content').length);
    console.log("Class post-content count:", $('.post-content').length);
    console.log("Div count:", $('div').length);
    
    // Print all div classes
    const classes = new Set();
    $('div').each((i, el) => {
        const cls = $(el).attr('class');
        if (cls) cls.split(/\s+/).forEach(c => classes.add(c));
    });
    console.log("All div classes:", Array.from(classes));
    
    // Print first 500 characters of body tag
    console.log("Body preview:", $('body').html().substring(0, 1000).replace(/\n/g, ' '));
} else {
    console.log("File does not exist:", file);
}
