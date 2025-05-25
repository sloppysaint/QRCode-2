require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Entry = require('./models/entry');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve QR code images
app.use('/qr', express.static(path.join(__dirname, 'qrcodes')));

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
      res.send(`
        <html>
          <body style="font-size:2rem;text-align:center;padding-top:40px;">
            Invalid QR code.
          </body>
        </html>
      `);
    } else if (entry.scanned) {
      res.send(`
        <html>
          <body style="font-size:2rem;text-align:center;padding-top:40px;">
            This QR code has already been used.
            <br>
            First scanned at: ${entry.scannedAt ? new Date(entry.scannedAt).toLocaleString() : 'N/A'}
          </body>
        </html>
      `);
    } else {
      entry.scanned = true;
      entry.scannedAt = new Date(); // Save the scan time
      await entry.save();
      res.send(`
        <html>
          <body style="font-size:2.2rem;line-height:1.5;text-align:center;padding-top:40px;">
            <h2 style="font-size:2.5rem;margin-bottom:20px;">Name: ${entry.name}</h2>
            <h3 style="font-size:2rem;margin-top:0;">Phone: ${entry.phone}</h3>
            <h4 style="font-size:1.5rem;margin-top:10px;">Scanned at: ${new Date(entry.scannedAt).toLocaleString()}</h4>
          </body>
        </html>
      `);
    }
  } catch (err) {
    res.status(500).send(`
      <html>
        <body style="font-size:2rem;text-align:center;padding-top:40px;">
          Server error.
        </body>
      </html>
    `);
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
