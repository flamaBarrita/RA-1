// Pantallas y controles en HTML encima de la camara. Se insertan desde aqui para que
// index.html (con RA) y prueba.html (sin RA) compartan exactamente la misma interfaz.
document.body.insertAdjacentHTML('afterbegin', `
  <div id="destello"></div>

  <section id="pantalla-inicio" class="pantalla">
    <h1>BICI TRICK RA</h1>
    <p>Apunta la cámara al marcador y llega a la meta de 300 m en menos de 45 segundos.</p>
    <ul>
      <li><b>AVANZAR</b> (mantén presionado): pedaleas más rápido.</li>
      <li><b>BRINCAR</b>: salta los conos. Si brincas sobre una rampa haces un <b>truco</b>.</li>
      <li>Tienes 3 vidas. Cada choque con un cono quita una.</li>
      <li>Puntos: +1 por metro, +10 por cono esquivado, +50 por truco (x2 si encadenas trucos sin chocar) y +5 por cada segundo que te sobre.</li>
    </ul>
    <p class="record">Récord: <span id="record-inicio">0</span></p>
    <button id="btn-jugar" class="btn-grande">JUGAR</button>
  </section>

  <section id="pantalla-final" class="pantalla oculto">
    <h1 id="final-titulo">GAME OVER</h1>
    <p id="final-motivo"></p>
    <p class="puntaje-final">Puntos: <span id="final-puntos">0</span></p>
    <p id="final-record" class="record"></p>
    <button id="btn-reintentar" class="btn-grande">REINTENTAR</button>
  </section>

  <div id="hud" class="oculto">
    <div class="hud-fila">
      <span id="hud-vidas"></span>
      <span>⏱ <span id="hud-tiempo"></span></span>
      <span>★ <span id="hud-puntos">0</span></span>
    </div>
    <div class="progreso"><div id="barra-progreso"></div></div>
    <div id="hud-metros"></div>
  </div>

  <div id="avisos"></div>
  <div id="aviso-marcador" class="oculto">Apunta al marcador para seguir jugando</div>

  <div id="controles" class="oculto">
    <button id="btn-avanzar" class="btn-control">▶<span>AVANZAR</span></button>
    <button id="btn-brincar" class="btn-control">⤒<span>BRINCAR</span></button>
  </div>
`);
