function fixPath(path) {
  // convert absolute container path → GitHub Pages relative path
  return path.split("benchmark/").slice(1).join("benchmark/");
}

async function loadCSV(url) {
  const res = await fetch(url);
  const text = await res.text();

  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i]);
    return obj;
  });
}

function row(v) {
  const mp3 = fixPath(v.mp3_file);

  return `
    <div class="voice">
      <div class="name">${v.voice}</div>

      <audio controls preload="none">
        <source src="benchmark/${mp3.split("benchmark/").pop()}" type="audio/mpeg">
      </audio>

      <div class="meta">
        <span class="tag">RTF ${v.rtf}</span>
        <span class="tag">Gen ${v.generation_seconds}s</span>
        <span class="tag">Audio ${v.audio_duration_seconds}s</span>
        <span class="tag">${v.model_size_mb}MB</span>
      </div>
    </div>
  `;
}

async function main() {
  const data = await loadCSV("benchmark/metrics.csv");

  // optional: fastest first
  data.sort((a, b) => parseFloat(a.rtf) - parseFloat(b.rtf));

  document.getElementById("app").innerHTML =
    data.map(row).join("");
}

main();
