require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Entry = require('./models/entry');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await Entry.deleteMany({});
  console.log(`Deleted ${res.deletedCount} documents from entries collection`);

  // Delete qr_links.xlsx file if it exists
  const xlsxPath = path.join(__dirname, 'qr_links.xlsx');
  if (fs.existsSync(xlsxPath)) {
    fs.unlinkSync(xlsxPath);
    console.log('Deleted qr_links.xlsx');
  } else {
    console.log('qr_links.xlsx not found.');
  }

  // Delete all files in qrcodes folder (if exists)
  const qrDir = path.join(__dirname, 'qrcodes');
  if (fs.existsSync(qrDir)) {
    const files = fs.readdirSync(qrDir);
    for (const file of files) {
      const filePath = path.join(qrDir, file);
      fs.unlinkSync(filePath);
    }
    console.log('Deleted all QR code images in qrcodes folder');
  } else {
    console.log('qrcodes folder not found.');
  }

  await mongoose.disconnect();
}

main();
