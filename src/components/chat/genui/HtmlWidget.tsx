/** @doc Renders a model-written ```widget HTML block inside a sandboxed iframe
 *  (scripts allowed, no same-origin — it cannot touch the app or the session).
 *  A built-in stylesheet gives every widget the same clean look; the widget
 *  calls megsy.send("text") to answer the agent and auto-sizes to its content. */
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { GenUIActionContext } from "./GenUIBlock";

/* MagicOS-style frosted glass kit: soft tinted glass, squircle radii, crisp text. */
const BASE_CSS = `
:root{--fg:#0f1115;--muted:#5d6370;--line:rgba(15,17,21,.08);--glass:rgba(255,255,255,.72);--glass2:rgba(255,255,255,.5);--soft:rgba(15,17,21,.045);--hi:rgba(255,255,255,.9);--accent:#2f6bff;--accent2:#7a5cff;--accent-fg:#fff;--good:#12a150;--warn:#e08a00;--bad:#e5484d;--info:#2f6bff;--r:26px;--rs:18px;--sh:0 1px 1px rgba(0,0,0,.03),0 18px 40px -20px rgba(20,30,60,.28)}
html.dark{--fg:#f4f5f7;--muted:#a1a6b2;--line:rgba(255,255,255,.09);--glass:rgba(34,36,42,.66);--glass2:rgba(255,255,255,.06);--soft:rgba(255,255,255,.06);--hi:rgba(255,255,255,.14);--accent:#5b8cff;--accent2:#9b84ff;--sh:0 1px 1px rgba(0,0,0,.2),0 22px 44px -22px rgba(0,0,0,.7)}
*{box-sizing:border-box;margin:0}
html,body{background:transparent;color:var(--fg);font:14.5px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text","HONOR Sans","Segoe UI","IBM Plex Sans Arabic",Tahoma,sans-serif;-webkit-font-smoothing:antialiased}
body{padding:4px}
h1,h2,h3{letter-spacing:-.015em;line-height:1.25;font-weight:700}h1{font-size:24px}h2{font-size:19px}h3{font-size:15.5px}
p{color:var(--muted)}ul,ol{padding-inline-start:20px}li+li{margin-top:4px}
img{max-width:100%;display:block;border-radius:var(--rs);object-fit:cover;background:var(--soft)}
.card{position:relative;overflow:hidden;isolation:isolate;background:radial-gradient(120% 80% at 0% 0%,color-mix(in srgb,#4f8bff 38%,transparent),transparent 60%),radial-gradient(90% 70% at 100% 10%,color-mix(in srgb,#b06bff 34%,transparent),transparent 60%),radial-gradient(100% 80% at 70% 110%,color-mix(in srgb,#ff7aa8 30%,transparent),transparent 60%),radial-gradient(80% 60% at 0% 100%,color-mix(in srgb,#2fd3c0 28%,transparent),transparent 60%),var(--glass);border:1px solid rgba(255,255,255,.55);border-radius:var(--r);padding:18px;box-shadow:var(--sh),inset 0 1px 0 var(--hi)}
html.dark .card{border-color:rgba(255,255,255,.12)}
.card::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(160deg,rgba(255,255,255,.35),transparent 40%);pointer-events:none}
.card>*{position:relative}
.glass,.tile,.stat{background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.6);border-radius:var(--rs);padding:14px;backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 6px 18px -12px rgba(20,30,60,.35)}
html.dark .glass,html.dark .tile,html.dark .stat{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}
.grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(96px,1fr))}.g2{grid-template-columns:1fr 1fr}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.between{justify-content:space-between}.center{justify-content:center;text-align:center}
.stack>*+*{margin-top:14px}
.stat b{display:block;font-size:22px;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.stat span{font-size:12px;color:var(--muted)}
.stat .ic,.ic{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;font-size:18px;margin-bottom:8px;background:linear-gradient(135deg,var(--c,#4f8bff),color-mix(in srgb,var(--c,#4f8bff) 55%,#fff));color:#fff;box-shadow:0 6px 14px -6px var(--c,#4f8bff)}
.c1{--c:#3b82f6}.c2{--c:#a855f7}.c3{--c:#f43f5e}.c4{--c:#10b981}.c5{--c:#f59e0b}.c6{--c:#06b6d4}
.stat[class*=" c"],.tile[class*=" c"]{background:linear-gradient(150deg,color-mix(in srgb,var(--c) 22%,rgba(255,255,255,.45)),rgba(255,255,255,.35))}
html.dark .stat[class*=" c"],html.dark .tile[class*=" c"]{background:linear-gradient(150deg,color-mix(in srgb,var(--c) 26%,transparent),rgba(255,255,255,.05))}
.hero{position:relative;margin:-18px -18px 14px;height:170px;overflow:hidden;background:linear-gradient(135deg,#4f8bff,#b06bff)}.hero img{width:100%;height:100%;border-radius:0}.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.6))}.hero>div{position:absolute;inset:auto 16px 14px;z-index:1;color:#fff}.hero h2,.hero h3{color:#fff}.hero p{color:rgba(255,255,255,.85)}
.thumb{width:56px;height:56px;border-radius:16px;flex:0 0 auto}
.sec{font-size:12px;font-weight:700;color:var(--muted);letter-spacing:.02em;margin-bottom:-4px}
hr{border:0;height:1px;background:var(--line)}
.big{font-size:56px;font-weight:300;letter-spacing:-.05em;line-height:1}
.badge{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:999px;font-size:12px;font-weight:600;background:var(--soft);border:1px solid var(--line)}
.good{color:var(--good)}.warn{color:var(--warn)}.bad{color:var(--bad)}.info{color:var(--info)}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:currentColor}
button,.btn{font:inherit;font-weight:600;border:1px solid var(--line);background:var(--glass2);color:var(--fg);padding:10px 18px;border-radius:999px;cursor:pointer;transition:transform .15s,background .15s;backdrop-filter:blur(12px)}
button:hover{background:var(--soft)}button:active{transform:scale(.96)}
button.primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-fg);border-color:transparent;width:100%;padding:13px;box-shadow:0 10px 24px -12px var(--accent)}
button.ok{background:color-mix(in srgb,var(--good) 16%,transparent);color:var(--good);border-color:color-mix(in srgb,var(--good) 30%,transparent);flex:1}
button.no{background:color-mix(in srgb,var(--bad) 12%,transparent);color:var(--bad);border-color:color-mix(in srgb,var(--bad) 26%,transparent);flex:1}
.chip{border-radius:16px;padding:11px 14px;text-align:start}.chip.on,.chip[aria-pressed=true]{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent)}
.seg{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--soft)}.seg button{flex:1;border:0;background:transparent;padding:8px}.seg button.on{background:var(--glass);box-shadow:var(--sh)}
input,select,textarea{font:inherit;width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:16px;background:var(--glass2);color:var(--fg);outline:none}input:focus,textarea:focus{border-color:var(--accent)}
input[type=range]{padding:0;accent-color:var(--accent);background:none;border:0}input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent)}
table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:start;font-size:12px;color:var(--muted);font-weight:600;padding:9px 10px}td{padding:10px;border-top:1px solid var(--line)}
.bar{height:8px;border-radius:99px;background:var(--soft);overflow:hidden}.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width .4s}
.timeline{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory}.timeline>*{flex:0 0 160px;scroll-snap-align:start}
.kanban{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.kanban>div{background:var(--soft);border-radius:var(--rs);padding:8px;min-height:80px}.kanban .tile{padding:10px;margin-top:6px;font-size:13px;cursor:pointer}
details{border:1px solid var(--line);border-radius:14px;padding:8px 12px;background:var(--glass2)}details details{margin-top:6px}summary{cursor:pointer;font-weight:600}
.seats{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}.seat{aspect-ratio:1;border-radius:8px;padding:0}.seat.on{background:var(--accent);color:var(--accent-fg)}.seat[disabled]{opacity:.3}
.swatch{height:64px;border-radius:14px;border:1px solid var(--line)}
pre,code{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12.5px}pre{background:#0f1115;color:#e7e9ee;padding:14px;border-radius:var(--rs);overflow:auto;direction:ltr}
svg text{fill:currentColor;font-family:inherit}
/* flat, borderless: blend into the conversation */
body{padding:0}
.card{background:transparent!important;border:0!important;box-shadow:none!important;padding:0;overflow:visible;border-radius:0}
.card::before{display:none}
.glass,.tile,.stat{border:0!important;box-shadow:none!important;backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--soft)}
.stat[class*=" c"],.tile[class*=" c"],html.dark .stat[class*=" c"],html.dark .tile[class*=" c"]{background:color-mix(in srgb,var(--c) 9%,transparent)}
.stat .ic,.ic{width:auto;height:auto;background:none!important;box-shadow:none!important;color:var(--c,var(--accent));font-size:15px;opacity:.85;margin-bottom:4px;display:block}
.hero{margin:0 0 14px;border-radius:var(--rs)}
details,button,.btn,input,select,textarea,.badge,.swatch{border-color:transparent}
img:not([src]),img[src=""],.thumb:not([src]){display:none}
.hero:not(:has(img[src])){height:auto;background:none}.hero:not(:has(img[src]))::after{display:none}.hero:not(:has(img[src]))>div{position:static;color:var(--fg)}.hero:not(:has(img[src])) h2,.hero:not(:has(img[src])) h3{color:var(--fg)}.hero:not(:has(img[src])) p{color:var(--muted)}
.glass:empty,.tile:empty,.stat:empty,.grid:empty,.card:empty,div:empty:not(.bar>i):not(.swatch):not(.dot):not([style]){display:none}
.muted{color:var(--muted)}.small{font-size:12px}
`;

