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
          <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
            <div style="font-size:2.5rem;text-align:center;">
              Invalid QR code.
            </div>
          </body>
        </html>
      `);
    } else if (entry.scanned) {
      res.send(`
        <html>
          <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
            <div style="font-size:2.5rem;text-align:center;">
              This QR code has already been used.<br>
              <span style="font-size:2rem;">First scanned at: ${entry.scannedAtIST || 'N/A'}</span>
            </div>
          </body>
        </html>
      `);
    } else {
      entry.scanned = true;
      entry.scannedAt = new Date();
      entry.scannedAtIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      await entry.save();
      res.send(`
        <html>
          <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
            <div style="font-size:2.5rem;line-height:1.4;text-align:center;">
              <h2 style="font-size:3rem;margin-bottom:20px;">Name: ${entry.name}</h2>
              <h3 style="font-size:2.5rem;margin-top:0;">Phone: ${entry.phone}</h3>
              <h4 style="font-size:2rem;margin-top:10px;">Scanned at: ${entry.scannedAtIST}</h4>
            </div>
          </body>
        </html>
      `);
    }
  } catch (err) {
    res.status(500).send(`
      <html>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
          <div style="font-size:2.5rem;text-align:center;">
            Server error.
          </div>
        </body>
      </html>
    `);
  }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
