#!/usr/bin/env python3
"""
BKS Community Job Center - UI polish
1. Mobile: hide the hero headline, tighten spacing so the Home screen is clean
2. Location gate: professional redesign + "not currently operating" notice (EN + Sepedi)
3. Favicon: rebuild from the real logo (auto-trim padding) and use it on every page
Run from the repo root:  python3 apply_ui_polish.py
"""
import io, os, re, sys, urllib.request

ROOT = os.getcwd()
PAGES = ["index.html", "portal.html", "tracker.html", "admin.html", "privacy.html"]


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


def write(p, s):
    with open(os.path.join(ROOT, p), "w", encoding="utf-8", newline="") as f:
        f.write(s)


def replace_once(s, old, new, label):
    n = s.count(old)
    if n != 1:
        sys.exit(f"ABORTED: expected exactly 1 match for [{label}] but found {n}. Nothing was changed for this step.")
    return s.replace(old, new)


# ---------------------------------------------------------------- 1 + 2: portal.html
html = read("portal.html")
if "loc-notice" in html:
    sys.exit("portal.html already patched (found loc-notice). Nothing to do.")

# ---- 2a. location gate CSS (replace the old block, keep everything else)
old_css_start = html.index(".loc-gate {")
old_css_end = html.index(".loc-skip:hover { color: var(--muted); }") + len(".loc-skip:hover { color: var(--muted); }")
NEW_LOC_CSS = """.loc-gate {
  display: none; position: fixed; inset: 0;
  background: rgba(2, 26, 16, 0.82); z-index: 30000;
  align-items: center; justify-content: center; padding: 20px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  overflow-y: auto;
}
.loc-gate.open { display: flex; animation: modalFadeIn 0.3s ease both; }
.loc-box {
  background: #fff; border-radius: 24px;
  max-width: 440px; width: 100%; margin: auto;
  padding: 36px 32px 28px; text-align: center;
  animation: modalSlideUp 0.36s cubic-bezier(.4,0,.2,1) both;
  box-shadow: 0 32px 80px rgba(0,0,0,.38), 0 0 0 1px rgba(4,59,40,.06);
}
.loc-icon {
  width: 60px; height: 60px; margin: 0 auto 18px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: #e8f6ef; color: var(--green-vivid);
}
.loc-icon svg { width: 28px; height: 28px; }
.loc-icon.alert { background: #fdecec; color: #c0392b; }
.loc-eyebrow {
  display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--green-vivid); margin-bottom: 8px;
}
.loc-box h2 {
  font-family: var(--font-display); font-size: 24px; line-height: 1.2;
  font-weight: 700; color: var(--green-dark); margin-bottom: 10px;
  letter-spacing: -0.015em;
}
.loc-box p { font-size: 14.5px; color: var(--muted); line-height: 1.65; margin-bottom: 20px; }
.loc-notice {
  text-align: left; background: #fff8e6; border: 1px solid #f1dc9c;
  border-left: 4px solid #e0a800; border-radius: 12px;
  padding: 14px 16px; margin-bottom: 22px;
}
.loc-notice-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #8a6500; margin-bottom: 6px;
}
.loc-notice-head svg { width: 16px; height: 16px; flex: none; }
.loc-box .loc-notice p { font-size: 13px; line-height: 1.6; color: #5c4a14; margin: 0; }
.loc-allow-btn {
  width: 100%;
  background: linear-gradient(135deg, #1ab87f, #0a7a52);
  color: #fff; padding: 14px; border: none;
  border-radius: 12px; font-weight: 700; font-size: 15px;
  cursor: pointer; font-family: var(--font-body);
  transition: transform .2s ease, box-shadow .2s ease;
  box-shadow: 0 6px 18px rgba(21, 154, 110, 0.30);
}
.loc-allow-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(21, 154, 110, 0.38); }
.loc-allow-btn:disabled { opacity: .7; cursor: wait; transform: none; }
.loc-skip {
  margin-top: 12px; padding: 10px 12px; background: none; border: none;
  font-family: var(--font-body); font-size: 13px; font-weight: 500; color: #6b736f;
  cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
}
.loc-skip:hover { color: var(--green-dark); }
@media (max-width: 480px) {
  .loc-gate { padding: 14px; }
  .loc-box { padding: 28px 22px 22px; border-radius: 20px; }
  .loc-box h2 { font-size: 22px; }
}"""
html = html[:old_css_start] + NEW_LOC_CSS + html[old_css_end:]

