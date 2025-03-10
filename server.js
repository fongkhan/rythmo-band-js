const express = require('express');
const path = require('path');
const convertRouter = require('./src/routes/convert');

const app = express();

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/dist')));

// Use the convert route for handling file conversions
app.use('/convert', convertRouter);

// Handle any requests that don't match the above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});