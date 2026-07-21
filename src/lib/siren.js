// Generates a loud two-tone "siren" sound using the Web Audio API.
// No external mp3 file needed — works purely in-browser.
export function playSiren(durationMs = 6000) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.connect(gain);

    const start = ctx.currentTime;
    const end = start + durationMs / 1000;
    let t = start;
    let low = true;

    // Alternate between two tones every 300ms — classic siren wail
    while (t < end) {
      osc.frequency.setValueAtTime(low ? 480 : 950, t);
      t += 0.3;
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
