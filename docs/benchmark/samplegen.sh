#!/usr/bin/env bash

set +e  # IMPORTANT: benchmarking must not die on first failure

# =========================================================
# CONFIG
# =========================================================

MODELS_DIR="/app/src/piper_tts_web/models"
OUTPUT_DIR="/app/src/piper_tts_web/outputs/benchmark"
CSV_FILE="${OUTPUT_DIR}/metrics.csv"

TEXT="Hey there. Thanks for checking out this Piper voice sample.

I’ve been designed for fast, fully local text-to-speech generation that runs entirely on your own machine, even without a GPU. CPU utilization remained stable while the application generated speech locally using ONNX inference and ffmpeg-based MP3 conversion.

The voices still vary quite a bit in quality, but some of them are surprisingly usable for offline projects, especially considering everything runs locally on the CPU."

mkdir -p "${OUTPUT_DIR}"

echo "voice,wav_file,mp3_file,model_size_mb,generation_seconds,audio_duration_seconds,rtf" > "${CSV_FILE}"

cd "${MODELS_DIR}" || exit 1

# =========================================================
# MAIN LOOP
# =========================================================

for MODEL in *.onnx; do
    [ -f "$MODEL" ] || continue

    VOICE="${MODEL%.onnx}"

    echo "================================================="
    echo "Processing: ${VOICE}"
    echo "================================================="

    WAV_FILE="${OUTPUT_DIR}/${VOICE}.wav"
    MP3_FILE="${OUTPUT_DIR}/${VOICE}.mp3"

    # -----------------------------------------------------
    # MODEL SIZE
    # -----------------------------------------------------

    MODEL_SIZE_MB=$(du -m "${MODEL}" 2>/dev/null | cut -f1 || echo "0")

    # -----------------------------------------------------
    # SYNTHESIS TIMING
    # -----------------------------------------------------

    START_TIME=$(date +%s.%N)

    echo "${TEXT}" | piper \
        -m "${MODELS_DIR}/${MODEL}" \
        -f "${WAV_FILE}"

    EXIT_CODE=$?

    END_TIME=$(date +%s.%N)

    GEN_TIME=$(awk "BEGIN {print ${END_TIME} - ${START_TIME}}")

    # Skip failed synths safely
    if [ $EXIT_CODE -ne 0 ] || [ ! -s "${WAV_FILE}" ]; then
        echo "❌ FAILED: ${VOICE}"
        continue
    fi

    # -----------------------------------------------------
    # AUDIO DURATION
    # -----------------------------------------------------

    AUDIO_DURATION=$(ffprobe -i "${WAV_FILE}" -show_entries format=duration -v quiet -of csv="p=0")

    if [ -z "${AUDIO_DURATION}" ]; then
        echo "❌ BAD AUDIO: ${VOICE}"
        continue
    fi

    # -----------------------------------------------------
    # RTF CALCULATION
    # -----------------------------------------------------

    RTF=$(awk "BEGIN { printf \"%.4f\", ${GEN_TIME}/${AUDIO_DURATION} }")

    # -----------------------------------------------------
    # MP3 CONVERSION
    # -----------------------------------------------------

    ffmpeg -y -loglevel error \
        -i "${WAV_FILE}" \
        -codec:a libmp3lame \
        -qscale:a 2 \
        "${MP3_FILE}" || echo "⚠️ MP3 FAILED: ${VOICE}"

    # -----------------------------------------------------
    # LOG RESULTS
    # -----------------------------------------------------

    echo "${VOICE},${WAV_FILE},${MP3_FILE},${MODEL_SIZE_MB},${GEN_TIME},${AUDIO_DURATION},${RTF}" \
        >> "${CSV_FILE}"

    echo "✅ Done: ${VOICE}"
done

echo "================================================="
echo "Benchmark complete"
echo "CSV: ${CSV_FILE}"
echo "================================================="
