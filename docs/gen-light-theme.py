#!/usr/bin/env python3
"""Sinh CSS giao diện SÁNG từ các class Tailwind màu trung tính đang dùng trong js/app.jsx.
Chạy:  python3 tools/gen-light-theme.py   -> ghi khối CSS vào css/styles.css (giữa 2 dòng đánh dấu).
Khi thêm class màu mới (bg-zinc-..., text-gray-...) hãy chạy lại để chế độ sáng đẹp ở chỗ mới."""
import re, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'js/app.jsx'), encoding='utf-8').read()
css_path = os.path.join(ROOT, 'css/styles.css')
ZINC = {50:'#fafafa',100:'#f4f4f5',200:'#e4e4e7',300:'#d4d4d8',400:'#a1a1aa',500:'#71717a',600:'#52525b',700:'#3f3f46',800:'#27272a',900:'#18181b',950:'#09090b'}
GRAY = {50:'#f9fafb',100:'#f3f4f6',200:'#e5e7eb',300:'#d1d5db',400:'#9ca3af',500:'#6b7280',600:'#4b5563',700:'#374151',800:'#1f2937',900:'#111827',950:'#030712'}
FLIP = {950:50, 900:100, 800:200, 700:300, 600:400, 500:500, 400:600, 300:700, 200:800, 100:900, 50:950}
# màu chữ sáng -> bản đậm hơn cho nền sáng
DARKEN = {'yellow':'#a16207','cyan':'#0e7490','emerald':'#047857','green':'#15803d','red':'#dc2626','orange':'#c2410c','indigo':'#4338ca','pink':'#be185d','purple':'#7e22ce','blue':'#1d4ed8','amber':'#b45309','teal':'#0f766e','lime':'#4d7c0f','sky':'#0369a1','rose':'#be123c','fuchsia':'#a21caf','violet':'#6d28d9'}
SATURATED_BG = ['indigo','emerald','cyan','blue','red','green','orange','purple','pink','sky','teal','violet','rose','fuchsia','amber','yellow','lime']
def esc(cls): return re.sub(r'([^a-zA-Z0-9_-])', r'\\\1', cls)
def hex2rgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def color(name, alpha):
    if name == 'black': h = '#ffffff'            # nền đen -> trắng
    elif name == 'white': h = '#18181b'          # chữ/viền trắng -> gần đen
    else:
        fam, sh = name.split('-'); pal = GRAY if fam == 'gray' else ZINC
        h = pal[FLIP[int(sh)]]
    if alpha is None: return h
    r,g,b = hex2rgb(h); return 'rgba(%d,%d,%d,%.2f)' % (r,g,b,int(alpha)/100)
pal = r'(?:black|white|zinc-\d+|gray-\d+)'
pat = re.compile(r'(?<![\w:-])((?:hover:|focus:|active:|disabled:)?)((bg|text|border|border-[lrtbxy]|from|to|via|divide|ring|placeholder)-(' + pal + r')(?:/(\d+))?)(?![\w-])')
toks = sorted(set(m.groups() for m in pat.finditer(src)))
P = 'html[data-theme="light"] '
out = []
for variant, full, kind, name, alpha in toks:
    if full in ('bg-white','text-black') or (kind=='border' and name in ('black',)) and False: continue
    if (kind, name) == ('bg','white') or (kind, name) == ('text','black'): continue
    cls = variant + full; sel = P + '.' + esc(cls)
    if variant: sel += ':' + variant[:-1]
    c = color(name, alpha)
    if kind == 'bg': out.append('%s{background-color:%s}' % (sel, c))
    elif kind == 'text': out.append('%s{color:%s}' % (sel, c))
    elif kind == 'border': out.append('%s{border-color:%s}' % (sel, c))
    elif kind.startswith('border-'):
        side = {'l':['left'],'r':['right'],'t':['top'],'b':['bottom'],'x':['left','right'],'y':['top','bottom']}[kind[-1]]
        out.append('%s{%s}' % (sel, ';'.join('border-%s-color:%s' % (s, c) for s in side)))
    elif kind == 'divide': out.append('%s > :not([hidden]) ~ :not([hidden]){border-color:%s}' % (P + '.' + esc(cls), c))
    elif kind == 'ring': out.append('%s{--tw-ring-color:%s}' % (sel, c))
    elif kind == 'placeholder': out.append('%s::placeholder{color:%s}' % (P + '.' + esc(cls), c))
    elif kind == 'from': out.append('%s{--tw-gradient-from:%s var(--tw-gradient-from-position);--tw-gradient-to:rgba(255,255,255,0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}' % (sel, c))
    elif kind == 'to': out.append('%s{--tw-gradient-to:%s var(--tw-gradient-to-position)}' % (sel, c))
    elif kind == 'via': out.append('%s{--tw-gradient-stops:var(--tw-gradient-from),%s var(--tw-gradient-via-position),var(--tw-gradient-to)}' % (sel, c))
# chữ màu neon -> đậm hơn
cpat = re.compile(r'(?<![\w:-])((?:hover:|focus:)?)(text-(' + '|'.join(DARKEN) + r')-(?:100|200|300|400))(?![\w-])')
for variant, full, hue in sorted(set(m.groups() for m in cpat.finditer(src))):
    sel = P + '.' + esc(variant + full) + (':' + variant[:-1] if variant else '')
    out.append('%s{color:%s}' % (sel, DARKEN[hue]))
# chữ trắng trên nền màu đậm: giữ trắng
sat = ','.join('[class*="bg-%s-%d"],[class*="from-%s-%d"]' % (h, s, h, s) for h in SATURATED_BG for s in (5,6,7,8,9))
out.append(P + ':is(' + sat + ').text-white{color:#ffffff}')
block = '/* ===== THEME LIGHT (tự sinh bằng tools/gen-light-theme.py) BẮT ĐẦU ===== */\n' + '\n'.join(out) + '\n/* ===== THEME LIGHT KẾT THÚC ===== */\n'
css = open(css_path, encoding='utf-8').read()
css = re.sub(r'\n?/\* ===== THEME LIGHT \(tự sinh.*?THEME LIGHT KẾT THÚC ===== \*/\n', '\n', css, flags=re.S)
extra = '''
/* ===== THEME: nền, phần tử tuỳ chỉnh ở chế độ sáng ===== */
html[data-theme="light"] { color-scheme: light; }
html[data-theme="dark"] { color-scheme: dark; }
html[data-theme="light"] body { background: #e7e7ea; color: #18181b; }
html[data-theme="light"] select { color-scheme: light; }
html[data-theme="light"] .ui-icon-btn { background: rgba(255,255,255,.75); border-color: #d4d4d8; }
html[data-theme="light"] .ui-chip { background: rgba(255,255,255,.85); }
html[data-theme="light"] .lb-tab { color: #52525b; }
html[data-theme="light"] .lb-tab-on { color: #a16207; background: linear-gradient(180deg, rgba(234,179,8,.28), rgba(234,179,8,.08)); }
html[data-theme="light"] .rew-gold { color: #a16207; } html[data-theme="light"] .rew-silver { color: #3f3f46; } html[data-theme="light"] .rew-bronze { color: #c2410c; }
html[data-theme="light"] .custom-scrollbar { scrollbar-color: #b8860b #e4e4e7; }
html[data-theme="light"] .landscape-fs { background: #000; color: #f5f5dc; }
html[data-theme="light"] .landscape-fs .text-white { color: #fff; }
'''
css = css.rstrip('\n') + '\n\n' + block + extra
open(css_path, 'w', encoding='utf-8').write(css)
print('đã sinh', len(out), 'luật CSS chế độ sáng')
