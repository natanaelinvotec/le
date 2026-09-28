"""Gera os ícones da Rede a partir do brasão real do grupo (assets/marca/brasao-1024.png).

Ideia visual: o brasão dentro de um "anel de story" (verde → verde-azulado → dourado),
que é o símbolo universal de rede social, sobre o fundo institucional, com a
etiqueta REDE embaixo. Fica claramente "o mesmo grupo", mas diferente do ícone do app.

Uso (na raiz do repositório):  python3 tools/gerar-icones-rede.py
Precisa de Pillow e de uma fonte negrito (Poppins/Montserrat; ajuste FONTE se preciso).
Para outra escola (white-label): troque o brasão em assets/ e rode de novo.
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
BRASAO = RAIZ / 'assets' / 'marca' / 'brasao-1024.png'  # original em alta (as páginas não carregam)
FONTES = ['/usr/share/fonts/truetype/google-fonts/Montserrat-ExtraBold.ttf',
          '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf',
          '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']
TEAL, NAVY, VERDE, DOURADO = (56, 158, 146), (0, 45, 114), (0, 230, 118), (218, 165, 32)
N = 1024  # desenha grande e reduz (bordas lisas)


def fonte(tam):
    for f in FONTES:
        if Path(f).exists():
            return ImageFont.truetype(f, tam)
    return ImageFont.load_default()


def degrade_vertical(w, h, c1, c2):
    g = Image.new('RGB', (1, h))
    for y in range(h):
        t = y / (h - 1)
        g.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(c1, c2)))
    return g.resize((w, h))


def anel_story(tam, espessura):
    """Anel com degradê angular verde → verde-azulado → dourado → verde."""
    paradas = [VERDE, TEAL, DOURADO, VERDE]
    img = Image.new('RGBA', (tam, tam), (0, 0, 0, 0))
    px = img.load()
    c = tam / 2
    r_ext, r_int = c, c - espessura
    for y in range(tam):
        for x in range(tam):
            d = math.hypot(x + .5 - c, y + .5 - c)
            if r_int <= d <= r_ext:
                ang = (math.degrees(math.atan2(y - c, x - c)) + 90) % 360 / 360
                pos = ang * (len(paradas) - 1)
                i = min(int(pos), len(paradas) - 2)
                t = pos - i
                cor = tuple(round(a + (b - a) * t) for a, b in zip(paradas[i], paradas[i + 1]))
                px[x, y] = cor + (255,)
    return img


def emblema(escala):
    """Brasão + anel + etiqueta REDE, centrado num quadro N×N transparente.
    escala = fração do quadro ocupada pelo anel (0.80 normal, 0.62 maskable)."""
    quadro = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d_anel = round(N * escala)
    esp = round(d_anel * 0.055)
    folga = round(d_anel * 0.03)  # espaço entre anel e brasão (mostra o fundo)
    ox = (N - d_anel) // 2
    oy = (N - d_anel) // 2 - round(N * 0.03)
    # sombra suave atrás do conjunto
    sombra = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(sombra).ellipse([ox, oy + 18, ox + d_anel, oy + d_anel + 18], fill=(0, 10, 30, 120))
    quadro.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(28)))
    quadro.alpha_composite(anel_story(d_anel, esp), (ox, oy))
    # disco branco de fundo do brasão + brasão recortado em círculo
    d_int = d_anel - 2 * (esp + folga)
    disco = Image.new('RGBA', (d_int, d_int), (0, 0, 0, 0))
    ImageDraw.Draw(disco).ellipse([0, 0, d_int - 1, d_int - 1], fill=(255, 255, 255, 255))
    b = Image.open(BRASAO).convert('RGBA').resize((d_int, d_int), Image.LANCZOS)
    mascara = Image.new('L', (d_int, d_int), 0)
    ImageDraw.Draw(mascara).ellipse([0, 0, d_int - 1, d_int - 1], fill=255)
    b.putalpha(Image.composite(b.getchannel('A'), mascara, mascara))
    disco.alpha_composite(b)
    quadro.alpha_composite(disco, (ox + esp + folga, oy + esp + folga))
    # etiqueta REDE sobre a base do anel
    f = fonte(round(d_anel * 0.13))
    txt = 'REDE'
    caixa = ImageDraw.Draw(quadro).textbbox((0, 0), txt, font=f)
    tw, th = caixa[2] - caixa[0], caixa[3] - caixa[1]
    pw, ph = tw + round(d_anel * 0.16), th + round(d_anel * 0.085)
    px0 = (N - pw) // 2
    py0 = oy + d_anel - round(ph * 0.62)
    etiqueta = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    de = ImageDraw.Draw(etiqueta)
    de.rounded_rectangle([px0, py0 + 10, px0 + pw, py0 + ph + 10], radius=ph // 2, fill=(0, 10, 30, 110))
    etiqueta = etiqueta.filter(ImageFilter.GaussianBlur(10))
    de = ImageDraw.Draw(etiqueta)
    de.rounded_rectangle([px0, py0, px0 + pw, py0 + ph], radius=ph // 2, fill=VERDE + (255,), outline=(255, 255, 255, 255), width=max(6, round(d_anel * 0.012)))
    de.text((N // 2, py0 + ph // 2), txt, font=f, fill=NAVY + (255,), anchor='mm')
    quadro.alpha_composite(etiqueta)
    return quadro


def fundo(cantos):
    base = degrade_vertical(N, N, TEAL, NAVY).convert('RGBA')
    # brilho no topo
    brilho = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(brilho).ellipse([-N * .2, -N * .55, N * 1.2, N * .45], fill=(255, 255, 255, 38))
    base.alpha_composite(brilho.filter(ImageFilter.GaussianBlur(60)))
    if cantos:
        m = Image.new('L', (N, N), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, N - 1, N - 1], radius=round(N * 0.22), fill=255)
        base.putalpha(m)
    return base


def salvar(img, nome, tam, rgb=False):
    out = img.resize((tam, tam), Image.LANCZOS)
    if rgb:
        out = out.convert('RGB')
    # 256 cores com pontilhado: ~4x menor e sem diferença visível no ícone
    out = out.quantize(colors=256, method=Image.FASTOCTREE if out.mode == 'RGBA' else Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    out.save(RAIZ / 'assets' / nome, optimize=True)
    print('ok', nome, tam)


normal = fundo(cantos=True); normal.alpha_composite(emblema(0.80))
maskable = fundo(cantos=False); maskable.alpha_composite(emblema(0.64))  # zona segura: círculo de 80%
apple = fundo(cantos=False); apple.alpha_composite(emblema(0.78))         # o iPhone arredonda sozinho

salvar(normal, 'rede-icon-512.png', 512)
salvar(normal, 'rede-icon-192.png', 192)
salvar(maskable, 'rede-icon-maskable-512.png', 512, rgb=True)
salvar(maskable, 'rede-icon-maskable-192.png', 192, rgb=True)
salvar(apple, 'rede-apple-touch-icon.png', 180, rgb=True)
