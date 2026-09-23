"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ClientRow } from "@/lib/supabase/types";
import { GOALS } from "@/lib/onboarding";
import { removeClient, updateClientRecord } from "@/app/(coach)/clients/actions";

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";
const cell =
  "h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

type Row = [label: string, value: string | null | undefined];

/** Short facts read as a two-column ledger. */
function Tight({ title, rows }: { title: string; rows: Row[] }) {
  const kept = rows.filter(([, value]) => value);
  if (kept.length === 0) return null;
  return (
    <section className="glass flex min-w-0 flex-col gap-2.5 rounded-r3 p-4">
      <span className={micro}>{title}</span>
      <div className="flex flex-col gap-2">
        {kept.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <span className="flex-none text-[12px] text-[var(--ink3)]">{label}</span>
            <span className="min-w-0 text-right text-[13.5px] leading-[1.45] font-semibold [overflow-wrap:anywhere]">
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Sentences read as stacked notes. */
function Wide({ title, rows }: { title: string; rows: Row[] }) {
  const kept = rows.filter(([, value]) => value);
  if (kept.length === 0) return null;
  return (
    <section className="glass flex min-w-0 flex-col gap-3 rounded-r3 p-4">
      <span className={micro}>{title}</span>
      <div className="flex flex-col gap-2.5">
        {kept.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11.5px] tracking-[.06em] text-[var(--ink3)]">
              {label}
            </span>
            <span className="text-[13.5px] leading-[1.5] font-semibold text-pretty">
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  value,
  type,
  placeholder,
  wide,
}: {
  label: string;
  name: string;
  value: string | number | null | undefined;
  type?: string;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`block min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="block text-[12px] text-[var(--ink2)]">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        className={`mt-1 ${cell} ${type === "date" ? "tnum" : ""}`}
      />
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
 * The file. Nothing in it is derived — it is the notes app a coach keeps beside
 * the product today, brought inside it, and only she and this client can read
 * it. Every field is optional and every field is editable.
 */
export function RecordPanel({
  client,
  sleepTargetLabel,
  billingLine,
}: {
  client: ClientRow;
  sleepTargetLabel: string | null;
  /** What was agreed, said once here and owned by the billing tab. */
  billingLine: string | null;
}) {
  const t = useTranslations("record");
  const tGoal = useTranslations("goal");
  const tDays = useTranslations("days");
  const tRemove = useTranslations("remove");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const firstName = client.first_name ?? client.name.split(/\s+/)[0] ?? "";
  const dateFmt = (iso: string | null) =>
    iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null;

  const age = (() => {
    const year = client.birth_date
      ? Number(client.birth_date.slice(0, 4))
      : client.birth_year;
    if (!year) return null;
    return new Date().getUTCFullYear() - year;
  })();

  const birth = client.birth_date
    ? `${dateFmt(client.birth_date)}${age ? ` · ${age} ${t("years")}` : ""}`
    : client.birth_year
      ? `${client.birth_year}${age ? ` · ${age} ${t("years")}` : ""}`
      : null;

  const startWeight =
    client.start_weight_kg != null
      ? `${client.start_weight_kg} kg${
          client.start_weight_date ? ` · ${dateFmt(client.start_weight_date)}` : ""
        }`
      : null;

  if (editing) {
    return (
      <form action={updateClientRecord} className="space-y-3">
        <input type="hidden" name="client_id" value={client.id} />

        <Group title={t("contact")}>
          <Field label={t("name")} name="name" value={client.name} />
          <Field label={t("email")} name="email" type="email" value={client.email} />
          <Field label={t("phone")} name="phone" type="tel" value={client.phone} />
          <Field label="WhatsApp" name="whatsapp" type="tel" value={client.whatsapp} />
          <Field
            label={t("channel")}
            name="preferred_channel"
            value={client.preferred_channel}
            placeholder={t("channelPlaceholder")}
          />
          <Field
            label={t("timezone")}
            name="timezone"
            value={client.timezone}
            placeholder="Paris · CET"
          />
          <Field label={t("languages")} name="languages" value={client.languages} />
        </Group>

        <Group title={t("social")}>
          <Field label="Instagram" name="instagram" value={client.instagram} placeholder="@" />
          <Field label="TikTok" name="tiktok" value={client.tiktok} placeholder="@" />
          <Field label="Strava" name="strava" value={client.strava} />
          <Field label="Hevy" name="hevy" value={client.hevy} />
        </Group>

        <Group title={t("athlete")}>
          <Field label={t("birth")} name="birth_date" type="date" value={client.birth_date} />
          <Field label={t("height")} name="height_cm" value={client.height_cm} />
          <Field label={t("occupation")} name="occupation" value={client.occupation} wide />
          <Field
            label={t("trainingAge")}
            name="training_age"
            value={client.training_age}
            placeholder={t("trainingAgePlaceholder")}
            wide
          />
          <label className="block min-w-0 sm:col-span-2">
            <span className="block text-[12px] text-[var(--ink2)]">{t("goal")}</span>
            <select name="goal" defaultValue={client.goal ?? ""} className={`mt-1 ${cell}`}>
              <option value="">—</option>
              {GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {tGoal(goal)}
                </option>
              ))}
            </select>
          </label>
        </Group>

        <Group title={t("programming")}>
          <Field
            label={t("days")}
            name="session_days"
            value={client.session_days.join(",")}
            placeholder="0,2,4"
          />
          <Field label={t("sleepTarget")} name="sleep_target_h" value={client.sleep_target_h} />
          <Field label={t("stepsTarget")} name="steps_target" value={client.steps_target} />
          <label className="block min-w-0 sm:col-span-2">
            <span className="block text-[12px] text-[var(--ink2)]">{t("equipment")}</span>
            <textarea
              name="equipment"
              rows={2}
              defaultValue={client.equipment.join("\n")}
              className="mt-1 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] p-2.5 text-[13px] text-[var(--ink)]"
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              name="cycle_tracking"
              defaultChecked={client.cycle_tracking}
              className="size-4 accent-[var(--a1)]"
            />
            <span className="text-[13px] text-[var(--ink2)]">{t("cycle")}</span>
          </label>
        </Group>

        <Group title={t("logistics")}>
          <label className="block min-w-0 sm:col-span-2">
            <span className="block text-[12px] text-[var(--ink2)]">{t("injuries")}</span>
            <textarea
              name="injuries"
              rows={2}
              defaultValue={client.injuries.join("\n")}
              className="mt-1 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] p-2.5 text-[13px] text-[var(--ink)]"
            />
          </label>
          <Field label={t("diet")} name="diet" value={client.diet} wide />
          <Field
            label={t("emergency")}
            name="emergency_contact"
            value={client.emergency_contact}
            placeholder={t("emergencyPlaceholder")}
            wide
          />
          <label className="block min-w-0 sm:col-span-2">
            <span className="block text-[12px] text-[var(--ink2)]">{t("note")}</span>
            <textarea
              name="file_note"
              rows={3}
              defaultValue={client.file_note ?? ""}
              className="mt-1 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] p-2.5 text-[13px] text-[var(--ink)]"
            />
          </label>
        </Group>

        <div className="flex gap-2">
          <button
            type="submit"
            className="h-9 rounded-r2 cta px-4 text-[13px] font-semibold text-[var(--on-accent)]"
          >
            {t("save")}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="glass2 h-9 rounded-r2 px-4 text-[13px] text-[var(--ink2)]"
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className={micro}>{t("title")}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="glass2 h-8 rounded-r2 px-3 text-[12px] font-semibold text-[var(--ink2)]"
          >
            {t("edit")}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-8 rounded-r2 border border-[var(--edge)] px-3 text-[12px] text-[var(--ink3)] hover:border-[var(--a3)] hover:text-[var(--a3)]"
          >
            {tRemove("action")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(232px,1fr))] items-start gap-3">
        <Tight
          title={t("contact")}
          rows={[
            [t("phone"), client.phone],
            [t("email"), client.email],
            ["WhatsApp", client.whatsapp],
            [t("channel"), client.preferred_channel],
            [t("timezone"), client.timezone],
            [t("languages"), client.languages],
          ]}
        />
        <Tight
          title={t("social")}
          rows={[
            ["Instagram", client.instagram],
            ["TikTok", client.tiktok],
            ["Strava", client.strava],
            ["Hevy", client.hevy],
          ]}
        />
        <Tight
          title={t("athlete")}
          rows={[
            [t("birth"), birth],
            [t("height"), client.height_cm ? `${client.height_cm} cm` : null],
            [t("startWeight"), startWeight],
          ]}
        />
        <Tight
          title={t("programming")}
          rows={[
            [
              t("days"),
              client.session_days.length
                ? client.session_days.map((d) => tDays(String(d)).slice(0, 3)).join(", ")
                : null,
            ],
            [t("sleepTarget"), sleepTargetLabel],
            [t("stepsTarget"), client.steps_target?.toLocaleString("fr-FR") ?? null],
            [t("equipment"), client.equipment.join(", ")],
            [t("cycle"), client.cycle_tracking ? t("cycleOn") : null],
          ]}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(272px,1fr))] items-start gap-3">
        <Wide
          title={t("training")}
          rows={[
            [t("occupation"), client.occupation],
            [t("trainingAge"), client.training_age],
            [t("goal"), client.goal ? tGoal(client.goal) : null],
          ]}
        />
        <Wide
          title={t("logistics")}
          rows={[
            [t("injuries"), client.injuries.join(" · ")],
            [t("diet"), client.diet],
            [t("emergency"), client.emergency_contact],
            [
              t("joined"),
              t("joinedOn", {
                date: new Date(client.created_at).toLocaleDateString("fr-FR"),
              }),
            ],
            [t("billing"), billingLine],
            [t("note"), client.file_note],
          ]}
        />
      </div>

      <p className="max-w-[72ch] text-[12.5px] leading-[1.5] text-[var(--ink2)] text-pretty">
        {t("fileNote", { first: firstName })}
      </p>

      {confirming && (
        <div
          role="alertdialog"
          aria-label={tRemove("confirmTitle", { name: firstName })}
          className="rounded-r2 border border-[var(--a3)] p-3"
        >
          <p className="text-[13px] font-semibold text-[var(--a3)]">
            {tRemove("confirmTitle", { name: firstName })}
          </p>
          <p className="mt-1 text-[13px] leading-[1.5] text-[var(--ink2)]">
            {tRemove("confirmBody")}
          </p>
          <form action={removeClient} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="client_id" value={client.id} />
            <input type="hidden" name="expected" value={firstName} />
            <label className="block min-w-0 flex-1">
              <span className="block text-[12px] text-[var(--ink2)]">
                {tRemove("confirmType")}
              </span>
              <input name="confirm" required autoComplete="off" className={`mt-1 ${cell}`} />
            </label>
            <button
              type="submit"
              className="h-9 shrink-0 rounded-r2 border border-[var(--a3)] px-3 text-[13px] font-semibold text-[var(--a3)]"
            >
              {tRemove("confirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-9 shrink-0 rounded-r2 px-3 text-[13px] text-[var(--ink3)]"
            >
              {tRemove("cancel")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
