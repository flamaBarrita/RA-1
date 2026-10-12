// Bici Trick RA: logica del juego.
// Unidades: 1 = ancho del marcador. La pista corre sobre el eje X y el ciclista mira hacia +X.

const CONFIG = {
  metaMetros: 300,      // distancia para ganar
  tiempoLimite: 45,     // segundos para llegar a la meta
  vidas: 3,
  metrosPorUnidad: 10,  // 1 ancho de marcador = 10 m del juego
  velocidadMax: 1.2,    // unidades por segundo con AVANZAR presionado
  aceleracion: 1.5,
  frenado: 0.8,
  gravedad: 1.6,
  impulsoBrinco: 0.78,  // altura maxima aprox. 0.19
  posicionCiclista: -0.3,
  invulnerable: 1.2,    // segundos sin recibir dano despues de chocar
  largoPista: 1.8,      // la pista se sale un poco del marcador a los lados
  anchoPista: 0.45,
  puntos: { metro: 1, truco: 50, segundoSobrante: 5 },
};

// Obstaculos que se brincan: medio = mitad del largo que ocupa en la pista, alto = altura minima para librarlo
const OBSTACULOS = {
  cono: { probabilidad: 0.45, medio: 0.09, alto: 0.08, puntos: 10 },
  valla: { probabilidad: 0.25, medio: 0.1, alto: 0.12, puntos: 20 },
  rampa: { probabilidad: 0.3 },
};

const Interfaz = {
  $(id) { return document.getElementById(id); },

  mostrar(id, visible) { this.$(id).classList.toggle('oculto', !visible); },

  actualizar(estado) {
    this.$('hud-puntos').textContent = estado.puntos;
    this.$('hud-metros').textContent = `${Math.min(estado.metros, CONFIG.metaMetros)} / ${CONFIG.metaMetros} m`;
    this.$('hud-tiempo').textContent = `${Math.ceil(estado.tiempo)} s`;
    this.$('hud-vidas').textContent = '❤'.repeat(estado.vidas) + '♡'.repeat(CONFIG.vidas - estado.vidas);
    this.$('barra-progreso').style.width = `${Math.min(100, (estado.metros / CONFIG.metaMetros) * 100)}%`;
  },

  aviso(texto, clase = '') {
    const el = document.createElement('div');
    el.className = `aviso ${clase}`;
    el.textContent = texto;
    this.$('avisos').appendChild(el);
    setTimeout(() => el.remove(), 1100);
  },

  destello(clase) {
    const capa = this.$('destello');
    capa.className = clase;
    void capa.offsetWidth; // reinicia la animacion CSS
    capa.classList.add('activo');
  },

  leerRecord() {
    try { return Number(localStorage.getItem('biciTrickRecord')) || 0; } catch (e) { return 0; }
  },

  guardarRecord(puntos) {
    try { localStorage.setItem('biciTrickRecord', String(puntos)); } catch (e) { /* sin almacenamiento */ }
  },
};

