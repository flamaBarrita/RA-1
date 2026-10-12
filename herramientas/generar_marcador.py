"""Genera el marcador personalizado: un QR con logo de bici y un marco ilustrado.

El QR apunta al juego publicado, asi que al escanearlo con la camara normal
abre la pagina, y el marco da suficiente detalle para que MindAR lo siga
de forma estable.

Uso: python3 herramientas/generar_marcador.py [URL]
"""
import math
import sys
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

URL = sys.argv[1] if len(sys.argv) > 1 else "https://bici-trick-ra.vercel.app/"
SALIDA = Path(__file__).resolve().parent.parent / "marcador"
TAM = 1200  # lado del marcador en pixeles
NEGRO, BLANCO = (0, 0, 0), (255, 255, 255)
FUENTE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def dibujar_bici(d, cx, cy, s, ancho):
    """Bici sencilla con lineas: dos ruedas, cuadro, manubrio y asiento."""
    r = s * 0.28
    ra, rb = (cx - s * 0.5, cy + s * 0.15), (cx + s * 0.5, cy + s * 0.15)
    for x, y in (ra, rb):
        d.ellipse([x - r, y - r, x + r, y + r], outline=NEGRO, width=ancho)
        d.ellipse([x - ancho, y - ancho, x + ancho, y + ancho], fill=NEGRO)
    pedal = (cx - s * 0.05, cy + s * 0.15)
    asiento = (cx - s * 0.2, cy - s * 0.3)
    manubrio = (cx + s * 0.35, cy - s * 0.35)
    for a, b in [(ra, pedal), (pedal, asiento), (asiento, ra), (pedal, manubrio),
                 (asiento, (cx + s * 0.3, cy - s * 0.22)), (manubrio, rb)]:
        d.line([a, b], fill=NEGRO, width=ancho)
    d.line([(asiento[0] - s * 0.12, asiento[1]), (asiento[0] + s * 0.08, asiento[1])], fill=NEGRO, width=ancho)
    d.line([manubrio, (manubrio[0] + s * 0.12, manubrio[1] - s * 0.05)], fill=NEGRO, width=ancho)


def main():
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=1)
    qr.add_data(URL)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    lado_qr = 640
    img_qr = img_qr.resize((lado_qr, lado_qr), Image.NEAREST)

    # Logo de bici al centro (ocupa menos del 20% del QR para que siga leyendose)
    dq = ImageDraw.Draw(img_qr)
    lado_logo = 170
    c = lado_qr // 2
    dq.rounded_rectangle([c - lado_logo // 2, c - lado_logo // 2, c + lado_logo // 2, c + lado_logo // 2],
                         radius=20, fill=BLANCO, outline=NEGRO, width=8)
    dibujar_bici(dq, c, c, lado_logo * 0.6, 7)

    lienzo = Image.new("RGB", (TAM, TAM), BLANCO)
    d = ImageDraw.Draw(lienzo)

    # Marco grueso exterior e interior
    d.rectangle([0, 0, TAM - 1, TAM - 1], fill=NEGRO)
    d.rectangle([60, 60, TAM - 61, TAM - 61], fill=BLANCO)

    # Decoracion asimetrica en las franjas libres alrededor del QR
    def rueda(x, y, t, rayos):
        d.ellipse([x - t, y - t, x + t, y + t], outline=NEGRO, width=10)
        for k in range(rayos):
            ang = k * math.pi * 2 / rayos
            d.line([(x, y), (x + t * math.cos(ang), y + t * math.sin(ang))], fill=NEGRO, width=5)

    def cono(x, y, t):
        d.polygon([(x, y - t), (x - t * 0.7, y + t), (x + t * 0.7, y + t)], fill=NEGRO)
        d.line([(x - t * 0.42, y + t * 0.25), (x + t * 0.42, y + t * 0.25)], fill=BLANCO, width=9)

    rueda(150, 150, 55, 5)
    cono(1050, 150, 50)
    # Columna izquierda: rueda, flecha y rampa
    rueda(165, 360, 60, 7)
    d.line([(100, 640), (230, 520)], fill=NEGRO, width=12)
    d.polygon([(250, 500), (190, 515), (235, 560)], fill=NEGRO)
    d.polygon([(85, 880), (255, 880), (255, 720)], fill=NEGRO)
    # Columna derecha: zigzag (pista), montana y rueda pequena
    zig = [(1030 + (40 if k % 2 else -40), 280 + k * 50) for k in range(7)]
    d.line(zig, fill=NEGRO, width=14, joint="curve")
    d.polygon([(960, 740), (1030, 640), (1070, 690), (1115, 740)], fill=NEGRO)
    rueda(1040, 830, 45, 4)
    # Franja inferior: conos en las esquinas y lineas de meta
    cono(140, 1060, 45)
    for i in range(6):
        for j in range(2):
            if (i + j) % 2 == 0:
                d.rectangle([960 + i * 25, 1030 + j * 25, 985 + i * 25, 1055 + j * 25], fill=NEGRO)

    # QR centrado con marco propio
    x0 = (TAM - lado_qr) // 2
    y0 = 250
    d.rectangle([x0 - 20, y0 - 20, x0 + lado_qr + 19, y0 + lado_qr + 19], fill=NEGRO)
    d.rectangle([x0 - 8, y0 - 8, x0 + lado_qr + 7, y0 + lado_qr + 7], fill=BLANCO)
    lienzo.paste(img_qr, (x0, y0))

    # Titulo arriba y pie abajo
    f_titulo = ImageFont.truetype(FUENTE, 84)
    f_pie = ImageFont.truetype(FUENTE, 46)
    d.rectangle([225, 95, TAM - 225, 205], fill=NEGRO)
    d.text((TAM / 2, 150), "BICI TRICK RA", font=f_titulo, fill=BLANCO, anchor="mm")
    d.text((TAM / 2, 970), "ESCANEA · APUNTA · JUEGA", font=f_pie, fill=NEGRO, anchor="mm")
    d.line([(300, 1030), (TAM - 300, 1030)], fill=NEGRO, width=10)
    d.line([(380, 1085), (TAM - 450, 1085)], fill=NEGRO, width=6)

    SALIDA.mkdir(exist_ok=True)
    lienzo.save(SALIDA / "marcador.png")
    lienzo.save(SALIDA / "marcador.pdf", resolution=200)  # 1200 px a 200 ppp = 15.2 cm
    print("Marcador guardado en", SALIDA)


if __name__ == "__main__":
    main()
