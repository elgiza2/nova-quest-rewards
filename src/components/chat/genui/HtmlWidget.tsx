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
.card{position:relative;overflow:hidden;background:linear-gradient(160deg,var(--hi),transparent 38%),var(--glass);backdrop-filter:blur(28px) saturate(180%);border:1px solid var(--line);border-radius:var(--r);padding:20px;box-shadow:var(--sh),inset 0 1px 0 var(--hi)}
.card::before{content:"";position:absolute;inset:-40% -20% auto auto;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 22%,transparent),transparent 70%);pointer-events:none}
.card>*{position:relative}
.glass,.tile{background:var(--glass2);border:1px solid var(--line);border-radius:var(--rs);padding:14px;backdrop-filter:blur(16px)}
.grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}.g2{grid-template-columns:1fr 1fr}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.between{justify-content:space-between}.center{justify-content:center;text-align:center}
.stack>*+*{margin-top:14px}
.stat{background:var(--glass2);border:1px solid var(--line);border-radius:var(--rs);padding:14px}.stat b{display:block;font-size:24px;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.stat span{font-size:12px;color:var(--muted)}
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
.muted{color:var(--muted)}.small{font-size:12px}
`;

const BRIDGE = `<script>
window.megsy={send:function(t){parent.postMessage({__megsy:'send',id:window.name,text:String(t)},'*')}};
document.addEventListener('click',function(e){var c=e.target.closest('.chip[data-toggle],.seat:not([disabled])');if(c)c.classList.toggle('on');var s=e.target.closest('.seg button');if(s){s.parentNode.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b===s)})}var el=e.target.closest('[data-send]');if(el){e.preventDefault();megsy.send(el.getAttribute('data-send')||el.textContent.trim())}});
function __h(){parent.postMessage({__megsy:'h',id:window.name,h:Math.ceil(document.body.getBoundingClientRect().height)+8},'*')}
document.querySelectorAll('img[data-q]').forEach(function(im){fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=800&gsrsearch='+encodeURIComponent(im.getAttribute('data-q'))).then(function(r){return r.json()}).then(function(j){var p=Object.values((j.query||{}).pages||{}).sort(function(a,b){return a.index-b.index}).find(function(x){return x.thumbnail});if(p){im.src=p.thumbnail.source}}).catch(function(){})});
new ResizeObserver(__h).observe(document.body);addEventListener('load',__h);document.addEventListener('load',__h,true);[50,300,1000,2500].forEach(function(t){setTimeout(__h,t)});
</script>`;

export function HtmlWidget({ html, done }: { html: string; done: boolean }) {
  const onSend = useContext(GenUIActionContext);
  const ref = useRef<HTMLIFrameElement>(null);
  const id = useMemo(() => `w${Math.random().toString(36).slice(2)}`, []);
  const [h, setH] = useState(120);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!done || !mounted) {
    return <div className="my-4 h-40 animate-pulse rounded-3xl border border-border/60 bg-muted/40" />;
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