const BRIDGE = `<script>
window.megsy={send:function(t){parent.postMessage({__megsy:'send',id:window.name,text:String(t)},'*')}};
document.addEventListener('click',function(e){var c=e.target.closest('.chip[data-toggle],.seat:not([disabled])');if(c)c.classList.toggle('on');var s=e.target.closest('.seg button');if(s){s.parentNode.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b===s)})}var el=e.target.closest('[data-send]');if(el){e.preventDefault();megsy.send(el.getAttribute('data-send')||el.textContent.trim())}});
function __h(){parent.postMessage({__megsy:'h',id:window.name,h:Math.ceil(document.body.getBoundingClientRect().height)+8},'*')}
document.addEventListener('error',function(e){if(e.target.tagName==='IMG'){e.target.remove();__h()}},true);document.querySelectorAll('img[data-q]').forEach(function(im){fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=800&gsrsearch='+encodeURIComponent(im.getAttribute('data-q'))).then(function(r){return r.json()}).then(function(j){var p=Object.values((j.query||{}).pages||{}).sort(function(a,b){return a.index-b.index}).find(function(x){return x.thumbnail});if(p){im.src=p.thumbnail.source}else{im.remove()}__h()}).catch(function(){im.remove();__h()})});
new ResizeObserver(__h).observe(document.body);addEventListener('load',__h);document.addEventListener('load',__h,true);[50,300,1000,2500].forEach(function(t){setTimeout(__h,t)});
</script>`;

