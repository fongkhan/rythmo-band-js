const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const { create } = require('xmlbuilder2');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/dist')));

app.post('/convert', upload.single('subtitles'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Subtitle file is required');
  }

  const subtitleFile = req.file;
  const videoPath = req.body.videoPath;
  const audioPath = req.body.audioPath;

  if (!videoPath) {
    return res.status(400).send('Video path is required');
  }

  try {
    const subtitles = [];
    let isFirstLine = true;
    let hasData = false;

    const parser = parse({
      delimiter: ['|'],
      trim: true,
      quote: '"',
      escape: '"',
      relax_quotes: true,
      skip_empty_lines: true,
      relax: true
    });

    parser.on('error', (err) => {
      console.error('Error parsing CSV:', err.message);
    });

    fs.createReadStream(subtitleFile.path)
      .pipe(parser)
      .on('data', (row) => {
        if (isFirstLine) {
          console.log('First row:', row);
          isFirstLine = false;
          return;
        }

        // Skip empty rows
        if (!row.some(cell => cell?.trim())) {
          return;
        }
        function cleanSubtitleText(text) {
          return text.replace(/\{\\?[^}]+\}/g, '');
        }
        
        const [TimerStart, TimerEnd, Text] = row;
        if (TimerStart && TimerEnd && Text) {
          subtitles.push({
            start_time: TimerStart.trim(),
            end_time: TimerEnd.trim(),
            text: cleanSubtitleText(Text.trim())
          });
        }
      })
      .on('end', () => {
        const detxContent = createDetxContent(subtitles, videoPath, audioPath);
        const outputPath = `${subtitleFile.path}.detx`;
        
        fs.writeFileSync(outputPath, detxContent);
        res.download(outputPath, 'converted.detx', () => {
          // Clean up uploaded files
          fs.unlinkSync(subtitleFile.path);
          fs.unlinkSync(outputPath);
        });
      });
  } catch (error) {
    res.status(500).send('Error processing file: ' + error.message);
  }
});

// Handle any requests that don't match the above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

function formatTimecode(timestamp) {
  // Convert from HH:mm:ss,fff to HH:mm:ss:ff format
  const match = timestamp.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) return timestamp;
  
  const [_, hours, minutes, seconds, milliseconds] = match;
  // Convert milliseconds to frames (assuming 25 fps)
  const frames = Math.round(parseInt(milliseconds) * 25 / 1000);
  // Replace '00' with '01' for the hours part
  const adjustedHours = hours === '00' ? '01' : hours;
  return `${adjustedHours}:${minutes}:${seconds}:${frames.toString().padStart(2, '0')}`;
}

function createDetxContent(subtitles, videoPath, audioPath) {
  const doc = create({ version: '1.0', encoding: 'UTF-8', standalone: 'yes' })
    .ele('detx', { copyright: 'Chinkel S.A., 2007-2024' })
      .ele('header')
        .ele('cappella', { version: '3.7.0' }).up()
        .ele('title').txt('Converted Subtitles').up()
        .ele('title2').txt('').up()
        .ele('episode', { number: '1' }).up()
        .ele('videofile', { timestamp: '01:00:00:00' }).txt(videoPath).up()
        .ele('audiofile').txt(audioPath || '').up()
      .up()
      .ele('roles')
        .ele('role', {
          color: '#000000',
          description: '',
          gender: 'unknown',
          id: 'placeholder',
          name: 'Placeholder'
        }).up()
      .up()
      .ele('body');

  // Add subtitles to the body
  subtitles.forEach(sub => {
    doc.ele('line', {
      role: 'placeholder',
      track: '1'
    })
    .ele('lipsync', {
      timecode: formatTimecode(sub.start_time),
      type: 'in_open'
    }).up()
    .ele('text').txt(sub.text).up()
    .ele('lipsync', {
      timecode: formatTimecode(sub.end_time),
      type: 'out_close'
    }).up()
    .up();
  });

  return doc.end({ prettyPrint: true });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});