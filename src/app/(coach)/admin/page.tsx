import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { setCoachSuspended } from "./actions";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  // The page refuses too, not just the tab bar: a URL is not a permission.
  if (!admin) {
    return (
      <div className="grid h-full place-items-center p-6">
        <p className="text-[12px] text-[var(--ink3)]">{t("noAccess")}</p>
      </div>
    );
  }

  const [overviewRes, logRes] = await Promise.all([
    supabase.rpc("admin_coach_overview"),
    supabase
      .from("admin_access_log")
      .select("id, action, reason, accessed_at, client_id, coach_id")
      .order("accessed_at", { ascending: false })
      .limit(40),
  ]);

  const coaches = overviewRes.data ?? [];
  const log = logRes.data ?? [];

  return (
    <div className="space-y-4 p-5">
      <header>
        <h2 className="font-display text-[20px] font-extrabold tracking-[-.04em]">
          {t("title")}
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink2)]">
          {t("lede")}
        </p>
      </header>

      <section className="glass rounded-r3 p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {t("coaches")}
        </h3>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-[var(--ink3)]">
                <th className="pb-2 font-semibold">{t("coaches")}</th>
                <th className="pb-2 text-right font-semibold">{t("clients")}</th>
                <th className="pb-2 text-right font-semibold">{t("programmes")}</th>
                <th className="pb-2 pl-4 font-semibold">{t("created")}</th>
                <th className="pb-2 pl-4 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {coaches.map((coach) => {
                const suspended = coach.suspended_at != null;
                return (
                  <tr key={coach.coach_id} className="border-t border-[var(--hair)]">
                    <td className="py-2">
                      <span className="block truncate font-semibold">{coach.name}</span>
                      <span
                        className={`text-[10px] ${
                          suspended ? "text-[var(--a3)]" : "text-[var(--ink3)]"
                        }`}
                      >
                        {suspended ? t("suspended") : t("active")}
                      </span>
                    </td>
                    <td className="tnum py-2 text-right">{coach.client_count}</td>
                    <td className="tnum py-2 text-right">{coach.programme_count}</td>
                    <td className="tnum py-2 pl-4 text-[var(--ink2)]">
                      {coach.created_at.slice(0, 10)}
                    </td>
                    <td className="py-2 pl-4">
                      <form action={setCoachSuspended} className="flex items-center gap-2">
                        <input type="hidden" name="coach_id" value={coach.coach_id} />
                        <input type="hidden" name="suspend" value={suspended ? "0" : "1"} />
                        <input
                          name="reason"
                          required
                          minLength={10}
                          placeholder={t("reasonPlaceholder")}
                          aria-label={t("reason")}
                          className="h-8 w-[200px] rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[11px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
                        />
                        <button
                          type="submit"
                          className={`h-8 shrink-0 rounded-r2 border px-3 text-[11px] font-semibold ${
                            suspended
                              ? "border-[var(--a1)] text-[var(--a1)]"
                              : "border-[var(--a3)] text-[var(--a3)]"
                          }`}
                        >
                          {suspended ? t("restore") : t("suspend")}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass rounded-r3 p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {t("log")}
        </h3>

        {log.length === 0 ? (
          <p className="mt-3 text-[11px] text-[var(--ink2)]">{t("logEmpty")}</p>
        ) : (
          <ul className="mt-3">
            {log.map((entry) => (
              <li
                key={entry.id}
                className="flex items-baseline gap-3 border-b border-[var(--hair)] py-2 last:border-0"
              >
                <span className="tnum shrink-0 text-[10px] text-[var(--ink3)]">
                  {entry.accessed_at.slice(0, 16).replace("T", " ")}
                </span>
                <span className="shrink-0 text-[11px] font-semibold">
                  {t(`action.${entry.action}`)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink2)]">
                  {entry.reason}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
