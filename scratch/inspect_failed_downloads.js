const fs = require('fs');
const path = require('path');
const https = require('https');

const file = path.join(__dirname, '../data/cache_forum/list_page_2.html');
if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8');
    const fffdCount = (content.match(/\uFFFD/g) || []).length;
    console.log(`list_page_2.html FFFD count: ${fffdCount}`);
    
    // Check if the file starts with <!DOCTYPE or if it is empty/error
    console.log(`Content starts with: ${content.substring(0, 200)}`);
} else {
    console.log("list_page_2.html does not exist");
}

const file2 = path.join(__dirname, '../data/cache_forum_detail/topic_10009.html');
if (fs.existsSync(file2)) {
    const content2 = fs.readFileSync(file2, 'utf-8');
    const fffdCount2 = (content2.match(/\uFFFD/g) || []).length;
    console.log(`topic_10009.html FFFD count: ${fffdCount2}`);
    console.log(`Content2 starts with: ${content2.substring(0, 200)}`);
} else {
    console.log("topic_10009.html does not exist");
}
