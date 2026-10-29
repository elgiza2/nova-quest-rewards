/** Live "thinking" line for the agent: CSS ring + the agent's real current thought. */
import { useUserLang } from "@/lib/authI18n";

export default function AgentThinkingLine({ text }: { text?: string | null }) {
  const isAr = useUserLang() === "ar-eg";
  const line = (text || "").trim() || (isAr ? "بيفكر…" : "Thinking…");
  return (
    <div className="mtrace my-2 flex items-start gap-2" role="status" aria-live="polite">
      <span className="mring mt-[3px]" aria-hidden />
      <span key={line} className="mtrace-label is-live inline-block max-w-full whitespace-pre-wrap break-words">
        {line}
      </span>
    </div>
  );
}
