"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { setCoachLogo } from "@/app/(coach)/admin/actions";
import { logoUrl } from "@/lib/logo";

/**
 * Her logo: a square preview, a file picker and a way to remove it. The file
 * goes straight from the browser to her folder in storage — PNG or JPEG, up
 * to 1 MB, the bucket refuses anything else — and a new name each time, so
 * no cache ever shows the old one.
 */
export function CoachLogo({ coachId, path }: { coachId: string; path: string | null }) {
  const t = useTranslations("logo");
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const url = logoUrl(path);

  async function upload(file: File) {
    setError(null);
    if (!["image/png", "image/jpeg"].includes(file.type)) return setError(t("badType"));
    if (file.size > 1024 * 1024) return setError(t("tooBig"));

    const ext = file.type === "image/png" ? "png" : "jpg";
    const name = `${coachId}/logo-${Date.now()}.${ext}`;
    const { error: failed } = await createClient()
      .storage.from("coach-logos")
      .upload(name, file, { contentType: file.type, upsert: false });
    if (failed) return setError(t("failed"));
    startTransition(() => setCoachLogo(name));
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="glass2 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-r3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a public storage URL, sized by its box
          <img src={url} alt={t("alt")} className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ink3)]">
            {t("none")}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[13px] leading-[1.5] text-[var(--ink2)]">{t("lede")}</p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => input.current?.click()}
            className="cta h-9 rounded-r2 px-4 text-[13px] font-semibold text-[var(--onA)] disabled:opacity-50"
          >
            {t(url ? "replace" : "choose")}
          </button>
          {url && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => setCoachLogo(null))}
              className="glass2 h-9 rounded-r2 px-4 text-[13px] font-semibold text-[var(--ink2)] hover:text-[var(--a3)]"
            >
              {t("remove")}
            </button>
          )}
        </div>
        {error && <p className="text-[12.5px] text-[var(--a3)]">{error}</p>}
      </div>
    </div>
  );
}
