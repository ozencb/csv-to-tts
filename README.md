# CSV -> TTS

This script utilizes Google's TTS API to download audio files from words or sentences in a CSV file.
If multiple languages are provided, it will join/concatenate audio data of each word in the same file so that they can be listened to one after the other.
### Requirements

You need a Google Cloud account with [Text-to-Speech API](https://cloud.google.com/text-to-speech) activated. Download the `key.json` file from the credentials page.

To run the script, you need NodeJS (tested on 16.15.0).

### Usage

Put the `key.json` file from GCP into the project directory. After executing `npm i` to install dependencies, you can run the script with: `node ./index.js`. By default, the script will look for a file named `words.csv`. You can specify a file by providing a `--csv` argument.

CSV file must be valid in its format and it must have a header with [valid language codes](https://cloud.google.com/text-to-speech/docs/voices).


## Options

| Commands | Description                                      |
| -------- | ------------------------------------------------ |
| `--csv`  | CSV file source. Default: `words.csv`            |
| `--rate` | Requests per second to Google API. Default: `10` |
