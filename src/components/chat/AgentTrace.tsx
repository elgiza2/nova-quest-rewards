/**
 * @doc Browser-Use style activity trace for cloud agent tasks.
 *
 * While the agent works the list is always visible — no toggle to press. Rows are
 * flat numbered steps on a thin gradient rail: no icons, no shadows, nothing to
 * decode. Once the task finishes the whole history collapses behind a single
 * "Worked for …" line, and nothing is ever thrown away.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComputerEvent } from "@/lib/computer/client";
import { cn } from "@/lib/utils";

interface Props {
  events: ComputerEvent[];
  running: boolean;
  status?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  liveUrl?: string | null;
  /** Coding runs start with the computer screen hidden. */
  screenDefaultOpen?: boolean;
  className?: string;
}

function formatDuration(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const isNoise = (line: string) =>
  !line ||
  line.length < 2 ||
  /^\s*[[{]/.test(line) ||
  /^(checkpoint|state|error|traceback)\b/i.test(line);

export default function AgentTrace({
  events,
  running,
  status,
  startedAt,
  endedAt,
  liveUrl,
  screenDefaultOpen = true,
  className,
}: Props) {
  // Finished runs start collapsed behind the "Worked for …" line.
  const [open, setOpen] = useState(false);
  const [screenOpen, setScreenOpen] = useState(screenDefaultOpen);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-follow the newest line while the agent is working.
  useEffect(() => {
    if (!running) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length, running]);

  const rows = useMemo(
    () => events.filter((e) => !isNoise((e.title ?? "").trim())),
    [events],
  );

  const elapsedMs = useMemo(() => {
    const start = startedAt ? new Date(startedAt).getTime() : NaN;
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return end - start;
  }, [startedAt, endedAt]);

  const lastShot = useMemo(
    () => [...rows].reverse().find((e) => e.screenshot_url)?.screenshot_url || null,
    [rows],
  );

  if (rows.length === 0 && !running) return null;

  const showList = running || open;

  const list = (
    <div
      ref={listRef}
      className={cn(
        "msteps max-h-[420px] overflow-y-auto [scrollbar-width:thin]",
        running ? "mt-1" : "mt-2",
      )}
    >
      {rows.map((e, i) => {
        const kind = (e.kind ?? "thought") === "thought" ? "thought" : "action";
        const dur = Number(e.duration ?? 0);
        const title =
          kind === "thought" ? (
            <span className="mstep-text italic">{e.title}</span>
          ) : e.url ? (
            <a
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="mstep-text hover:underline"
            >
              {e.title}
            </a>
          ) : (
            <span className="mstep-text">{e.title}</span>
          );
        return (
          <div key={e.id} className="mstep">
            <span className="mstep-idx" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              {title}
              {kind === "thought" && dur > 0 && (
                <span className="mtime ms-1.5">{Math.round(dur)}s</span>
              )}
            </span>
          </div>
        );
      })}

      {running && (
        <div className="mstep is-live">
          <span className="mring" aria-hidden />
          <span className="mstep-text">
            {status?.trim() || (rows.length ? "…" : "Thinking…")}
          </span>
        </div>
      )}
    </div>
  );

  const screen = (lastShot || liveUrl) && (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setScreenOpen((v) => !v)}
        className="mb-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {screenOpen ? "إخفاء الكمبيوتر" : "إظهار الكمبيوتر"}
      </button>
      {screenOpen && (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-foreground/[0.03]">
          {lastShot ? (
            <img
              src={lastShot}
              alt=""
              loading="lazy"
              className="max-h-56 w-full object-cover object-top"
            />
          ) : (
            <iframe
              src={liveUrl!}
              title=""
              className="h-56 w-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("mtrace my-3 w-full", className)}>
      {/* While the agent works the steps stand on their own — no button. The
          "Worked for …" toggle only appears once the run has finished. */}
      {!running && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mtrace-head"
        >
          <span className="mdot" aria-hidden />
          <span className="mtrace-label">
            {elapsedMs ? `Worked for ${formatDuration(elapsedMs)}` : "Worked"}
          </span>
          <span className="mtoggle">{open ? "إخفاء" : "التفاصيل"}</span>
        </button>
      )}

      {showList && list}
      {(running || open) && screen}
    </div>
  );
}
