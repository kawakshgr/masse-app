import { getTranslations } from "next-intl/server";
import { RetryButton } from "@/components/RetryButton";

/** Served by the service worker when a navigation cannot reach the network. */
export default async function OfflinePage() {
  const t = await getTranslations("offline");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="atmosphere" aria-hidden />
      <div className="glass lift w-full max-w-[420px] rounded-r4 p-8">
        <h1 className="font-display text-[24px] font-extrabold tracking-[-.04em]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink2)]">
          {t("lede")}
        </p>
        {/* Offline is a state, not an error: say what is safe, not what failed. */}
        <p className="mt-4 rounded-r2 border border-[var(--edge)] bg-[var(--glass)] p-3 text-[12px] leading-relaxed text-[var(--ink2)]">
          {t("held")}
        </p>
        <RetryButton label={t("retry")} />
      </div>
    </main>
  );
}
