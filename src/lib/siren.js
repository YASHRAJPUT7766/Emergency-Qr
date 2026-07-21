// Generates a loud two-tone "siren" sound using the Web Audio API.
// No external mp3 file needed — works purely in-browser.
export function playSiren(durationMs = 4000) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.connect(gain);

    const start = ctx.currentTime;
    const end = start + durationMs / 1000;
    let t = start;
    let low = true;

    // Alternate between two tones every 350ms — classic siren wail
    while (t < end) {
      osc.frequency.setValueAtTime(low ? 500 : 900, t);
      t += 0.35;
      low = !low;
    }

    osc.start(start);
    osc.stop(end);
    osc.onended = () => ctx.close();
  } catch (e) {
    // Web Audio not available — fail silently, notification still shows
    console.warn("Siren playback failed:", e);
  }
}
