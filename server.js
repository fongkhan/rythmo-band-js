const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const { Builder } = require('xml2js');
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

app.post('/convert', upload.fields([
  { name: 'subtitles', maxCount: 1 },
  { name: 'videoPath', maxCount: 1 },
  { name: 'audioPath', maxCount: 1 }
]), async (req, res) => {
  if (!req.files || !req.files.subtitles) {
    return res.status(400).send('Subtitle file is required');
  }

  const subtitleFile = req.files.subtitles[0];
  const videoFile = req.files.videoPath ? req.files.videoPath[0] : null;
  const audioFile = req.files.audioPath ? req.files.audioPath[0] : null;

  if (!videoFile) {
    return res.status(400).send('Video file is required');
  }

  try {
    const subtitles = [];
    let isFirstLine = true;
    fs.createReadStream(subtitleFile.path)
      .pipe(parse({
        delimiter: '|',
        trim: true,
        quote: '"',
        escape: '"',
        relax_quotes: true,
        skip_empty_lines: true,
        relax: true
      }))
      .on('data', (row) => {
        if (isFirstLine) {
          isFirstLine = false;
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
        const detxContent = createDetxContent(subtitles, videoFile.path, audioFile ? audioFile.path : null);
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
  const detxObj = {
    detx: {
      $: {
        copyright: 'Chinkel S.A., 2007-2024'
      },
      header: [{
        cappella: [{ $: { version: '3.7.0' } }],
        title: ['Converted Subtitles'],
        title2: [''],
        episode: [{ $: { number: '1' } }],
        videofile: [{ _: videoPath, $: { timestamp: '01:00:00:00' } }],
        audiofile: audioPath ? [{ _: audioPath }] : []
      }],
      roles: [{
        role: [{
          $: {
            color: '#000000',
            description: '',
            gender: 'unknown',
            id: 'placeholder',
            name: 'Placeholder'
          }
        }]
      }],
      body: [{
        line: subtitles.map(sub => ({
          $: { role: 'placeholder', track: '1' },
          lipsync: [
            { $: { timecode: formatTimecode(sub.start_time), type: 'out_open' } },
            { text: sub.text },
            { $: { timecode: formatTimecode(sub.end_time), type: 'out_close' } }
          ]
        }))
      }]
    }
  };

  const builder = new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8', standalone: 'yes' }
  });
  return builder.buildObject(detxObj);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});