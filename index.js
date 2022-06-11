import fs from 'fs';
import path from 'path';
import util from 'util';
import { fileURLToPath } from 'url';

import parser from '@fast-csv/parse';
import textToSpeech from '@google-cloud/text-to-speech';
import { RateLimit } from 'async-sema';
import sanitize from 'sanitize-filename';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: path.join(__dirname, './key.json')
});

const parseCsvFile = (csvSource) => {
  const data = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(path.resolve(__dirname, csvSource))
      .pipe(parser.parse({ headers: true }))
      .on('error', (error) => reject(error))
      .on('data', (row) => data.push(row))
      .on('end', () => resolve(data));
  });
};

const getTtsAudioContent = async ({ languageCode, text }) => {
  console.log(`Downloading | Lang: ${languageCode} \t Word: ${text}`);
  const [response] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: { languageCode, ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' }
  });

  return response.audioContent;
};

const generateAudioFile = async ({ fileName, audioContent }) => {
  const writeFile = util.promisify(fs.writeFile);
  await writeFile(
    path.join(__dirname, 'output', `${sanitize(fileName)}.mp3`),
    Buffer.concat(audioContent),
    'binary'
  );
};

const createDirectoryIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

(async () => {
  const argv = yargs(hideBin(process.argv))
    .command({
      command: 'csv <src>',
      desc: 'CSV file source.'
    })
    .command({
      command: 'rate <src>',
      desc: 'Requests per second.'
    })
    .help()
    .parse();

  let csvSource = 'words.csv';
  let wordsPerSec = 1;

  if (Object.keys(argv).some((arg) => arg === 'csv')) {
    csvSource = argv.csv;
  }

  if (
    Object.keys(argv).some(
      (arg) => arg === 'rate' && Number.isInteger((arg, 10)) && (arg, 10) > 0
    )
  ) {
    wordsPerSec = parseInt(argv.rate, 10);
  }

  if (!fs.existsSync(csvSource))
    throw new Error('Could not find the CSV file.');

  const parsedWordSets = await parseCsvFile(csvSource);

  // no rows
  if (parsedWordSets.length < 1) throw new Error('Could not parse CSV.');

  const parsedLanguages = Object.keys(parsedWordSets[0]);
  const sourceLanguage = parsedLanguages[0];

  console.log(
    `Downloading ${parsedWordSets.length - 1} files, ${wordsPerSec} per second`
  );

  const limiter = RateLimit(wordsPerSec);

  const audioContent = await Promise.all(
    parsedWordSets.map(async (wordSet, index) => {
      await limiter();

      return {
        word: wordSet[sourceLanguage],
        audioContent: await Promise.all(
          parsedLanguages.map(
            async (language) =>
              await getTtsAudioContent({
                languageCode: language,
                text: wordSet[language]
              })
          )
        )
      };
    })
  );

  createDirectoryIfNotExists('output');

  audioContent.forEach(async (ac) => {
    await generateAudioFile({
      fileName: ac.word,
      audioContent: ac.audioContent
    });
  });

  console.log('Done');
})();
