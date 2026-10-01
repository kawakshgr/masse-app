import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { intl } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { CheckInReview } from "@/components/CheckInReview";
import { Icon } from "@/components/Icon";
import { PaneHead, SectionTitle, Tile } from "@/components/Pane";
import { addDays, localDay } from "@/lib/clientData";
import { DEFAULT_DUE_OFFSET, checkInWindow, isFiled } from "@/lib/checkIns";
import { loadReviewWeeks } from "@/lib/reviewWeeks";
import { messageWriter } from "@/lib/coachMessages";
import { waLink } from "@/lib/whatsapp";
import type { CheckInRow } from "@/lib/supabase/types";
import { readAndNext } from "./actions";

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
}

/**
 * The check-in run (1 Oct 2026): on the day she keeps for them, every
 * check-in filed and not yet read, one after the other — the review with
 * its photos and summary, then "Lu, suivant" or "Passer". The last one
 * read, what is still to come in: who has not filed, with the reminder
 * already written.
 */
export default async function CheckInRunPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const t = await getTranslations("run");
  const tReview = await getTranslations("coachCheckin");
  const locale = intl(await getLocale());
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const me = user?.id ?? "";

  const [{ data: clients }, { data: coach }] = await Promise.all([
    supabase.from("clients").select("id, first_name, name, whatsapp, phone").eq("coach_id", me).eq("status", "active").order("name"),
    supabase.from("coaches").select("check_in_due_offset").eq("id", me).maybeSingle(),
  ]);
  const ids = (clients ?? []).map((c) => c.id);
  const { data: unread } = ids.length
    ? await supabase
        .from("check_ins")
        .select("*, check_in_photos(id)")
        .in("client_id", ids)
        .is("reviewed_at", null)
        .order("submitted_at", { ascending: true })
    : { data: [] };

  // Filed and unread, the oldest first: the order they came in.
  const run = (unread ?? []).filter((row) => isFiled(row as CheckInRow, row.check_in_photos?.length ?? 0));
  const { i } = await searchParams;
  const at = Math.min(Math.max(0, Number(i ?? 0) || 0), run.length);
  const current = run[at] ?? null;
  const clientOf = (id: string) => (clients ?? []).find((c) => c.id === id);
  const day = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString(locale, { day: "numeric", month: "long" });

  if (!current) {
    // Done: who has not filed the week asked yet.
    const today = localDay("Europe/Paris");
    const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
    const window = checkInWindow(addDays(today, -weekday), weekday, coach?.check_in_due_offset ?? DEFAULT_DUE_OFFSET);
    const { data: asked } = ids.length
      ? await supabase
          .from("check_ins")
          .select("*, check_in_photos(id)")
          .in("client_id", ids)
          .eq("week_start_date", window.weekStart)
      : { data: [] };
    const filed = new Set(
      (asked ?? []).filter((row) => isFiled(row as CheckInRow, row.check_in_photos?.length ?? 0)).map((row) => row.client_id),
    );
    const notYet = window.upcoming ? [] : (clients ?? []).filter((c) => !filed.has(c.id));
    const write = await messageWriter();
    const skipped = run.length;

    return (
      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-[760px] space-y-5">
          <PaneHead kicker={t("kickerDone")} title={t("title")} />
          <section className="glass flex flex-col items-center gap-3 rounded-r3 px-5 py-8 text-center">
            <span className="cta flex size-16 items-center justify-center rounded-full text-[30px] text-[var(--onA)]">✓</span>
            <p className="font-display text-[24px] font-extrabold uppercase leading-none tracking-[-.01em]">
              {skipped > 0 ? t("doneSkipped", { count: skipped }) : t("done")}
            </p>
            <p className="max-w-[46ch] text-[13.5px] leading-[1.5] text-[var(--ink2)]">
              {skipped > 0 ? t("doneSkippedHint") : t("doneHint")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {skipped > 0 && (
                <Link href="/bilans" className="cta flex h-11 items-center rounded-rp px-5 text-[13px] font-semibold text-[var(--onA)]">
                  {t("again")}
                </Link>
              )}
              <Link href="/clients" className="glass2 flex h-11 items-center rounded-rp border border-[var(--edge)] px-5 text-[13px] font-semibold">
                {t("back")}
              </Link>
            </div>
          </section>

          {notYet.length > 0 && (
            <section className="glass rounded-r3 p-4">
              <SectionTitle
                icon="checkIns"
                aside={<span className="tnum text-[12px] font-bold text-[var(--ink3)]">{notYet.length}</span>}
              >
                {t("notYet", { date: day(window.weekStart) })}
              </SectionTitle>
              <ul className="mt-3 flex flex-col gap-1.5">
                {notYet.map((client) => {
                  const first = client.first_name ?? client.name.split(/\s+/)[0] ?? "";
                  const link = waLink(client.whatsapp || client.phone, write("late", { first }));
                  return (
                    <li key={client.id} className="glass2 flex h-[60px] items-center gap-3 rounded-r2 px-2.5">
                      <Tile accent>{initialsOf(client.name)}</Tile>
                      <Link href={`/clients/${client.id}?onglet=checkins`} className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                        {client.name}
                      </Link>
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cta flex h-9 shrink-0 items-center gap-1.5 rounded-rp px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--onA)]"
                        >
                          <Icon name="whatsapp" size={15} />
                          {t("remind")}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    );
  }

  const client = clientOf(current.client_id)!;
  const { data: rows } = await supabase
    .from("check_ins")
    .select("*")
    .eq("client_id", client.id)
    .order("week_start_date", { ascending: true })
    .limit(52);
  const { weeks } = await loadReviewWeeks(supabase, client.id, (rows ?? []) as CheckInRow[]);
  const first = client.first_name ?? client.name.split(/\s+/)[0] ?? "";
  const progress = Math.round((at / run.length) * 100);

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[900px] space-y-4 p-5 pb-28">
        <PaneHead kicker={t("kicker", { n: at + 1, total: run.length })} title={t("title")}>
          <Link href="/clients" className="shrink-0 text-[13px] font-semibold text-[var(--ink2)]">
            {t("quit")}
          </Link>
        </PaneHead>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--glass2)]" aria-hidden>
          <div className="cta h-full rounded-full" style={{ width: `${Math.max(progress, 3)}%` }} />
        </div>

        <section className="glass flex items-center gap-3 rounded-r3 p-3">
          <Tile accent>{initialsOf(client.name)}</Tile>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[20px] font-extrabold uppercase leading-tight tracking-[-.01em]">
              {client.name}
            </span>
            <span className="block truncate text-[12.5px] text-[var(--ink2)]">
              {tReview("week", { date: day(current.week_start_date) })}
              {current.submitted_at ? ` · ${tReview("filed", { date: day(current.submitted_at) })}` : ""}
            </span>
          </span>
          <Link
            href={`/clients/${client.id}`}
            className="glass2 flex h-10 shrink-0 items-center rounded-rp border border-[var(--edge)] px-4 text-[12.5px] font-semibold"
          >
            {t("file")}
          </Link>
        </section>

        <CheckInReview
          key={current.id}
          clientId={client.id}
          firstName={first}
          phone={client.whatsapp || client.phone || null}
          weeks={weeks}
          initialId={current.id}
        />
      </div>

      {/* Always in reach, at the foot of the screen. */}
      <div className="sticky bottom-0 border-t border-[var(--edge)] bg-[color-mix(in_oklab,var(--deep)_88%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[900px] gap-2.5 px-5 py-3">
          <Link
            href={`/bilans?i=${at + 1}`}
            className="glass2 flex h-12 flex-1 items-center justify-center rounded-r2 border border-[var(--edge)] text-[14px] font-semibold text-[var(--ink2)]"
          >
            {t("skip")}
          </Link>
          <form action={readAndNext} className="flex-[2]">
            <input type="hidden" name="check_in_id" value={current.id} />
            <input type="hidden" name="client_id" value={client.id} />
            <input type="hidden" name="i" value={at} />
            <button type="submit" className="cta h-12 w-full rounded-r2 text-[15px] font-semibold text-[var(--onA)]">
              {at + 1 < run.length ? t("readNext") : t("readLast")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
