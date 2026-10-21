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

# ===================== CHẾ ĐỘ HỌC TẬP: màu cơ bản (trắng, be, xanh lam, đỏ) =====================
BEIGE = {50:'#fdfbf6',100:'#f8f3e8',200:'#eee6d3',300:'#ddd2b9',400:'#a89f8a',500:'#7a7260',600:'#5a5445',700:'#443f33',800:'#2c2922',900:'#1c1a16',950:'#14120f'}
ACCENT = ['yellow','amber','orange','cyan','sky','indigo','purple','violet','fuchsia','pink','teal']   # mọi màu "rực" -> xanh lam
SL = 'html[data-ui="study"][data-theme="light"] '   # lớp phủ cho Học tập + nền sáng
SD = 'html[data-ui="study"][data-theme="dark"] '    # lớp phủ cho Học tập + nền tối
def beige_color(name, alpha):
    if name == 'black': h = '#ffffff'
    elif name == 'white': h = '#1c1917'
    else: fam, sh = name.split('-'); h = BEIGE[FLIP[int(sh)]]
    if alpha is None: return h
    r,g,b = hex2rgb(h); return 'rgba(%d,%d,%d,%.2f)' % (r,g,b,int(alpha)/100)
def blue_for(kind, sh, alpha, dark):
    a = None if alpha is None else int(alpha)/100
    def rgba(r,g,b,al): return 'rgba(%d,%d,%d,%.2f)' % (r,g,b,al)
    if kind == 'text':
        if dark: return '#93c5fd' if sh <= 300 else '#60a5fa'
        return '#1d4ed8' if sh <= 600 else ('#1e40af' if sh <= 700 else '#1e3a8a')
    if kind in ('border','ring') or kind.startswith('border-'):
        if sh <= 300: return '#93c5fd'
        return '#3b82f6' if dark or sh <= 500 else '#2563eb'
    # nền / gradient
    if sh <= 300: return rgba(219,234,254,a) if a is not None else '#dbeafe'
    if sh <= 400: return '#3b82f6' if a is None else rgba(59,130,246,a)
    if sh <= 700: base = '#2563eb' if sh <= 600 else '#1d4ed8'; return base if a is None else (rgba(37,99,235,a) if sh <= 600 else rgba(29,78,216,a))
    return rgba(37,99,235,.28 if dark else .10)   # 800-950: nền tối trong suốt -> nền xanh nhạt
ahue = '|'.join(ACCENT)
apat = re.compile(r'(?<![\w:-])((?:hover:|focus:|active:|disabled:)?)((bg|text|border|border-[lrtbxy]|from|to|via|ring)-(' + ahue + r')-(\d+)(?:/(\d+))?)(?![\w-])')
sout = []
def emit(prefix, variant, full, kind, val):
    sel = prefix + '.' + esc(variant + full) + (':' + variant[:-1] if variant else '')
    if kind == 'bg': sout.append('%s{background-color:%s}' % (sel, val))
    elif kind == 'text': sout.append('%s{color:%s}' % (sel, val))
    elif kind == 'border': sout.append('%s{border-color:%s}' % (sel, val))
    elif kind.startswith('border-'):
        side = {'l':['left'],'r':['right'],'t':['top'],'b':['bottom'],'x':['left','right'],'y':['top','bottom']}[kind[-1]]
        sout.append('%s{%s}' % (sel, ';'.join('border-%s-color:%s' % (x, val) for x in side)))
    elif kind == 'ring': sout.append('%s{--tw-ring-color:%s}' % (sel, val))
    elif kind == 'from': sout.append('%s{--tw-gradient-from:%s var(--tw-gradient-from-position);--tw-gradient-to:rgba(255,255,255,0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}' % (sel, val))
    elif kind == 'to': sout.append('%s{--tw-gradient-to:%s var(--tw-gradient-to-position)}' % (sel, val))
    elif kind == 'via': sout.append('%s{--tw-gradient-stops:var(--tw-gradient-from),%s var(--tw-gradient-via-position),var(--tw-gradient-to)}' % (sel, val))
for variant, full, kind, hue, shade, alpha in sorted(set(m.groups() for m in apat.finditer(src))):
    emit(SL, variant, full, kind, blue_for(kind, int(shade), alpha, False))
    emit(SD, variant, full, kind, blue_for(kind, int(shade), alpha, True))
# trung tính -> trắng/be (chỉ nền sáng)
for variant, full, kind, name, alpha in toks:
    if (kind, name) in (('bg','white'), ('text','black')): continue
    c = beige_color(name, alpha); sel = SL + '.' + esc(variant + full) + (':' + variant[:-1] if variant else '')
    if kind == 'bg': sout.append('%s{background-color:%s}' % (sel, c))
    elif kind == 'text': sout.append('%s{color:%s}' % (sel, c))
    elif kind == 'border': sout.append('%s{border-color:%s}' % (sel, c))
    elif kind.startswith('border-'):
        side = {'l':['left'],'r':['right'],'t':['top'],'b':['bottom'],'x':['left','right'],'y':['top','bottom']}[kind[-1]]
        sout.append('%s{%s}' % (sel, ';'.join('border-%s-color:%s' % (x, c) for x in side)))
    elif kind == 'divide': sout.append('%s > :not([hidden]) ~ :not([hidden]){border-color:%s}' % (SL + '.' + esc(variant + full), c))
    elif kind == 'placeholder': sout.append('%s::placeholder{color:%s}' % (SL + '.' + esc(variant + full), c))
