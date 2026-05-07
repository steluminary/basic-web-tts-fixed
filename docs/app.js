const data = [
  {
    voice: "en_US-amy-low",
    mp3: "benchmark/en_US-amy-low.mp3",
    wav: "benchmark/en_US-amy-low.wav",
    rtf: 0.1197,
    gen: 3.84929,
    audio: 32.160000,
    size: 61
  },
  {
    voice: "en_US-amy-medium",
    mp3: "benchmark/en_US-amy-medium.mp3",
    wav: "benchmark/en_US-amy-medium.wav",
    rtf: 0.1126,
    gen: 3.65928,
    audio: 32.484717,
    size: 61
  },
  {
    voice: "en_US-libritts-high",
    mp3: "benchmark/en_US-libritts-high.mp3",
    wav: "benchmark/en_US-libritts-high.wav",
    rtf: 0.3861,
    gen: 11.2422,
    audio: 29.117823,
    size: 131
  },
  {
    voice: "en_GB-alan-low",
    mp3: "benchmark/en_GB-alan-low.mp3",
    wav: "benchmark/en_GB-alan-low.wav",
    rtf: 0.1065,
    gen: 3.64114,
    audio: 34.176000,
    size: 61
  }
  // You can paste the rest of metrics.csv entries here later (or auto-generate)
];

function row(v) {
  return `
    <div class="voice">
      <div class="name">${v.voice}</div>

      <audio controls preload="none">
        <source src="${v.mp3}" type="audio/mpeg">
      </audio>

      <div class="meta">
        <span class="tag">RTF ${v.rtf}</span>
        <span class="tag">Gen ${v.gen}s</span>
        <span class="tag">Audio ${v.audio}s</span>
        <span class="tag">${v.size}MB</span>

        <div style="margin-top:6px">
          <a href="${v.mp3}" download>mp3</a> |
          <a href="${v.wav}" download>wav</a>
        </div>
      </div>
    </div>
  `;
}

function main() {
  const el = document.getElementById("app");

  // fastest first
  data.sort((a, b) => a.rtf - b.rtf);

  el.innerHTML = data.map(row).join("");
}

main();