# ---- 2b. location gate markup
g_start = html.index('<div class="loc-gate" id="locGate">')
g_end = html.index('<div class="hero">', g_start)
NEW_LOC_HTML = """<div class="loc-gate" id="locGate" role="dialog" aria-modal="true" aria-labelledby="locTitle">
  <div class="loc-box" id="locBox">
    <div class="loc-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>
    </div>
    <span class="loc-eyebrow" data-i18n="locEyebrow">Eligibility check</span>
    <h2 id="locTitle" data-i18n="locTitle">Location Verification</h2>
    <p><span data-i18n-html="locBody">This portal is exclusively for residents of <strong>Atok, Ga-Selepe and the 0749 area</strong>. Please allow location access to confirm you are in the eligible area.</span></p>
    <div class="loc-notice" role="note">
      <div class="loc-notice-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span data-i18n="locNoticeTitle">Not currently operating</span>
      </div>
      <p data-i18n="locNoticeBody">BKS is built and online, but it is not yet in operation. No mining partner has endorsed or piloted the platform, so no real job allocations are being made through it.</p>
    </div>
    <button class="loc-allow-btn" id="locAllowBtn" type="button" data-i18n="locAllow">Allow Location Access</button>
    <div><button class="loc-skip" id="locSkip" type="button"><span data-i18n="locSkipText">I understand &mdash; continue anyway</span></button></div>
  </div>
</div>

"""
html = html[:g_start] + NEW_LOC_HTML + html[g_end:]

# ---- 2c. translations
html = replace_once(
    html,
    "    locTitle:'Location Verification',\n",
    "    locTitle:'Location Verification',\n"
    "    locEyebrow:'Eligibility check',\n"
    "    locNoticeTitle:'Not currently operating',\n"
    "    locNoticeBody:'BKS is built and online, but it is not yet in operation. No mining partner has endorsed or piloted the platform, so no real job allocations are being made through it.',\n",
    "en locTitle",
)
html = replace_once(
    html,
    "    locTitle:'Netefatso ya Lefelo',\n",
    "    locTitle:'Netefatso ya Lefelo',\n"
    "    locEyebrow:'Netefatso ya go swanela',\n"
    "    locNoticeTitle:'Ga se sa thoma go \\u0161oma',\n"
    "    locNoticeBody:'BKS e agilwe gomme e ya bonwa inthaneteng, eupša ga e eso thome go \\u0161oma. Ga go na khamphani ya meepo yeo e e thekgilego goba e e lekilego, ka gona ga go na dikabelo tša nnete tša me\\u0161omo tšeo di dirwago ka yona ga bjale.',\n",
    "nso locTitle",
)

# ---- 2d. "Outside Service Area" state: match the new look
old_denied = """          '<div class=\"loc-icon\">&#128683;</div>'+"""
new_denied = """          '<div class=\"loc-icon alert\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"4.9\" y1=\"4.9\" x2=\"19.1\" y2=\"19.1\"/></svg></div>'+"""
html = replace_once(html, old_denied, new_denied, "denied icon")

# ---- 1. mobile hero cleanup (inside the existing max-width:768px block)
old_mobile = """  .hero h1 { font-size: 34px; letter-spacing: -0.01em; }
  .hero-sub { font-size: 16px; }
  .hero-badge { font-size: 10px; letter-spacing: 0.09em; padding: 5px 15px; }

  .hero-content { display: flex; flex-direction: column; align-items: center; }
  .hero-values { order: 1; width: 100%; justify-content: center; gap: 8px; margin-bottom: 22px; }"""
