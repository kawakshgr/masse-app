"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveBillingProfile } from "@/app/(coach)/admin/actions";
import type { CoachBillingProfileRow } from "@/lib/supabase/types";

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";
const cell =
  "h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

function Field({
  label,
  name,
  value,
  hint,
  placeholder,
  wide,
}: {
  label: string;
  name: string;
  value: string | number | null;
  hint?: string;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`block min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="block text-[12px] text-[var(--ink2)]">{label}</span>
      <input
        name={name}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        className={`mt-1 ${cell}`}
      />
      {hint && (
        <span className="mt-1 block text-[11px] leading-[1.45] text-[var(--ink3)]">
          {hint}
        </span>
      )}
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="glass2 rounded-r3 p-3.5">
      <legend className={`px-1 ${micro}`}>{title}</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * The mandatory mentions a French invoice carries. Held once, read by every
 * invoice. Masse checks none of it against a registry — it prints what she
 * types, and her accountant is the one who says it is in order.
 */
export function CoachBillingProfile({
  profile,
}: {
  profile: CoachBillingProfileRow | null;
}) {
  const t = useTranslations("company");
  const [regime, setRegime] = useState(profile?.vat_regime ?? "franchise");

  return (
    <section className="glass rounded-r3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={micro}>{t("title")}</h3>
        {profile?.updated_at && (
          <span className="text-[11px] text-[var(--ink3)]">
            {t("updated", {
              date: new Date(profile.updated_at).toLocaleDateString("fr-FR"),
            })}
          </span>
        )}
      </div>
      <p className="mt-1.5 max-w-[70ch] text-[13px] leading-[1.5] text-[var(--ink2)]">
        {t("lede")}
      </p>

      <form action={saveBillingProfile} className="mt-4 space-y-3">
        <Group title={t("identity")}>
          <Field label={t("legalName")} name="legal_name" value={profile?.legal_name ?? ""} />
          <Field
            label={t("legalForm")}
            name="legal_form"
            value={profile?.legal_form ?? ""}
            placeholder="EI · EURL · SASU…"
          />
          <Field
            label={t("siret")}
            name="siret"
            value={profile?.siret ?? ""}
            hint={t("siretHint")}
          />
          <Field label={t("apeCode")} name="ape_code" value={profile?.ape_code ?? ""} placeholder="9313Z" />
          <Field
            label={t("rcsCity")}
            name="rcs_city"
            value={profile?.rcs_city ?? ""}
            hint={t("rcsHint")}
          />
          <Field label={t("insurance")} name="insurance" value={profile?.insurance ?? ""} />
        </Group>

        <Group title={t("address")}>
          <Field label={t("line1")} name="address_line1" value={profile?.address_line1 ?? ""} wide />
          <Field label={t("line2")} name="address_line2" value={profile?.address_line2 ?? ""} wide />
          <Field label={t("postcode")} name="postcode" value={profile?.postcode ?? ""} />
          <Field label={t("city")} name="city" value={profile?.city ?? ""} />
          <Field label={t("country")} name="country" value={profile?.country ?? "France"} />
        </Group>

        <Group title={t("vat")}>
          <label className="block min-w-0">
            <span className="block text-[12px] text-[var(--ink2)]">{t("regime")}</span>
            <select
              name="vat_regime"
              value={regime}
              onChange={(event) =>
                setRegime(event.target.value === "assujetti" ? "assujetti" : "franchise")
              }
              className={`mt-1 ${cell}`}
            >
              <option value="franchise">{t("franchise")}</option>
              <option value="assujetti">{t("assujetti")}</option>
            </select>
            <span className="mt-1 block text-[11px] leading-[1.45] text-[var(--ink3)]">
              {regime === "franchise" ? t("franchiseHint") : t("assujettiHint")}
            </span>
          </label>
          {regime === "assujetti" ? (
            <>
              <Field label={t("vatNumber")} name="vat_number" value={profile?.vat_number ?? ""} />
              <Field
                label={t("vatRate")}
                name="vat_rate"
                value={profile?.vat_rate ?? 20}
                placeholder="20"
              />
            </>
          ) : (
            // Kept in the form so switching back does not lose what she typed.
            <>
              <input type="hidden" name="vat_number" value={profile?.vat_number ?? ""} />
              <input type="hidden" name="vat_rate" value={profile?.vat_rate ?? 0} />
            </>
          )}
        </Group>

        <Group title={t("payment")}>
          <Field label="IBAN" name="iban" value={profile?.iban ?? ""} wide />
          <Field label="BIC" name="bic" value={profile?.bic ?? ""} />
          <Field
            label={t("terms")}
            name="payment_terms"
            value={profile?.payment_terms ?? ""}
            placeholder={t("termsPlaceholder")}
          />
          <Field
            label={t("latePenalty")}
            name="late_penalty"
            value={profile?.late_penalty ?? ""}
            hint={t("latePenaltyHint")}
            placeholder={t("latePenaltyPlaceholder")}
            wide
          />
          <Field
            label={t("recoveryFee")}
            name="recovery_fee"
            value={((profile?.recovery_fee_cents ?? 4000) / 100).toFixed(0)}
            hint={t("recoveryFeeHint")}
          />
        </Group>

        <Group title={t("numbering")}>
          <Field
            label={t("prefix")}
            name="invoice_prefix"
            value={profile?.invoice_prefix ?? "F"}
            hint={t("prefixHint")}
          />
          <Field
            label={t("nextNumber")}
            name="next_invoice_no"
            value={profile?.next_invoice_no ?? 1}
          />
          <Field
            label={t("footerNote")}
            name="footer_note"
            value={profile?.footer_note ?? ""}
            wide
          />
        </Group>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="h-9 rounded-r2 cta px-4 text-[13px] font-semibold text-[var(--on-accent)]"
          >
            {t("save")}
          </button>
          <p className="min-w-0 flex-1 text-[12px] leading-[1.45] text-[var(--ink3)]">
            {t("disclaimer")}
          </p>
        </div>
      </form>
    </section>
  );
}
