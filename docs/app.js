// All voices inferred directly from filenames (no CSV needed)

const voices = [
  "en_GB-alan-low",
  "en_GB-alan-medium",
  "en_GB-alba-medium",
  "en_GB-aru-medium",
  "en_GB-cori-high",
  "en_GB-cori-medium",
  "en_GB-jenny_dioco-medium",
  "en_GB-northern_english_male-medium",
  "en_GB-semaine-medium",
  "en_GB-southern_english_female-low",
  "en_GB-vctk-medium",

  "en_US-amy-low",
  "en_US-amy-medium",
  "en_US-arctic-medium",
  "en_US-bryce-medium",
  "en_US-danny-low",
  "en_US-hfc_female-medium",
  "en_US-hfc_male-medium",
  "en_US-joe-medium",
  "en_US-john-medium",
  "en_US-kathleen-low",
  "en_US-kristin-medium",
  "en_US-kusal-medium",
  "en_US-l2arctic-medium",
  "en_US-lessac-high",
  "en_US-lessac-low",
  "en_US-lessac-medium",
  "en_US-libritts-high",
  "en_US-libritts_r-medium",
  "en_US-ljspeech-high",
  "en_US-ljspeech-medium",
  "en_US-norman-medium",
  "en_US-reza_ibrahim-medium",
  "en_US-ryan-high",
  "en_US-ryan-low",
  "en_US-ryan-medium",
  "en_US-sam-medium"
];

function card(name) {
  const mp3 = `benchmark/${name}.mp3`;
  const wav = `benchmark/${name}.wav`;

  return `
    <div class="card">
      <div class="name">${name}</div>

      <audio controls preload="none">
        <source src="${mp3}" type="audio/mpeg">
      </audio>

      <div class="links">
        <a href="${mp3}" download>MP3</a>
        <a href="${wav}" download>WAV</a>
      </div>
    </div>
  `;
}

function main() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="grid">
      ${voices.map(card).join("")}
    </div>
  `;
}

main();
