// Carga un modelo GLB, lo escala a un tamano fijo y lo apoya en el suelo.
// Si el archivo no existe o falla, dibuja una figura sencilla para que el juego siga funcionando.
AFRAME.registerComponent('modelo-ajustado', {
  schema: {
    src: { type: 'string' },      // id del <a-asset-item>, por ejemplo #modelo-bici
    largo: { type: 'number', default: 0.2 }, // medida del lado mas largo, en anchos de marcador
    giroY: { type: 'number', default: 0 },   // giro extra en grados si el modelo mira hacia otro lado
    respaldo: { type: 'string', default: 'cono' }, // figura de respaldo: bici, cono o rampa
    alinearX: { type: 'boolean', default: false },  // gira el modelo para que su lado largo siga la pista
  },

  init() {
    this.contenedor = document.createElement('a-entity');
    this.el.appendChild(this.contenedor);
    this.contenedor.addEventListener('model-loaded', () => this.ajustar());
    this.contenedor.addEventListener('model-error', () => this.usarRespaldo());
    const asset = document.querySelector(this.data.src);
    if (asset && !asset.dataset.fallo) {
      this.contenedor.setAttribute('gltf-model', this.data.src);
    } else {
      this.usarRespaldo();
    }
  },

  ajustar() {
    const THREE = AFRAME.THREE;
    const malla = this.contenedor.getObject3D('mesh');
    const padre = malla.parent;
    // Se mide fuera de la escena para que la pose del marcador no afecte la caja
    padre.remove(malla);
    const medir = () => {
      malla.updateMatrixWorld(true);
      const caja = new THREE.Box3().setFromObject(malla);
      return { caja, tam: caja.getSize(new THREE.Vector3()) };
    };

    malla.rotation.y = THREE.MathUtils.degToRad(this.data.giroY);
    let { tam } = medir();
    if (this.data.alinearX && tam.z > tam.x) {
      malla.rotation.y += Math.PI / 2;
      ({ tam } = medir());
    }
    // Los modelos vienen en distintas escalas: se normalizan al largo pedido
    malla.scale.multiplyScalar(this.data.largo / Math.max(tam.x, tam.y, tam.z));
    const { caja } = medir();
    const centro = caja.getCenter(new THREE.Vector3());
    // Centrado en x/z y con la base tocando el suelo (y = 0)
    malla.position.x -= centro.x;
    malla.position.z -= centro.z;
    malla.position.y -= caja.min.y;
    padre.add(malla);
  },

  usarRespaldo() {
    const asset = document.querySelector(this.data.src);
    if (asset) asset.dataset.fallo = '1';
    this.contenedor.removeAttribute('gltf-model');
    const l = this.data.largo;
    const piezas = {
      bici: [
        ['a-torus', { radius: l * 0.22, 'radius-tubular': l * 0.025, position: `${-l * 0.3} ${l * 0.22} 0`, color: '#222' }],
        ['a-torus', { radius: l * 0.22, 'radius-tubular': l * 0.025, position: `${l * 0.3} ${l * 0.22} 0`, color: '#222' }],
        ['a-box', { width: l * 0.6, height: l * 0.04, depth: l * 0.04, position: `0 ${l * 0.36} 0`, rotation: '0 0 -10', color: '#e63946' }],
        ['a-box', { width: l * 0.08, height: l * 0.35, depth: l * 0.08, position: `${-l * 0.05} ${l * 0.6} 0`, color: '#1d3557' }],
        ['a-sphere', { radius: l * 0.08, position: `${-l * 0.02} ${l * 0.85} 0`, color: '#f1c27d' }],
      ],
      cono: [
        ['a-cone', { 'radius-bottom': l * 0.35, 'radius-top': l * 0.04, height: l, position: `0 ${l / 2} 0`, color: '#ff7b00' }],
        ['a-cylinder', { radius: l * 0.25, height: l * 0.12, position: `0 ${l * 0.45} 0`, color: '#ffffff' }],
      ],
      rampa: [
        ['a-box', { width: l, height: l * 0.05, depth: l * 0.6, position: `0 ${l * 0.17} 0`, rotation: '0 0 20', color: '#8d6e63' }],
        ['a-box', { width: l * 0.05, height: l * 0.34, depth: l * 0.6, position: `${l * 0.47} ${l * 0.17} 0`, color: '#6d4c41' }],
      ],
    };
    for (const [etiqueta, attrs] of piezas[this.data.respaldo]) {
      const pieza = document.createElement(etiqueta);
      for (const [k, v] of Object.entries(attrs)) pieza.setAttribute(k, v);
      this.contenedor.appendChild(pieza);
    }
  },
});