new_mobile = """  /* Headline hidden on mobile (kept in the DOM for screen readers / SEO) */
  .hero h1 {
    position: absolute; width: 1px; height: 1px; margin: 0; padding: 0;
    overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  .hero { min-height: 100vh; min-height: 100svh; }
  .hero-sub {
    font-size: 18px; line-height: 1.55; max-width: 320px;
    color: rgba(255, 255, 255, 0.78); margin-bottom: 26px;
  }
  .hero-badge { font-size: 10px; letter-spacing: 0.09em; padding: 6px 16px; margin-bottom: 20px; }

  .hero-content {
    display: flex; flex-direction: column; align-items: center;
    padding: 84px 22px 48px; /* top padding clears the floating Home button */
  }
  .hero-values { order: 1; width: 100%; justify-content: center; gap: 8px; margin-bottom: 26px; }"""
html = replace_once(html, old_mobile, new_mobile, "mobile hero block")

write("portal.html", html)
print("OK  portal.html: mobile hero + location gate updated")

# ---------------------------------------------------------------- 3: favicon from the real logo
LOGO_URL = "https://drive.google.com/thumbnail?id=1idJ5CgHUVJ98YP8frCLbeDexMPkmraLn&sz=w1000"
src = os.path.join(ROOT, "logo-src.png")


def build_favicons():
    try:
        from PIL import Image, ImageChops
    except ImportError:
        os.system(f"{sys.executable} -m pip install --quiet pillow")
        from PIL import Image, ImageChops

    if not os.path.exists(src):
        req = urllib.request.Request(LOGO_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        open(src, "wb").write(data)
    im = Image.open(src).convert("RGBA")

    # background = transparent, or the (near-white) corner colour
    px = im.load()
    corner = px[0, 0]
    if corner[3] < 10:
        mask = im.getchannel("A").point(lambda v: 255 if v > 12 else 0)
    else:
        bg = Image.new("RGBA", im.size, corner)
        diff = ImageChops.difference(im, bg).convert("L")
        mask = diff.point(lambda v: 255 if v > 24 else 0)
    box = mask.getbbox()
    if not box:
        raise RuntimeError("could not find the logo inside the image")
    im = im.crop(box)

    # square canvas with ~4% breathing room so the mark fills the tab icon
    side = max(im.size)
    pad = int(side * 0.04)
    canvas = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
    canvas.paste(im, ((canvas.width - im.width) // 2, (canvas.height - im.height) // 2), im)

    def size(n):
        return canvas.resize((n, n), Image.LANCZOS)

    size(32).save(os.path.join(ROOT, "favicon-32.png"))
    size(192).save(os.path.join(ROOT, "favicon-192.png"))
    flat = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
    flat.alpha_composite(size(180))
    flat.convert("RGB").save(os.path.join(ROOT, "apple-touch-icon.png"))
    size(64).save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"OK  favicons built (trimmed logo box {box})")


FAVICON_TAGS = (
    '<link rel="icon" href="/favicon.ico?v=2" sizes="any">\n'
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=2">\n'
    '<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png?v=2">\n'
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">'
)

try:
    build_favicons()
    icon_re = re.compile(r'<link\s+rel="icon"[^>]*>', re.I)
    for page in PAGES:
        s = read(page)
        if "favicon-32.png" in s:
            continue
        s2, n = icon_re.subn(lambda m: FAVICON_TAGS, s, count=1)
        if n:
            write(page, s2)
            print(f"OK  {page}: favicon tags updated")
        else:
            print(f"--  {page}: no <link rel=icon> found, skipped")
except Exception as e:
    print(f"!!  Favicon step skipped ({e}).")
    print("    Upload your logo to the repo root as logo-src.png and run this script again.")
    print("    (HTML changes above were already saved.)")
