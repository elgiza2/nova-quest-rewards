import { memo } from "react";

import { t as uiT, useUserLang } from "@/lib/authI18n";

interface ThinkingLoaderProps {
  searchStatus?: string;
}

const ThinkingLoader = ({ searchStatus }: ThinkingLoaderProps) => {
  const lang = useUserLang();
  const thinkingLabel = uiT("thinking", lang);
  const rtl = lang === "ar-eg";
  return (
    <div className="mtrace flex items-center gap-2 py-1" aria-live="polite" dir={rtl ? "rtl" : undefined}>
      <span className="mring" aria-hidden />
      <span className="mtrace-label is-live text-[13px] font-medium">
        {searchStatus?.trim() || thinkingLabel}
      </span>
    </div>
  );
};

export default memo(ThinkingLoader);
