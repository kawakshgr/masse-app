"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ClientRow } from "@/lib/supabase/types";
import { GOALS } from "@/lib/onboarding";
import { removeClient, updateClientRecord } from "@/app/(coach)/clients/actions";

/** The record as typed, editable in place, plus the one destructive control. */
export function RecordPanel({
  client,
  sleepTargetLabel,
}: {
  client: ClientRow;
  sleepTargetLabel: string | null;
}) {
  const t = useTranslations("record");
  const tGoal = useTranslations("goal");
  const tDays = useTranslations("days");
  const tRemove = useTranslations("remove");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const firstName = client.first_name ?? client.name.split(/\s+/)[0] ?? "";

  if (!editing) {
    return (
      <section className="glass rounded-r3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {t("title")}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[10px] text-[var(--ink2)]"
            >
              {t("edit")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[10px] text-[var(--ink3)] hover:border-[var(--a3)] hover:text-[var(--a3)]"
            >
              {tRemove("action")}
            </button>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          {[
            [t("goal"), client.goal && tGoal(client.goal)],
            [t("injuries"), client.injuries.join(", ")],
            [t("equipment"), client.equipment.join(", ")],
            [t("days"), client.session_days.map((d) => tDays(String(d)).slice(0, 3)).join(", ")],
            [t("sleepTarget"), sleepTargetLabel],
          ].map(([label, value]) => (
            <div key={String(label)} className="min-w-0">
              <dt className="text-[var(--ink3)]">{label}</dt>
              <dd className="truncate text-[var(--ink)]">
                {value ? String(value) : t("none")}
              </dd>
            </div>
          ))}
        </dl>

        {confirming && (
          <div
            role="alertdialog"
            aria-label={tRemove("confirmTitle", { name: firstName })}
            className="mt-4 rounded-r2 border border-[var(--a3)] p-3"
          >
            <p className="text-[12px] font-bold text-[var(--a3)]">
              {tRemove("confirmTitle", { name: firstName })}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink2)]">
              {tRemove("confirmBody")}
            </p>
            <form action={removeClient} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="client_id" value={client.id} />
              <input type="hidden" name="expected" value={firstName} />
              <label className="block min-w-0 flex-1">
                <span className="block text-[10px] text-[var(--ink2)]">
                  {tRemove("confirmType")}
                </span>
                <input
                  name="confirm"
                  required
                  autoComplete="off"
                  className="mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)]"
                />
              </label>
              <button
                type="submit"
                className="h-8 shrink-0 rounded-r2 border border-[var(--a3)] px-3 text-[11px] font-bold text-[var(--a3)]"
              >
                {tRemove("confirm")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-8 shrink-0 rounded-r2 px-3 text-[11px] text-[var(--ink3)]"
              >
                {tRemove("cancel")}
              </button>
            </form>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="glass rounded-r3 p-4">
      <h3 className="text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
        {t("title")}
      </h3>

      <form action={updateClientRecord} className="mt-3 space-y-3 text-[11px]">
        <input type="hidden" name="client_id" value={client.id} />

        <label className="block">
          <span className="block text-[10px] text-[var(--ink2)]">Nom</span>
          <input
            name="name"
            defaultValue={client.name}
            className="mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)]"
          />
        </label>

        <label className="block">
          <span className="block text-[10px] text-[var(--ink2)]">{t("goal")}</span>
          <select
            name="goal"
            defaultValue={client.goal ?? ""}
            className="mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)]"
          >
            <option value="">—</option>
            {GOALS.map((goal) => (
              <option key={goal} value={goal}>
                {tGoal(goal)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3">
          <label className="block flex-1">
            <span className="block text-[10px] text-[var(--ink2)]">cm</span>
            <input
              name="height_cm"
              inputMode="decimal"
              defaultValue={client.height_cm ?? ""}
              className="tnum mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)]"
            />
          </label>
          <label className="block flex-1">
            <span className="block text-[10px] text-[var(--ink2)]">{t("sleepTarget")}</span>
            <input
              name="sleep_target_h"
              inputMode="decimal"
              defaultValue={client.sleep_target_h ?? ""}
              className="tnum mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)]"
            />
          </label>
          <label className="block flex-1">
            <span className="block text-[10px] text-[var(--ink2)]">{t("days")}</span>
            <input
              name="session_days"
              defaultValue={client.session_days.join(",")}
              placeholder="0,2,4"
              className="tnum mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)]"
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-[10px] text-[var(--ink2)]">{t("injuries")}</span>
          <textarea
            name="injuries"
            rows={2}
            defaultValue={client.injuries.join("\n")}
            className="mt-1 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] p-2 text-[12px] text-[var(--ink)]"
          />
        </label>

        <label className="block">
          <span className="block text-[10px] text-[var(--ink2)]">{t("equipment")}</span>
          <textarea
            name="equipment"
            rows={2}
            defaultValue={client.equipment.join("\n")}
            className="mt-1 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] p-2 text-[12px] text-[var(--ink)]"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="cycle_tracking"
            defaultChecked={client.cycle_tracking}
            className="size-4 accent-[var(--a1)]"
          />
          <span className="text-[11px] text-[var(--ink2)]">Cycle</span>
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="h-8 rounded-r2 cta px-3 text-[11px] font-bold text-[var(--on-accent)]"
          >
            {t("save")}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-8 rounded-r2 border border-[var(--edge)] px-3 text-[11px] text-[var(--ink2)]"
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    </section>
  );
}
