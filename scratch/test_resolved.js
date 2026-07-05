const https = require('https');

const videoIds = ['Ki2HYae_8qM', '0lyeTcGe25s', 'BajWpQZVLok', 'N84NKRRmjbY'];

videoIds.forEach(id => {
    const checkUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
    https.get(checkUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Video [${id}] status:`, res.statusCode);
            if (res.statusCode === 200) {
                const info = JSON.parse(data);
                console.log(`  Title: "${info.title}"`);
            }
        });
    });
});
