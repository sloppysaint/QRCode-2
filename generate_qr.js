require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const Entry = require('./models/entry');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/view/';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const results = [];
  let entries = []; // To store all entries for optional export

  fs.createReadStream('data.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const row of results) {
        const code = uuidv4().slice(0, 8);
        const url = `${BASE_URL}${code}`;
        try {
          // Save to MongoDB
          const entry = await Entry.create({
            name: row.name,
            phone: row.phone,
            code,
            scanned: false
          });
          // Generate QR PNG
          await QRCode.toFile(
            `${row.name.replace(/\s+/g, '_')}_${code}.png`,
            url
          );
          // Print result to terminal
          console.log(`Created: ${row.name} | Code: ${code} | URL: ${url}`);

          entries.push({ name: row.name, phone: row.phone, code, url });
        } catch (err) {
          console.error(`Error creating entry for ${row.name}: ${err}`);
        }
      }

      // OPTIONAL: Save all URLs to a file for easy reference
      fs.writeFileSync('all_qr_links.txt', entries.map(e => `${e.name},${e.phone},${e.code},${e.url}`).join('\n'));

      console.log('\nDone! All entries uploaded and QR codes generated.');
      console.log('All QR codes and URLs saved in all_qr_links.txt');
      mongoose.disconnect();
    });
}

main();
