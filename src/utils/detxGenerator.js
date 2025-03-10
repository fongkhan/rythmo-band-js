const { create } = require('xmlbuilder2');

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

module.exports = {
  formatTimecode,
  createDetxContent
};