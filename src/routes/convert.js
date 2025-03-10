const express = require('express');
const { parse } = require('csv-parse');
const fs = require('fs');
const router = express.Router();
const upload = require('../middleware/upload');
const { createDetxContent } = require('../utils/detxGenerator');

router.post('/', upload.single('subtitles'), async (req, res) => {
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

module.exports = router;