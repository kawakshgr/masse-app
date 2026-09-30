import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { PaneEmpty, PaneHead, SectionTitle, Tile } from "@/components/Pane";
import { QUEUE_ORDER, type QueueItem, type QueueKind } from "@/lib/queue";
import { waLink } from "@/lib/whatsapp";
import { callLabel } from "@/lib/calls";
import { markPainSeen } from "@/app/(coach)/clients/actions";

const ICON: Record<QueueKind, string> = {
  pain: "pain",
  request: "account",
  call: "video",
  late: "checkIns",
  checkin: "note",
  unpaid: "billing",
  silent: "bell",
  missed: "programmes",
  nextWeek: "send",
  noProgramme: "send",
  sleep: "sleep",
};

/** Reasons a WhatsApp message answers; the rest need the coach at her desk. */
const NUDGED: QueueKind[] = ["late", "unpaid", "silent", "missed", "sleep"];

/** Where "Ouvrir" goes: the screen that answers the reason. */
function openHref(item: QueueItem): string {
  switch (item.kind) {
    case "late":
    case "checkin":
      return `/clients/${item.clientId}?onglet=checkins`;
    case "unpaid":
      return `/facturation?ligne=${item.clientId}`;
    case "nextWeek":
      return item.programmeId ? `/programmes/${item.programmeId}` : "/programmes";
    case "noProgramme":
      return "/programmes";
    default:
      return `/clients/${item.clientId}`;
  }
}

/**
 * The coach's day, on the pane she opens the app on: every client who needs
 * her, grouped by why, each with the one action that answers it — a message
 * already written for WhatsApp, or the screen to go to.
 */
export async function QueuePanel({ items, callLink }: { items: QueueItem[]; callLink: string | null }) {
  const t = await getTranslations("queue");
  const tCalls = await getTranslations("calls");
  const tPain = await getTranslations("pain");

  if (items.length === 0) {
    return <PaneEmpty icon="checkIns" title={t("empty")} hint={t("emptyHint")} />;
  }

  const groups = QUEUE_ORDER.map((kind) => ({
    kind,
    rows: items.filter((item) => item.kind === kind),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="h-full min-w-0 overflow-y-auto p-5">
      <div className="mx-auto max-w-[760px] space-y-5">
        <PaneHead kicker={t("count", { count: items.length })} title={t("title")} />

        {groups.map((group) => (
          <section key={group.kind} className="glass rounded-r3 p-4">
            <SectionTitle
              icon={ICON[group.kind]}
              aside={<span className="tnum text-[12px] font-bold text-[var(--ink3)]">{group.rows.length}</span>}
            >
              {t(`group.${group.kind}`)}
            </SectionTitle>

            <ul className="mt-3 flex flex-col gap-1.5">
              {group.rows.map((item, index) => {
                const values = {
                  first: item.firstName,
                  amount: item.amount ?? "",
                  period: item.period ?? "",
                };
                const when = item.call ? callLabel(item.call.startsAt) : "";
                const painLevel = item.pain ? tPain(`level.${item.pain.level}`) : "";
                const wa = item.pain
                  ? waLink(item.phone, tPain("wa", { first: item.firstName, exercise: item.pain.exercise }))
                  : item.call
                  ? waLink(
                      item.phone,
                      tCalls("waConfirm", {
                        first: item.firstName,
                        when,
                        length: tCalls("length", { minutes: item.call.minutes }),
                        link: callLink ? tCalls("waLink", { link: callLink }) : "",
                      }),
                    )
                  : NUDGED.includes(item.kind)
                    ? waLink(item.phone, t(`wa.${item.kind}`, values))
                    : null;
                const action =
                  item.kind === "request" ? t("decide") : item.kind === "checkin" ? t("read") : item.kind === "nextWeek" || item.kind === "noProgramme" ? t("write") : t("open");

                return (
                  <li
                    key={`${item.clientId}-${index}`}
                    className="glass2 flex h-[60px] items-center gap-3 rounded-r2 px-2.5"
                  >
                    <Tile accent>{item.initials}</Tile>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">{item.name}</span>
                      <span
                        className={`block truncate text-[11.5px] ${
                          item.kind === "late" || item.kind === "unpaid" || item.kind === "pain" || item.request?.callOver
                            ? "text-[var(--a3)]" : "text-[var(--ink2)]"
                        }`}
                      >
                        {item.request
                          ? item.request.callAt
                            ? item.request.callOver
                              ? t("requestCallOver")
                              : t("requestCall", { when: callLabel(item.request.callAt) })
                            : t("requestNoCall")
                          : item.pain
                          ? [item.pain.exercise, painLevel, item.pain.note].filter(Boolean).join(" · ")
                          : item.call
                            ? `${when} · ${tCalls("length", { minutes: item.call.minutes })}`
                            : t(`line.${item.kind}`, values)}
                      </span>
                    </span>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t("whatsapp")} · ${item.name}`}
                        className="cta flex h-9 shrink-0 items-center gap-1.5 rounded-rp px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--onA)]"
                      >
                        <Icon name="whatsapp" size={16} />
                        <span className="hidden sm:inline">{t("whatsapp")}</span>
                      </a>
                    )}
                    {item.call && (
                      <a
                        href={`/rendez-vous/${item.call.id}`}
                        aria-label={`${tCalls("addToCalendar")} · ${item.name}`}
                        title={tCalls("addToCalendar")}
                        className="glass flex size-9 shrink-0 items-center justify-center rounded-rp text-[var(--ink)]"
                      >
                        <Icon name="calendar" size={16} />
                      </a>
                    )}
                    {item.pain ? (
                      <form action={markPainSeen}>
                        <input type="hidden" name="id" value={item.pain.id} />
                        <button
                          type="submit"
                          className="glass flex h-9 shrink-0 items-center rounded-rp px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--ink)]"
                        >
                          {tPain("seen")}
                        </button>
                      </form>
                    ) : (
                    <Link
                      href={openHref(item)}
                      className="glass flex h-9 shrink-0 items-center rounded-rp px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--ink)]"
                    >
                      {action}
                    </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
