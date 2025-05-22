// models/Entry.js
const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  name: String,
  phone: String,
  code: { type: String, unique: true },
  scanned: { type: Boolean, default: false }
});

module.exports = mongoose.model('Entry', entrySchema);
