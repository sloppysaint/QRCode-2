require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Entry = require('./models/entry');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('QR Scan-Once backend is running!');
});

app.get('/view/:code', async (req, res) => {
  const code = req.params.code;
  try {
    const entry = await Entry.findOne({ code });
    if (!entry) {
      res.send('Invalid QR code.');
    } else if (entry.scanned) {
      res.send('This QR code has already been used.');
    } else {
      entry.scanned = true;
      await entry.save();
      res.send(`<h2>Name: ${entry.name}</h2><h3>Phone: ${entry.phone}</h3>`);
    }
  } catch (err) {
    res.status(500).send('Server error.');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
