import { packageMobi, parseMobi } from '../src/lib/mobi-engine.ts';

async function runMobiTest() {
  console.log('Testing MOBI Packaging & Parsing...');

  const sampleChapters = [
    {
      id: 'ch_1',
      href: 'OEBPS/ch_1.xhtml',
      title: 'BİRİNCİ BÖLÜM',
      rawContent: '<p>Karanlık bir gecede adam yürümeye başladı.</p><p>Hava soğuktu ve rüzgar esiyordu.</p>',
      modifiedContent: '<p>Karanlık bir gecede adam yürümeye başladı.</p><p>Hava soğuktu ve rüzgar esiyordu.</p>',
      blocks: [
        {
          id: 'ch_1_block_0',
          elementTag: 'p',
          originalHtml: '<p>Karanlık bir gecede adam yürümeye başladı.</p>',
          originalText: 'Karanlık bir gecede adam yürümeye başladı.',
          correctedHtml: '<p>Karanlık bir gecede adam yürümeye başladı.</p>',
          correctedText: 'Karanlık bir gecede adam yürümeye başladı.',
          status: 'completed',
          diffCount: 0,
        },
        {
          id: 'ch_1_block_1',
          elementTag: 'p',
          originalHtml: '<p>Hava soğuktu ve rüzgar esiyordu.</p>',
          originalText: 'Hava soğuktu ve rüzgar esiyordu.',
          correctedHtml: '<p>Hava soğuktu ve rüzgar esiyordu.</p>',
          correctedText: 'Hava soğuktu ve rüzgar esiyordu.',
          status: 'completed',
          diffCount: 0,
        },
      ],
      isSelected: true,
      status: 'completed',
      stats: {
        totalBlocks: 2,
        processedBlocks: 2,
        fixedWords: 0,
      },
    },
  ];

  const sampleMeta = {
    title: 'Test Kitabı',
    creator: 'Halil Özdoğan',
    language: 'tr',
    format: 'mobi',
  };

  const mobiBlob = await packageMobi(sampleChapters, sampleMeta);
  console.log('Generated MOBI Blob Size:', mobiBlob.size, 'bytes');

  if (mobiBlob.size < 500) {
    throw new Error(`Generated MOBI blob is unexpectedly small: ${mobiBlob.size} bytes`);
  }

  const mobiFile = new File([mobiBlob], 'test-kitap.mobi', { type: 'application/x-mobipocket-ebook' });
  const parsed = await parseMobi(mobiFile);

  console.log('Parsed MOBI Title:', parsed.metadata.title);
  console.log('Parsed Chapters Count:', parsed.chapters.length);
  console.log('Parsed Total Blocks:', parsed.chapters[0].blocks.length);

  if (parsed.chapters.length === 0 || parsed.chapters[0].blocks.length === 0) {
    throw new Error('MOBI parsing returned 0 chapters or blocks');
  }

  console.log('MOBI Packaging and Parsing test PASSED successfully!');
}

runMobiTest().catch((err) => {
  console.error('MOBI Test Failed:', err);
  process.exit(1);
});