# chữ đen trên nền xanh đậm -> chữ trắng; chữ trắng trên nền xanh giữ trắng
solid = ','.join('[class*="bg-%s-%d"],[class*="from-%s-%d"]' % (h, s, h, s) for h in ACCENT for s in (4,5,6,7,8))
for P2 in (SL, SD):
    sout.append(P2 + ':is(' + solid + ').text-black{color:#ffffff}')
    sout.append(P2 + ':is(' + solid + ').text-white{color:#ffffff}')
study_block = '/* ===== STUDY MODE (tự sinh) BẮT ĐẦU ===== */\n' + '\n'.join(sout) + '\n/* ===== STUDY MODE KẾT THÚC ===== */\n'

css = open(css_path, encoding='utf-8').read()
css = re.sub(r'\n?/\* ===== THEME LIGHT \(tự sinh.*?THEME LIGHT KẾT THÚC ===== \*/\n', '\n', css, flags=re.S)
css = re.sub(r'\n?/\* ===== STUDY MODE \(tự sinh\).*?STUDY MODE KẾT THÚC ===== \*/\n', '\n', css, flags=re.S)
css = re.sub(r'\n?/\* ===== STUDY STATIC BẮT ĐẦU =====.*?STUDY STATIC KẾT THÚC ===== \*/\n', '\n', css, flags=re.S)
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
css = css.rstrip('\n') + '\n\n' + block + extra + '\n' + study_block + r'''
/* ===== STUDY STATIC BẮT ĐẦU ===== */
/* Học tập: nền be, chữ rõ, bỏ mọi hiệu ứng rực rỡ (phát sáng, đổ bóng chữ, hoạt ảnh, khung/hào quang trang trí, ảnh nền động) */
html[data-ui="study"][data-theme="light"] body { background: #f5f0e6; color: #1c1917; }
html[data-ui="study"][data-theme="light"] .custom-scrollbar { scrollbar-color: #2563eb #eee6d3; }
html[data-ui="study"] *, html[data-ui="study"] *::before, html[data-ui="study"] *::after { text-shadow: none !important; }
html[data-ui="study"] [class*="shadow-["], html[data-ui="study"] .shadow-lg, html[data-ui="study"] .shadow-md, html[data-ui="study"] .shadow-xl, html[data-ui="study"] .shadow-2xl { box-shadow: 0 1px 3px rgba(0,0,0,.14) !important; }
html[data-ui="study"] [class*="drop-shadow"] { filter: none !important; }
html[data-ui="study"] .animate-pulse, html[data-ui="study"] .animate-bounce, html[data-ui="study"] .animate-ping { animation: none !important; }
html[data-ui="study"] [style*="pinimg.com"] { background-image: none !important; }
html[data-ui="study"] .font-black { font-weight: 700; }
html[data-ui="study"] .tracking-widest { letter-spacing: .05em; }
html[data-ui="study"] .tracking-wider { letter-spacing: .03em; }
html[data-ui="study"] .frame-luctruc, html[data-ui="study"] .frame-huyetma, html[data-ui="study"] .frame-cuuu, html[data-ui="study"] .frame-chanlong, html[data-ui="study"] .frame-viemde, html[data-ui="study"] .frame-banghan, html[data-ui="study"] .frame-mathan,
html[data-ui="study"] .aura-sacred, html[data-ui="study"] .aura-blood, html[data-ui="study"] .aura-gold, html[data-ui="study"] .aura-starlight, html[data-ui="study"] .aura-chaos, html[data-ui="study"] .aura-rainbow { border: 2px solid #cbd5e1 !important; box-shadow: none !important; animation: none !important; background-image: none !important; }
html[data-ui="study"] .nf-vip, html[data-ui="study"] .nf-maton, html[data-ui="study"] .nf-kiemthan, html[data-ui="study"] .nf-viemde, html[data-ui="study"] .nf-daoton, html[data-ui="study"] .nf-tiende, html[data-ui="study"] .nf-tongsu, html[data-ui="study"] .nf-thanthoai { background: #e5e7eb !important; background-image: none !important; color: #111827 !important; border: 1px solid #9ca3af !important; animation: none !important; box-shadow: none !important; }
html[data-ui="study"] .glow-correct { animation: glowCorrectStudy .45s ease-out both; }
@keyframes glowCorrectStudy { 0% { filter: brightness(1); } 40% { filter: brightness(1.15); box-shadow: 0 0 0 3px rgba(22,163,74,.55); } 100% { filter: none; box-shadow: 0 0 0 2px rgba(22,163,74,.45); } }
html[data-ui="study"] .lb-row::after { display: none; }
/* Bí Tịch (nền tối): chữ nhỏ/xám khó đọc -> tăng độ rõ */
html[data-ui="thienkieu"][data-theme="dark"] .text-zinc-600 { color: #8e8e99; }
html[data-ui="thienkieu"][data-theme="dark"] .text-zinc-500 { color: #a1a1aa; }
html .text-\[9px\] { font-size: 10px; }
html .text-\[8px\] { font-size: 9px; }
/* ===== STUDY STATIC KẾT THÚC ===== */
'''
open(css_path, 'w', encoding='utf-8').write(css)
print('đã sinh', len(out), 'luật CSS chế độ sáng')
