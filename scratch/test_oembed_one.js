const https = require('https');

const videoIds = [
    'h2f82QtLIx0', 'N84NKRRmjbY', 'yy94XCr994k', 'I074-5jF_v8', 
    'uN0sifAkTZk', 'xHM_rZoBAh0', 'GqXeDSmyTuE', 'fneVMAcvPe0',
    'cOesQ4eO5v0', 'Z48MoMu-glg', 'P0yNYfq2Drk', 'MlLeo-eult4',
    '7XExhn8tNSI', 'QMN66JB4ju4', 'vhcpLsnTQI0', 'dw7K2ndiTZk',
    '3vSq3PYYfHU', 'sO45K3yIA-k', 'MH38tfN76dI', 'WJ2NnuDQ2A4',
    'rbYOKL3bwuk', 'Ce6XWAp7HV4', 'aYRAnTj2BDM', 'yBuPjQL7Cg4',
    'k3vIJMO-TME'
];

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