AFRAME.registerComponent('juego-ciclista', {
  schema: {
    objetivo: { type: 'selector' }, // entidad de MindAR; vacio = modo sin RA (siempre visible)
  },

  init() {
    this.estado = null;
    this.avanzando = false;
    this.marcadorVisible = !this.data.objetivo;
    this.crearEscena();
    this.conectarBotones();

    if (this.data.objetivo) {
      this.data.objetivo.addEventListener('targetFound', () => this.cambiarVisibilidad(true));
      this.data.objetivo.addEventListener('targetLost', () => this.cambiarVisibilidad(false));
    }
    Interfaz.$('record-inicio').textContent = Interfaz.leerRecord();
  },

  // ---------- Escena ----------

  crearEscena() {
    const crear = (etiqueta, attrs, padre = this.el) => {
      const el = document.createElement(etiqueta);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      padre.appendChild(el);
      return el;
    };

    // Carretera vista de lado: la cara frontal se ve como franja de asfalto con banqueta y rayas
    const L = CONFIG.largoPista;
    const A = CONFIG.anchoPista;
    crear('a-box', { width: L, height: 0.06, depth: A, position: '0 -0.03 0', color: '#3a3a3a' });
    crear('a-box', { width: L, height: 0.014, depth: 0.02, position: `0 -0.003 ${A / 2}`, color: '#ffffff' });
    crear('a-box', { width: L, height: 0.014, depth: 0.02, position: `0 -0.003 ${-A / 2}`, color: '#ffffff' });
    crear('a-box', { width: L, height: 0.03, depth: A + 0.04, position: '0 -0.075 0', color: '#6b8e23' });
    // Cada raya se ve arriba (centro del carril) y en la cara frontal
    this.rayas = [];
    for (let i = 0; i < 12; i++) {
      const raya = crear('a-entity', {});
      crear('a-box', { width: 0.08, height: 0.004, depth: 0.012, position: '0 0.002 0', color: '#ffd166' }, raya);
      crear('a-box', { width: 0.08, height: 0.01, depth: 0.004, position: `0 -0.03 ${A / 2 + 0.002}`, color: '#ffd166' }, raya);
      this.rayas.push(raya);
    }

    this.ciclista = crear('a-entity', { position: `${CONFIG.posicionCiclista} 0 0` });
    // El pivote a media altura hace que el giro del truco sea sobre el centro de la bici
    this.pivote = crear('a-entity', { position: '0 0.08 0' }, this.ciclista);
    this.cuerpo = crear('a-entity', {
      position: '0 -0.08 0',
      'modelo-ajustado': 'src: #modelo-bici; largo: 0.24; respaldo: bici; alinearX: true',
    }, this.pivote);

    // Grupo de objetos reutilizables por tipo, para no crear entidades cada vez
    this.reserva = { cono: [], valla: [], rampa: [] };
    const modelos = {
      cono: ['src: #modelo-cono; largo: 0.09; respaldo: cono', 4],
      valla: ['src: #modelo-valla; largo: 0.16; respaldo: valla; alinearX: true', 3],
      rampa: ['src: #modelo-rampa; largo: 0.2; respaldo: rampa; alinearX: true', 3],
    };
    for (const [tipo, [attrs, cantidad]] of Object.entries(modelos)) {
      for (let i = 0; i < cantidad; i++) {
        this.reserva[tipo].push(crear('a-entity', { visible: false, 'modelo-ajustado': attrs }));
      }
    }

    // Meta: piso a cuadros y un arco con bandera que se ve de lado
    this.meta = crear('a-entity', { visible: false });
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 2; j++) {
        crear('a-box', {
          width: 0.04, height: 0.006, depth: A / 8,
          position: `${j * 0.04} 0.002 ${-A / 2 + A / 16 + i * (A / 8)}`,
          color: (i + j) % 2 ? '#000' : '#fff',
        }, this.meta);
      }
    }
    for (const z of [A / 2, -A / 2]) {
      crear('a-box', { width: 0.02, height: 0.32, depth: 0.02, position: `0.02 0.16 ${z}`, color: '#ffffff' }, this.meta);
    }
    // Bandera a cuadros arriba del arco
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 4; j++) {
        crear('a-box', {
          width: 0.035, height: 0.035, depth: 0.035,
          position: `${0.0025 + i * 0.035} ${0.3 + j * 0.035 - 0.035} ${A / 2}`,
          color: (i + j) % 2 ? '#000' : '#fff',
        }, this.meta);
      }
    }
    crear('a-box', { width: 0.02, height: 0.02, depth: A, position: '0.02 0.31 0', color: '#ffffff' }, this.meta);
  },

  // ---------- Controles ----------

  conectarBotones() {
    const btnAvanzar = Interfaz.$('btn-avanzar');
    const btnBrincar = Interfaz.$('btn-brincar');

    const presionar = (boton) => {
      boton.classList.add('presionado');
      Sonidos.clic();
      vibrar(30);
    };
    const soltar = (boton) => boton.classList.remove('presionado');

    btnAvanzar.addEventListener('pointerdown', (e) => { e.preventDefault(); presionar(btnAvanzar); this.avanzando = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
      btnAvanzar.addEventListener(ev, () => { soltar(btnAvanzar); this.avanzando = false; }));

    btnBrincar.addEventListener('pointerdown', (e) => { e.preventDefault(); presionar(btnBrincar); this.brincar(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btnBrincar.addEventListener(ev, () => soltar(btnBrincar)));

    // Teclado para probar en computadora: flecha derecha = avanzar, espacio = brincar
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowRight' && !this.avanzando) { presionar(btnAvanzar); this.avanzando = true; }
      if (e.code === 'Space') { e.preventDefault(); presionar(btnBrincar); this.brincar(); }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowRight') { soltar(btnAvanzar); this.avanzando = false; }
      if (e.code === 'Space') soltar(btnBrincar);
    });

    Interfaz.$('btn-jugar').addEventListener('click', () => this.empezar());
    Interfaz.$('btn-reintentar').addEventListener('click', () => this.empezar());
  },

  // ---------- Partida ----------

  empezar() {
    Sonidos.iniciar();
    Sonidos.clic();
    vibrar(30);
    this.estado = {
      jugando: true,
      distancia: 0,        // en unidades
      velocidad: 0,
      metros: 0,
      puntos: 0,
      puntosMetros: 0,
      vidas: CONFIG.vidas,
      tiempo: CONFIG.tiempoLimite,
      altura: 0,
      velocidadVertical: 0,
      enAire: false,
      haciendoTruco: false,
      giroTruco: 0,
      combo: 0,
      invulnerable: 0,
      obstaculos: [],
      siguienteObstaculo: 2.2,
    };
    this.pivote.object3D.rotation.set(0, 0, 0);
    this.cuerpo.object3D.visible = true;
    Interfaz.mostrar('pantalla-inicio', false);
    Interfaz.mostrar('pantalla-final', false);
    Interfaz.mostrar('hud', true);
    Interfaz.mostrar('controles', true);
    Interfaz.mostrar('aviso-marcador', !this.marcadorVisible);
    Interfaz.actualizar(this.estado);
  },

  cambiarVisibilidad(visible) {
    this.marcadorVisible = visible;
    if (this.estado && this.estado.jugando) Interfaz.mostrar('aviso-marcador', !visible);
  },

  brincar() {
    const e = this.estado;
    if (!e || !e.jugando || !this.marcadorVisible || e.enAire) return;
    e.enAire = true;
    e.velocidadVertical = CONFIG.impulsoBrinco;
    Sonidos.brinco();

    // Si brinca justo sobre una rampa, hace truco
    const rampa = e.obstaculos.find((o) => o.tipo === 'rampa' && !o.usada && Math.abs(this.posicionRelativa(o)) < 0.14);
    if (rampa) {
      rampa.usada = true;
      e.velocidadVertical *= 1.25;
      e.haciendoTruco = true;
      e.giroTruco = 0;
    }
  },

  posicionRelativa(obstaculo) {
    return obstaculo.distancia - this.estado.distancia;
  },

  tipoAlAzar() {
    let r = Math.random();
    for (const [tipo, datos] of Object.entries(OBSTACULOS)) {
      r -= datos.probabilidad;
      if (r < 0) return tipo;
    }
    return 'cono';
  },

  generarObstaculos() {
    const e = this.estado;
    const metaUnidades = CONFIG.metaMetros / CONFIG.metrosPorUnidad;
    while (e.siguienteObstaculo < e.distancia + CONFIG.largoPista && e.siguienteObstaculo < metaUnidades - 0.5) {
      const tipo = this.tipoAlAzar();
      const libre = this.reserva[tipo].find((el) => !e.obstaculos.some((o) => o.el === el));
      if (libre) e.obstaculos.push({ tipo, el: libre, distancia: e.siguienteObstaculo, pasado: false, usada: false });
      // Espacio suficiente para aterrizar y volver a brincar a velocidad maxima
      e.siguienteObstaculo += (tipo === 'rampa' ? 2.0 : 1.4) + Math.random() * 0.7;
    }
  },

  revisarChoques() {
    const e = this.estado;
    for (const o of e.obstaculos) {
      const rel = this.posicionRelativa(o);
      const datos = OBSTACULOS[o.tipo];
      if (o.tipo === 'rampa' || o.pasado) continue;
      if (Math.abs(rel) < datos.medio && e.altura < datos.alto && e.invulnerable <= 0) {
        o.pasado = true;
        this.chocar();
      } else if (rel < -datos.medio) {
        o.pasado = true;
        e.puntos += datos.puntos;
        Sonidos.esquivar();
        Interfaz.aviso(`+${datos.puntos}`);
      }
    }
    // Se liberan los que ya quedaron atras
    e.obstaculos = e.obstaculos.filter((o) => {
      if (CONFIG.posicionCiclista + this.posicionRelativa(o) < -CONFIG.largoPista / 2) { o.el.object3D.visible = false; return false; }
      return true;
    });
  },

  chocar() {
    const e = this.estado;
    e.vidas -= 1;
    e.combo = 0;
    e.velocidad *= 0.3;
    e.invulnerable = CONFIG.invulnerable;
    Sonidos.choque();
    vibrar([100, 50, 100]);
    Interfaz.destello('rojo');
    Interfaz.aviso('¡CHOQUE!', 'malo');
    if (e.vidas <= 0) this.terminar(false);
  },

  aterrizar() {
    const e = this.estado;
    e.enAire = false;
    e.altura = 0;
    e.velocidadVertical = 0;
    if (e.haciendoTruco) {
      e.haciendoTruco = false;
      e.combo += 1;
      const ganados = CONFIG.puntos.truco * (e.combo >= 2 ? 2 : 1);
      e.puntos += ganados;
      Sonidos.truco();
      vibrar(60);
      Interfaz.destello('dorado');
      Interfaz.aviso(e.combo >= 2 ? `+${ganados} ¡COMBO x2!` : `+${ganados} ¡TRUCO!`, 'truco');
      this.pivote.object3D.rotation.z = 0;
    }
  },

  terminar(gano) {
    const e = this.estado;
    e.jugando = false;
    this.avanzando = false;
    if (gano) {
      e.puntos += Math.ceil(e.tiempo) * CONFIG.puntos.segundoSobrante;
      Sonidos.meta();
      vibrar([80, 40, 80, 40, 200]);
    } else {
      Sonidos.gameOver();
      vibrar(400);
    }
    const record = Interfaz.leerRecord();
    const nuevoRecord = e.puntos > record;
    if (nuevoRecord) Interfaz.guardarRecord(e.puntos);

    Interfaz.$('final-titulo').textContent = gano ? '¡META!' : 'GAME OVER';
    Interfaz.$('final-motivo').textContent = gano
      ? `Llegaste a ${CONFIG.metaMetros} m con ${Math.ceil(e.tiempo)} s de sobra.`
      : (e.vidas <= 0 ? 'Te quedaste sin vidas.' : 'Se acabó el tiempo.');
    Interfaz.$('final-puntos').textContent = e.puntos;
    Interfaz.$('final-record').textContent = nuevoRecord ? `¡Nuevo récord!` : `Récord: ${record}`;
    Interfaz.actualizar(e);
    Interfaz.mostrar('controles', false);
    Interfaz.mostrar('aviso-marcador', false);
    Interfaz.mostrar('pantalla-final', true);
  },

  // ---------- Ciclo principal ----------

  tick(tiempo, delta) {
    const e = this.estado;
    if (!e || !e.jugando || !this.marcadorVisible) return;
    const dt = Math.min(delta / 1000, 0.05); // evita saltos grandes si el telefono se traba

    // Movimiento horizontal
    if (this.avanzando) e.velocidad = Math.min(CONFIG.velocidadMax, e.velocidad + CONFIG.aceleracion * dt);
    else e.velocidad = Math.max(0, e.velocidad - CONFIG.frenado * dt);
    e.distancia += e.velocidad * dt;

    // Puntos por distancia
    e.metros = Math.floor(e.distancia * CONFIG.metrosPorUnidad);
    if (e.metros > e.puntosMetros) {
      e.puntos += (e.metros - e.puntosMetros) * CONFIG.puntos.metro;
      e.puntosMetros = e.metros;
    }

    // Brinco y truco
    if (e.enAire) {
      e.velocidadVertical -= CONFIG.gravedad * dt;
      e.altura += e.velocidadVertical * dt;
      if (e.haciendoTruco) {
        e.giroTruco = Math.min(Math.PI * 2, e.giroTruco + dt * 9);
        this.pivote.object3D.rotation.z = e.giroTruco;
      }
      if (e.altura <= 0) this.aterrizar();
    }

    // Parpadeo mientras es invulnerable
    if (e.invulnerable > 0) {
      e.invulnerable -= dt;
      this.cuerpo.object3D.visible = e.invulnerable <= 0 || Math.floor(e.invulnerable * 10) % 2 === 0;
    }

    // Pequeno rebote al pedalear
    const rebote = !e.enAire && e.velocidad > 0.1 ? Math.abs(Math.sin(tiempo / 70)) * 0.006 : 0;
    this.ciclista.object3D.position.y = e.altura + rebote;

    this.generarObstaculos();
    this.revisarChoques();
    if (!e.jugando) return;

    // Posicion visual de obstaculos, rayas y meta
    for (const o of e.obstaculos) {
      const x = CONFIG.posicionCiclista + this.posicionRelativa(o);
      o.el.object3D.position.set(x, 0, 0);
      o.el.object3D.visible = Math.abs(x) < CONFIG.largoPista / 2;
    }
    this.rayas.forEach((raya, i) => {
      const L = CONFIG.largoPista;
      const x = ((i * (L / 12) - e.distancia) % L + L) % L - L / 2;
      raya.object3D.position.x = x;
    });
    const xMeta = CONFIG.posicionCiclista + CONFIG.metaMetros / CONFIG.metrosPorUnidad - e.distancia;
    this.meta.object3D.visible = Math.abs(xMeta) < CONFIG.largoPista / 2;
    this.meta.object3D.position.x = xMeta;

    // Tiempo y fin de partida
    e.tiempo -= dt;
    Interfaz.actualizar(e);
    if (e.metros >= CONFIG.metaMetros) this.terminar(true);
    else if (e.tiempo <= 0) { e.tiempo = 0; this.terminar(false); }
  },
});
