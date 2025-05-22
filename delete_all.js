require('dotenv').config();
const mongoose = require('mongoose');
const Entry = require('./models/entry');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await Entry.deleteMany({});
  console.log(`Deleted ${res.deletedCount} documents from entries collection`);
  mongoose.disconnect();
}

main();
