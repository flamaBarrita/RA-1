// Efectos de sonido sintetizados con Web Audio (sin archivos externos ni licencias).
// El contexto de audio solo puede arrancar despues de un toque del usuario.
const Sonidos = (() => {
  let ctx = null;

  function iniciar() {
    if (!ctx) {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (Contexto) ctx = new Contexto();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tono({ frecuencia, final = frecuencia, duracion = 0.12, tipo = 'square', volumen = 0.15, retraso = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + retraso;
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecuencia, t0);
    osc.frequency.exponentialRampToValueAtTime(final, t0 + duracion);
    gan.gain.setValueAtTime(volumen, t0);
    gan.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);
    osc.connect(gan).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duracion);
  }

  function ruido(duracion = 0.25, volumen = 0.3) {
    if (!ctx) return;
    const muestras = Math.floor(ctx.sampleRate * duracion);
    const buffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / muestras);
    const fuente = ctx.createBufferSource();
    const gan = ctx.createGain();
    gan.gain.value = volumen;
    fuente.buffer = buffer;
    fuente.connect(gan).connect(ctx.destination);
    fuente.start();
  }

  return {
    iniciar,
    clic: () => tono({ frecuencia: 900, final: 600, duracion: 0.05, volumen: 0.08 }),
    brinco: () => tono({ frecuencia: 220, final: 660, duracion: 0.22, tipo: 'sine', volumen: 0.25 }),
    choque: () => { ruido(0.3, 0.35); tono({ frecuencia: 160, final: 50, duracion: 0.3, tipo: 'sawtooth', volumen: 0.2 }); },
    esquivar: () => tono({ frecuencia: 1200, final: 1500, duracion: 0.08, tipo: 'triangle', volumen: 0.1 }),
    truco: () => [523, 659, 784, 1047].forEach((f, i) => tono({ frecuencia: f, duracion: 0.12, tipo: 'triangle', volumen: 0.18, retraso: i * 0.07 })),
    meta: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tono({ frecuencia: f, duracion: 0.18, tipo: 'square', volumen: 0.12, retraso: i * 0.12 })),
    gameOver: () => [392, 330, 262, 196].forEach((f, i) => tono({ frecuencia: f, duracion: 0.25, tipo: 'sawtooth', volumen: 0.12, retraso: i * 0.2 })),
  };
})();

// Vibracion corta (Android). iPhone no permite vibrar desde la web, ahi queda el efecto visual y sonoro.
function vibrar(patron) {
  if (navigator.vibrate) navigator.vibrate(patron);
}
