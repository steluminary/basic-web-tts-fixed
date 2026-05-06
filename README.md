# Piper TTS Web Interface — Patch Fork

This repository is a practical patch fork of an older Piper TTS web interface created by Patrick Metzger. It was created to fix the broken upstream project by bypassing the firebase issue that blocked audio outputs from being successfully saved to an accessible location.  In addition to restoring core functionality, we have added a small set of quality-of-life improvements without rebuilding the application from scratch.

Part of the upstream project included a live demo of the application, which as of this writing is still fully functional and can be seen at [BasicTTS.com](https://basictts.com)


Please note that this is **not** a clean-room rewrite, all existing firebase codepaths were left in place, but bypassed. Pull requests to take this from Patrick’s vibe-coded source, through our patch and enhancement, to a more solidly engineered status are welcome, but as this is a side project and maintenance is expected to be casual, forking is encouraged if anyone wants to build this out into a bigger project. As it stands, this was the best baseline for a very specific use case, namely fully offline, cpu only, local ai, test-to-speech, using piper as the runtime engine, but including a useable webui for browser access. Most tooling is optimized for CLI use, or is based on multiple runtime engines (OpenTTS) or is based on heavier workflows (CoquiTTS, TTS-webui, etc)


## High-level changes in this fork

Based on the patch work done in this fork, the main changes include:

- Bypasses firebase coee paths that prevented offline Piper usage.
- Improved Docker/runtime setup for repeatable deployment.
- Added ffmpeg-based MP3 generation alongside WAV handling.
- Improved generated-audio file handling and output listing.
- Updated the UI workflow around generated synthesis events and output actions.
- Added practical fixes around local models, outputs, and runtime startup behavior.

This is still fundamentally the original project architecture, just repaired and extended in targeted places rather than rewritten from scratch.

## Operational notes

This fork is designed around a simple local-file workflow:

- Voice models live in the `models/` directory as `.onnx` files with matching `.json` metadata files.
- Generated audio is written to `outputs/`.
- Runtime startup is handled by `start.sh`.
- Docker deployment includes the system packages needed for Piper and audio conversion.
- ffmpeg is used so generated audio can be made available in MP3 form in addition to WAV.

In other words, this fork is meant to be easy to reason about: local models in, generated files out, and minimal moving parts in between.

## Prerequisites

1. Python 3.8+
2. `espeak-ng`
3. `ffmpeg`
4. Piper installed in the Python environment
5. Voice models in ONNX + JSON format

## Installation

### Local development
Please note, as we have focused on running this in Docker, we have not tested all installation modes on all systems. The following instructions were taken from the original upstream project. 

1. Install system dependencies.

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install espeak-ng espeak-ng-data ffmpeg git-lfs
git lfs install
```

**macOS:**
```bash
brew install espeak-ng ffmpeg git-lfs
git lfs install
```

2. Install Piper:
```bash
pip install piper-tts
```

3. Install this project:
```bash
pip install -e .
```

4. Place voice model files in `models/`:
- `voice-name.onnx`
- `voice-name.onnx.json`

### Docker

Build:
```bash
docker build -t piper-tts-web .
```

Run:
```bash
docker run -p 8000:8000 \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/outputs:/app/outputs \
  piper-tts-web
```

If you are using Docker in production, make sure model and output directories are mounted or otherwise persisted appropriately.

## Usage

1. Start the app:
```bash
python server.py
```

Or use the provided startup script / Docker workflow.

2. Open the web interface in your browser.
3. Select a voice.
4. Enter text.
5. Generate speech.
6. the mp3 version will load into the player, and autoplay.
7. The user can select other output files from the selection area below the player, and load them into the player on demand, they will autoplay.
8. Download links are provided for each synth event, for both mp3 and wav formats, with file sizes listed in the event row.

This fork’s UI is centered around generated synthesis events and the output list rather than a one-shot transient playback model.

## Project status

This repository should be considered a **best-effort patch fork**, and is essentially feature complete according to our vision and use case. 

## Troubleshooting

### No voices appear
- Confirm that `models/` contains `.onnx` files.
- Confirm that each `.onnx` file has a matching `.onnx.json` file.
- Check naming consistency.

### Synthesis fails
- Verify the selected model exists in `models/`.
- Check application logs.
- Confirm Piper is installed and callable in the runtime environment.

### MP3 output fails
- Make sure `ffmpeg` is installed and available in the container or host environment.
- Test with:
```bash
ffmpeg -version
```

### Piper executable is not found
- Confirm Piper is installed in the active Python environment.
- Test with:
```bash
python3 -m piper --help
```
- Also check:
```bash
which piper
```

## Attribution

This project is a fork of an earlier Piper TTS web interface and remains structurally derived from that original work. This fork exists to patch, restore, and modestly extend the original project rather than replace it with a brand-new implementation.

## License

This repository is a fork of https://github.com/prossm/basic-web-tts.

The upstream project does not include a formal license.
This repository is provided for educational and interoperability purposes.

All modifications and additions made in this fork are released under the MIT License.
