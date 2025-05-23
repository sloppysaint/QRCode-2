require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

// Your deployed base url for QR images (not /view/, use /qr/)
const QR_IMG_BASE_URL = 'https://qrcode-2-6usy.onrender.com/qr/';

const results = [];
let csvRows = ['name,phone,qr_link'];

if (!fs.existsSync('qrcodes')) fs.mkdirSync('qrcodes'); // Make qrcodes folder if not exists

fs.createReadStream('data.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', async () => {
    for (const row of results) {
      if (!row.name || !row.phone) {
        console.error('Skipping entry due to missing data:', row);
        continue;
      }
      const code = uuidv4().slice(0, 8);
      // QR filename: Name_Code.png (spaces replaced with _)
      const filename = `${row.name.replace(/\s+/g, '_')}_${code}.png`;
      const qrUrl = `${QR_IMG_BASE_URL}${filename}`;
      try {
        await QRCode.toFile(
          path.join('qrcodes', filename),
          `${process.env.BASE_URL}${code}`
        );
        csvRows.push(`${row.name},${row.phone},${qrUrl}`);
        console.log(`QR created for ${row.name}: ${qrUrl}`);
      } catch (err) {
        console.error(`Error for ${row.name}: ${err}`);
      }
    }
    // Write all links to qr_links.csv
    fs.writeFileSync('qr_links.csv', csvRows.join('\n'));
    console.log('\nDone! See qr_links.csv for all links.');
  });
