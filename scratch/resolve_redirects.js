const https = require('https');

const items = [
    { epId: 1400, url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEA0vwk4pIgVWBgN3PKJz2xoyMRYtVZeV46MvQT1SuXKkfUjmRBK-4-z9NaocJO-3yRCOcWHCKUAQveEftzQIcUNtrZnwCnbGvT53jRzFn_2pM6vpXkKTL006jD8QjXN1oG' },
    { epId: 1401, url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHlgG_ARi5RTQoMp2hjxw02ABtYGtzUNkUUsVXpmsJVA0tAsEDOvbxcqFtsuT35JLVipvO_6tnQ4d4ergZUT0XudvJuMg0tEFlW0Syco6CJdh5d8c1K8wl8pQobay4tlsR1' },
    { epId: 1489, url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGwNDGygssyJTOAiKmwsqVMtkydjt5p38yt8Lu4tYdtT9zxJh_B0ARksAHAMJJI-bojjnac-lQpxpIO2wjnC0KNe0TOUnQoau8liCkaPcf1qFpBt8y9zxneo5ul7d8yRBAI' },
    { epId: 1557, url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHPLcnw4L4v-d-5HIp2kWGyDwxCGEpNqSi5nAZJk3Jp8UYovQplDgImZr72JryzO_EKy3jSDV1ym4yFCwx7eoS9GI3_uIQy7udZvTJIDIs6jStsDb4B9UGdtCW4ogaCjnnh' },
    { epId: 1558, url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGCYh5mcV8G6r6r3HcdHCyLQu0P3NfvdJfA85UXLeVAw-lVdqpwFfOZ8sZV9vbVMvimePQfavJZKCjZKZjFduxhceGbaP_K3oIqpgBVLAT-riPupzvolJiEPFSDIejviwG3' },
    { epId: 1578, url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEXKk_i3wJwiI66pJlpTW7VOOFHH2m8erkqA1pn2gKtwR95OgRrOQ4vDOKlgdQC5gIphZJcZcsSD8zLncKUOlDY2KavY2rHAElPVk2PJh_iX0cMn6-mBqqbU8KZylnC7hwk' },
    { epId: 1647, url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE42yZi7zr24DcURRoJke34gOt3nb8Ih__FYXSTGWgR39uwYA3FVDW6ZHl5p87Tlx4WPspSBCcueRbCKxtvxW-QanchkztdChFoO64CAlNE4moJxQrP-VDPQD7IzG4Z8DZ1' },
    { epId: 1686, url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFL2JKPZhYR_mkt0pNFlMRn6DCEjxSrCVPFSXNRRT9UZSV39tJSNau2rASEXESC4VpKz-83Q8XA7lYsE53MDatExobiPDRQwx9T4R1eu_yuwzYA4tep6-tSvmpcWaX8V3x-' }
];

items.forEach((item) => {
    https.get(item.url, (res) => {
        const dest = res.headers.location || 'None';
        console.log(`Ep ${item.epId} -> ${dest}`);
    }).on('error', err => {
        console.error(`Ep ${item.epId} error:`, err.message);
    });
});
