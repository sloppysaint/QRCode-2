require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const Entry = require('./models/entry');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/view/';

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected in generator'))
    .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

  const results = [];
  let entries = []; // For optional export

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
        const url = `${BASE_URL}${code}`;
        try {
          // Save to MongoDB
          await Entry.create({
            name: row.name,
            phone: row.phone,
            code,
            scanned: false
          });
          // Also create QR code PNG if desired
          const filename = `${row.name.replace(/\s+/g, '_')}_${code}.png`;
          await QRCode.toFile(
            path.join('qrcodes', filename),
            url
          );
          entries.push({ name: row.name, phone: row.phone, code, url });
          console.log(`Created: ${row.name} | Code: ${code} | URL: ${url}`);
        } catch (err) {
          console.error(`Error creating entry for ${row.name}: ${err}`);
        }
      }
      mongoose.disconnect();
      // Optionally, write a csv or json file with all links for you to check
      fs.writeFileSync('all_qr_links.txt', entries.map(e => `${e.name},${e.phone},${e.code},${e.url}`).join('\n'));
      console.log('All entries processed and saved to MongoDB.');
    });
}

main();