export function HtmlWidget({ html, done }: { html: string; done: boolean }) {
  const onSend = useContext(GenUIActionContext);
  const ref = useRef<HTMLIFrameElement>(null);
  const id = useMemo(() => `w${Math.random().toString(36).slice(2)}`, []);
  const [h, setH] = useState(120);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Unclosed fence (truncated/stopped reply): render once content stops changing.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (done) return;
    const t = setTimeout(() => setSettled(true), 2000);
    return () => clearTimeout(t);
  }, [html, done]);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (!e.data?.__megsy || e.data.id !== id) return;
      if (e.data.__megsy === "h") setH(Math.min(2400, Math.max(40, Number(e.data.h) || 0)));
      if (e.data.__megsy === "send" && onSend) onSend(String(e.data.text).slice(0, 2000));
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [onSend]);

  const dark = useMemo(() => {
    if (typeof window === "undefined") return false;
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g);
    return m ? (Number(m[0]) + Number(m[1]) + Number(m[2])) / 3 < 110 : false;
  }, []);
  const doc = useMemo(
    () => `<!doctype html><html class="${dark ? "dark" : ""}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${BASE_CSS}</style></head><body dir="auto">${html}${BRIDGE}</body></html>`,
    [html, dark],
  );

  if (!html.trim()) return null;
  if ((!done && !settled) || !mounted) {
    return <div className="my-4 h-24 animate-pulse rounded-3xl bg-muted/40" />;
  }
  return (
    <iframe
      ref={ref}
      name={id}
      title="Interactive answer"
      sandbox="allow-scripts"
      srcDoc={doc}
      style={{ height: h }}
      className="my-4 block w-full border-0 bg-transparent transition-[height] duration-200"
    />
  );
}
