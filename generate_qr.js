require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const XLSX = require('xlsx');
const Entry = require('./models/entry');

const QR_IMG_BASE_URL = 'https://qrcode-2-production.up.railway.app/qr/';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/view/';

// Ensure qrcodes directory exists
const qrcodesDir = path.join(__dirname, 'qrcodes');
if (!fs.existsSync(qrcodesDir)) fs.mkdirSync(qrcodesDir);

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected in generator'))
    .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

  // Read data from XLSX
  const wb = XLSX.readFile('data.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  let entries = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Expect first row to be headers: [name, phone]
  const [header, ...rows] = entries;
  if (!header || header.length < 2) {
    console.error('XLSX should have columns "name" and "phone"');
    process.exit(1);
  }

  // Get already existing phones from MongoDB to skip old entries
  const existingEntries = await Entry.find({}, { phone: 1 });
  const existingPhones = new Set(existingEntries.map(e => String(e.phone).trim()));

  // For building the QR links output
  let outData = [['name', 'phone', 'qr_link']];

  // To avoid duplicate phones within this new file itself
  const processedPhones = new Set();

  for (const row of rows) {
    const [name, phone] = row.map(x => (x || '').toString().trim());
    if (!name || !phone) continue;

    if (existingPhones.has(phone) || processedPhones.has(phone)) {
      // Skip if already present in DB or already processed in this file
      continue;
    }

    const code = uuidv4().slice(0, 8);
    const qrUrl = `${QR_IMG_BASE_URL}${name.replace(/\s+/g, '_')}_${code}.png`;
    const qrFilename = path.join(qrcodesDir, `${name.replace(/\s+/g, '_')}_${code}.png`);
    const qrContent = `${BASE_URL}${code}`;

    try {
      // Save to MongoDB
      await Entry.create({
        name,
        phone,
        code,
        scanned: false
      });
      // Generate QR code PNG
      await QRCode.toFile(qrFilename, qrContent);
      // Push row for output
      outData.push([name, phone, qrUrl]);
      processedPhones.add(phone);
      console.log(`Created: ${name} | ${phone} | ${qrContent}`);
    } catch (err) {
      console.error(`Error creating entry for ${name}: ${err}`);
    }
  }

  // Read all entries from DB (for sorted, deduplicated output)
  const allEntries = await Entry.find({});
  // Remove duplicates by phone, keep first occurrence only
  const phoneSet = new Set();
  const uniqueEntries = [];
  for (const e of allEntries) {
    if (!phoneSet.has(e.phone)) {
      uniqueEntries.push(e);
      phoneSet.add(e.phone);
    }
  }
  // Sort alphabetically by name
  uniqueEntries.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Build final output array
// Build final output array
const finalOutData = [['name', 'phone', 'qr_link']];
for (const e of uniqueEntries) {
  const fileMatch = fs.readdirSync(qrcodesDir).find(f => f.startsWith(e.name.replace(/\s+/g, '_') + '_') && f.endsWith('.png'));
  if (fileMatch) {
    const url = `${QR_IMG_BASE_URL}${fileMatch}`;
    // This makes it a clickable hyperlink in Excel
    finalOutData.push([e.name, e.phone, { f: `HYPERLINK("${url}","${url}")` }]);
  }
}

  // Write xlsx
  const wbOut = XLSX.utils.book_new();
  const wsOut = XLSX.utils.aoa_to_sheet(finalOutData);
  XLSX.utils.book_append_sheet(wbOut, wsOut, 'QR Links');
  XLSX.writeFile(wbOut, 'qr_links.xlsx');

  console.log('\nAll new entries processed, QR codes generated, and saved to MongoDB.');
  console.log('See qr_links.xlsx for all links.');

  await mongoose.disconnect();
}

main();
