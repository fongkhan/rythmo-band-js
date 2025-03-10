const multer = require('multer');
const fs = require('fs');

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

module.exports = upload;