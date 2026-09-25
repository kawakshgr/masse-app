import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/Icon";
import { saveAccount } from "./actions";

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";
const cell =
  "h-10 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

function Field({
  label,
  name,
  value,
  type = "text",
  wide = false,
  required = false,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string | null | undefined;
  type?: string;
  wide?: boolean;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${wide ? "sm:col-span-2" : ""}`}>
      <span className={micro}>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
        autoComplete={autoComplete}
        className={cell}
      />
    </label>
  );
}

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-r3 p-4">
      <div className="flex items-center gap-3">
        <span className="glass2 flex size-11 shrink-0 items-center justify-center rounded-r2 text-[var(--accent)]">
          <Icon name={icon} size={24} />
        </span>
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em]">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Her own details, behind her name in the top bar. */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string; erreur?: string }>;
}) {
  const t = await getTranslations("account");
  const { enregistre, erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const me = user?.id ?? "";

  const [{ data: coach }, { data: address }] = await Promise.all([
    supabase.from("coaches").select("name, first_name, phone").eq("id", me).maybeSingle(),
    supabase
      .from("coach_billing_profiles")
      .select("address_line1, address_line2, postcode, city, country")
      .eq("coach_id", me)
      .maybeSingle(),
  ]);

  // `name` holds the full name; the surname is what follows the first name.
  const first = coach?.first_name ?? "";
  const full = coach?.name ?? "";
  const last = first && full.startsWith(`${first} `) ? full.slice(first.length + 1) : first ? "" : full;

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <form action={saveAccount} className="mx-auto max-w-[760px] space-y-3 p-5">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1 pb-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
              {user?.email}
            </p>
            <h1 className="mt-1 font-display text-[28px] font-extrabold uppercase leading-none tracking-[-.01em]">
              {t("title")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {enregistre && <span className="text-[12.5px] text-[var(--accent-soft)]">{t("saved")}</span>}
            {erreur && <span className="text-[12.5px] text-[var(--a3)]">{t("error")}</span>}
            <button
              type="submit"
              className="cta h-10 rounded-r2 px-5 text-[13px] font-semibold text-[var(--onA)]"
            >
              {t("save")}
            </button>
          </div>
        </header>

        <Card icon="account" title={t("identity")}>
          <Field label={t("firstName")} name="first_name" value={first} required autoComplete="given-name" />
          <Field label={t("lastName")} name="last_name" value={last} autoComplete="family-name" />
          <Field label={t("phone")} name="phone" type="tel" value={coach?.phone} autoComplete="tel" />
          <label className="flex min-w-0 flex-col gap-1">
            <span className={micro}>{t("email")}</span>
            <input value={user?.email ?? ""} readOnly className={`${cell} text-[var(--ink2)]`} />
            <span className="text-[11px] leading-[1.45] text-[var(--ink3)]">{t("emailHint")}</span>
          </label>
        </Card>

        <Card icon="address" title={t("address")}>
          <Field label={t("line1")} name="address_line1" value={address?.address_line1} wide autoComplete="address-line1" />
          <Field label={t("line2")} name="address_line2" value={address?.address_line2} wide autoComplete="address-line2" />
          <Field label={t("postcode")} name="postcode" value={address?.postcode} autoComplete="postal-code" />
          <Field label={t("city")} name="city" value={address?.city} autoComplete="address-level2" />
          <Field label={t("country")} name="country" value={address?.country ?? "France"} autoComplete="country-name" />
          <p className="self-end text-[11.5px] leading-[1.45] text-[var(--ink3)]">{t("addressHint")}</p>
        </Card>

        <Link
          href="/admin"
          className="glass flex h-[68px] items-center gap-3 rounded-r3 px-4 transition-colors hover:border-[var(--edge)]"
        >
          <span className="glass2 flex size-11 shrink-0 items-center justify-center rounded-r2 text-[var(--ink2)]">
            <Icon name="company" size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-bold uppercase tracking-[.14em]">{t("companyTitle")}</span>
            <span className="block truncate text-[12px] text-[var(--ink2)]">{t("companyHint")}</span>
          </span>
          <span aria-hidden className="text-[18px] text-[var(--ink3)]">›</span>
        </Link>
      </form>
    </div>
  );
}
