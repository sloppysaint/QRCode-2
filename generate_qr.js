require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const Entry = require('./models/entry');

// For QR code image links, use /qr/ not /view/
const QR_IMG_BASE_URL = 'https://qrcode-2-production.up.railway.app/qr/';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/view/';

// Ensure qrcodes directory exists
const qrcodesDir = path.join(__dirname, 'qrcodes');
if (!fs.existsSync(qrcodesDir)) {
  fs.mkdirSync(qrcodesDir);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected in generator'))
    .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

  const results = [];
  let csvRows = ['name,phone,qr_link'];

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
        const qrUrl = `${QR_IMG_BASE_URL}${row.name.replace(/\s+/g, '_')}_${code}.png`;
        const qrFilename = path.join(qrcodesDir, `${row.name.replace(/\s+/g, '_')}_${code}.png`);
        const qrContent = `${BASE_URL}${code}`;
        try {
          // Save to MongoDB
          await Entry.create({
            name: row.name,
            phone: row.phone,
            code,
            scanned: false
          });
          // Generate QR code PNG
          await QRCode.toFile(
            qrFilename,
            qrContent
          );
          // Just plain clickable link
          csvRows.push(`${row.name},${row.phone},${qrUrl}`);
          console.log(`Created: ${row.name} | Code: ${code} | URL: ${qrContent}`);
        } catch (err) {
          console.error(`Error creating entry for ${row.name}: ${err}`);
        }
      }
      mongoose.disconnect();
      // Write all links to qr_links.csv
      fs.writeFileSync('qr_links.csv', csvRows.join('\n'));
      console.log('\nAll entries processed, QR codes generated, and saved to MongoDB.');
      console.log('See qr_links.csv for all clickable links.');
    });
}

main();
