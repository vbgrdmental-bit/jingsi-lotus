const https = require('https');

const videoIds = [
    '0g4q9NGndxI', // Ep 470, 403
    'kEMX7YrqJ2E', // Ep 472, 403
    'HmTUX5modNg'  // Ep 502, 403
];

videoIds.forEach(id => {
    const checkUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
    https.get(checkUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Video ${id} status:`, res.statusCode, data);
        });
    }).on('error', err => {
        console.error(`Video ${id} error:`, err.message);
    });
});
