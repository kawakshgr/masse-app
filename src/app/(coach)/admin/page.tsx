import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  allowCoachEmail,
  disallowCoachEmail,
  setCheckInDue,
  setCoachSuspended,
} from "./actions";
import { DUE_OFFSETS, DEFAULT_DUE_OFFSET } from "@/lib/checkIns";
import { CoachBillingProfile } from "@/components/CoachBillingProfile";

/** What an invoice cannot go out without; the section header counts them. */
const REQUIRED_MENTIONS = [
  "legal_name",
  "siret",
  "address_line1",
  "postcode",
  "city",
  "iban",
] as const;

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";
const cell =
  "h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

/**
 * One setting, folded. The header says where it stands — computed from the
 * same rows the body edits — so the page reads at a glance and opens only
 * where there is something to do. Native <details>: no state to keep, and a
 * server action that re-renders the page leaves it open.
 */
function Section({
  glyph,
  title,
  status,
  alert = false,
  children,
}: {
  glyph: string;
  title: string;
  status: string;
  alert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group glass rounded-r3">
      <summary className="flex h-[64px] cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="glass2 flex size-9 shrink-0 items-center justify-center rounded-r2 text-[15px] text-[var(--ink2)]"
        >
          {glyph}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{title}</span>
          <span
            className={`block truncate text-[12px] ${
              alert ? "text-[var(--a3)]" : "text-[var(--ink2)]"
            }`}
          >
            {status}
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 text-[18px] leading-none text-[var(--ink3)] transition-transform group-open:rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="border-t border-[var(--hair)] p-4">{children}</div>
    </details>
  );
}

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const tDue = await getTranslations("checkInDue");
  const tCompany = await getTranslations("company");
  const tAllow = await getTranslations("allowlist");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const me = user?.id ?? "";

  const [{ data: admin }, { data: coach }, { data: profile }] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id", me).maybeSingle(),
    supabase.from("coaches").select("check_in_due_offset").eq("id", me).maybeSingle(),
    supabase.from("coach_billing_profiles").select("*").eq("coach_id", me).maybeSingle(),
  ]);

  // Every coach owns the page: it carries her own company. The platform
  // sections are fetched only for whoever may actually read them — a URL is
  // not a permission, and neither is a rendered tab.
  const [overviewRes, logRes, allowlistRes] = admin
    ? await Promise.all([
        supabase.rpc("admin_coach_overview"),
        supabase
          .from("admin_access_log")
          .select("id, action, reason, accessed_at, client_id, coach_id")
          .order("accessed_at", { ascending: false })
          .limit(40),
        supabase.from("allowed_coach_emails").select("email, note, added_at").order("added_at"),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  const coaches = overviewRes.data ?? [];
  const log = logRes.data ?? [];
  const allowlist = allowlistRes.data ?? [];

  const due = coach?.check_in_due_offset ?? DEFAULT_DUE_OFFSET;
  const dueDay = tDue(`o${due}`);
  const missing = REQUIRED_MENTIONS.filter((key) => !String(profile?.[key] ?? "").trim()).length;
  const suspendedCount = coaches.filter((row) => row.suspended_at != null).length;

  return (
    <div className="mx-auto max-w-[860px] space-y-6 p-5">
      <header>
        <h2 className="font-display text-[23px] font-extrabold tracking-[-.03em]">
          {t("title")}
        </h2>
        <p className="mt-1 text-[13px] leading-[1.5] text-[var(--ink2)]">
          {/* The platform line only means something to whoever runs it. */}
          {t(admin ? "lede" : "coachLede")}
        </p>
      </header>

      <div className="space-y-2">
        {admin && <h3 className={`px-1 ${micro}`}>{t("mine")}</h3>}

        <Section
          glyph="◷"
          title={tDue("title")}
          status={tDue("summary", {
            day: locale === "fr" ? dueDay.toLocaleLowerCase("fr") : dueDay,
          })}
        >
          <p className="max-w-[72ch] text-[13px] leading-[1.5] text-[var(--ink2)]">
            {tDue("lede")}
          </p>
          <form action={setCheckInDue} className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className={micro}>{tDue("label")}</span>
              <select name="check_in_due_offset" defaultValue={due} className={`${cell} w-[180px]`}>
                {DUE_OFFSETS.map((offset) => (
                  <option key={offset} value={offset}>
                    {tDue(`o${offset}`)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="cta h-9 rounded-r2 px-4 text-[13px] font-semibold text-[var(--on-accent)]"
            >
              {tDue("save")}
            </button>
          </form>
        </Section>

        <Section
          glyph="€"
          title={tCompany("title")}
          alert={missing > 0}
          status={
            missing > 0
              ? tCompany("missing", { count: missing })
              : tCompany("complete", {
                  date: new Date(profile!.updated_at).toLocaleDateString(locale),
                })
          }
        >
          <CoachBillingProfile profile={profile} />
        </Section>
      </div>

      {/* Platform-wide, and only for whoever may read it. */}
      {admin && (
        <div className="space-y-2">
          <h3 className={`px-1 ${micro}`}>{t("platform")}</h3>

          <Section
            glyph="◉"
            title={t("coaches")}
            status={[
              t("coachCount", { count: coaches.length }),
              suspendedCount > 0 ? t("suspendedCount", { count: suspendedCount }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            <ul className="flex flex-col gap-1.5">
              {coaches.map((row) => {
                const suspended = row.suspended_at != null;
                return (
                  <li key={row.coach_id} className="glass2 rounded-r2">
                    <details className="group/row">
                      <summary className="flex h-[54px] cursor-pointer list-none items-center gap-3 px-3 [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">
                            {row.name}
                          </span>
                          <span className="tnum block truncate text-[11.5px] text-[var(--ink2)]">
                            {[
                              t("clientCount", { count: Number(row.client_count) }),
                              t("programmeCount", { count: Number(row.programme_count) }),
                              t("since", {
                                date: new Date(row.created_at).toLocaleDateString(locale),
                              }),
                            ].join(" · ")}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-rp border px-2 py-px text-[10px] uppercase tracking-[.14em] ${
                            suspended
                              ? "border-[var(--a3)] text-[var(--a3)]"
                              : "border-[var(--edge)] text-[var(--ink3)]"
                          }`}
                        >
                          {suspended ? t("suspended") : t("active")}
                        </span>
                        <span className="shrink-0 text-[12px] font-semibold text-[var(--ink2)] group-open/row:hidden">
                          {suspended ? t("restoreOpen") : t("suspendOpen")}
                        </span>
                      </summary>
                      <form
                        action={setCoachSuspended}
                        className="flex flex-wrap items-center gap-2 border-t border-[var(--hair)] p-3"
                      >
                        <input type="hidden" name="coach_id" value={row.coach_id} />
                        <input type="hidden" name="suspend" value={suspended ? "0" : "1"} />
                        <input
                          name="reason"
                          required
                          minLength={10}
                          placeholder={t("reasonPlaceholder")}
                          aria-label={t("reason")}
                          className={`${cell} min-w-[200px] flex-1`}
                        />
                        <button
                          type="submit"
                          className={`h-9 shrink-0 rounded-r2 border px-3 text-[13px] font-semibold ${
                            suspended
                              ? "border-[var(--accent-soft)] text-[var(--accent-soft)]"
                              : "border-[var(--a3)] text-[var(--a3)]"
                          }`}
                        >
                          {suspended ? t("restore") : t("suspend")}
                        </button>
                        <p className="w-full text-[11.5px] text-[var(--ink3)]">{t("reason")}</p>
                      </form>
                    </details>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section
            glyph="✓"
            title={tAllow("title")}
            alert={allowlist.length === 0}
            status={tAllow("count", { count: allowlist.length })}
          >
            <p className="text-[13px] leading-[1.5] text-[var(--ink2)]">{tAllow("lede")}</p>

            <form action={allowCoachEmail} className="mt-4 flex flex-wrap items-end gap-2">
              <label className="flex min-w-[200px] flex-1 flex-col gap-1">
                <span className={micro}>{tAllow("email")}</span>
                <input name="email" type="email" required className={`${cell} w-full`} />
              </label>
              <label className="flex min-w-[140px] flex-1 flex-col gap-1">
                <span className={micro}>{tAllow("note")}</span>
                <input name="note" className={`${cell} w-full`} />
              </label>
              <button
                type="submit"
                className="cta h-9 shrink-0 rounded-r2 px-4 text-[13px] font-semibold text-[var(--on-accent)]"
              >
                {tAllow("add")}
              </button>
            </form>

            {allowlist.length === 0 ? (
              <p className="mt-3 text-[12px] text-[var(--a3)]">{tAllow("empty")}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-1.5">
                {allowlist.map((entry) => (
                  <li
                    key={entry.email}
                    className="glass2 flex h-[44px] items-center gap-3 rounded-r2 px-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                      {entry.email}
                    </span>
                    <span className="min-w-0 truncate text-[12px] text-[var(--ink3)]">
                      {entry.note}
                    </span>
                    <form action={disallowCoachEmail} className="shrink-0">
                      <input type="hidden" name="email" value={entry.email} />
                      <button
                        type="submit"
                        className="rounded-r1 px-2 py-0.5 text-[12px] text-[var(--ink3)] hover:text-[var(--a3)]"
                      >
                        {tAllow("remove")}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section glyph="≡" title={t("log")} status={t("logCount", { count: log.length })}>
            {log.length === 0 ? (
              <p className="text-[13px] text-[var(--ink2)]">{t("logEmpty")}</p>
            ) : (
              <ul>
                {log.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex h-[40px] items-center gap-3 border-b border-[var(--hair)] last:border-0"
                  >
                    <span className="tnum shrink-0 text-[11.5px] text-[var(--ink3)]">
                      {new Date(entry.accessed_at).toLocaleString(locale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    <span className="shrink-0 text-[12px] font-bold">
                      {t(`action.${entry.action}`)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--ink2)]">
                      {entry.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
