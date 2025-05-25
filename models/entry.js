// models/entry.js
const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  name: String,
  phone: String,
  code: { type: String, unique: true },
  scanned: { type: Boolean, default: false },
  scannedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Entry', entrySchema);
