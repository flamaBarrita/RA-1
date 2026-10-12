# Modelos 3D

El juego carga tres archivos GLB desde esta carpeta. Si alguno falta, dibuja una figura sencilla en su lugar para que el juego no se rompa.

| Archivo | Modelo | Autor | Licencia | Descarga |
|---|---|---|---|---|
| `bici.glb` | Bike | MiniPoly | CC BY 3.0 (pide dar crédito) | https://poly.pizza/m/DN6DCPopeH |
| `cono.glb` | Traffic Cone | Quaternius | CC0 (dominio público) | https://poly.pizza/m/lAx8JytxGD |
| `rampa.glb` | Ramp | Quaternius | CC0 (dominio público) | https://poly.pizza/m/cS1JQReXZs |

Pasos:
1. Abre cada enlace y presiona **Download** → formato **GLB**.
2. Renombra el archivo exactamente como en la primera columna y guárdalo aquí.
3. No hace falta escalarlos: `js/modelos.js` los ajusta al tamaño correcto y los apoya sobre la pista.
4. Si alguno queda mirando al revés, cambia `giroY` (por ejemplo `giroY: 180`) en `js/juego.js`.

Antes de entregar, revisa en la página de cada modelo que la licencia siga siendo la misma.
