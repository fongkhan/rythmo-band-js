const { generateDetx } = require('./detxGenerator');

describe('DETX Generator', () => {
  test('should generate valid DETX format', () => {
    const subtitles = [
      {
        startTime: '00:00:01,000',
        endTime: '00:00:04,000',
        text: 'Test subtitle'
      }
    ];

    const result = generateDetx(subtitles);

    // Basic structure checks
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    expect(result).toContain('<detx');
    expect(result).toContain('</detx>');

    // Content checks
    expect(result).toContain('Test subtitle');
    expect(result).toContain('01:00:01:00');
    expect(result).toContain('01:00:04:00');
  });

  test('should handle empty subtitles array', () => {
    const subtitles = [];
    const result = generateDetx(subtitles);

    // Should still generate valid XML structure
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    expect(result).toContain('<detx');
    expect(result).toContain('</detx>');
  });

  test('should handle special characters in subtitle text', () => {
    const subtitles = [
      {
        startTime: '00:00:01,000',
        endTime: '00:00:04,000',
        text: 'Special & characters < > "quote"'
      }
    ];

    const result = generateDetx(subtitles);

    // Check if special characters are properly escaped
    expect(result).toContain('Special &amp; characters &lt; &gt; &quot;quote&quot;');
  });
});