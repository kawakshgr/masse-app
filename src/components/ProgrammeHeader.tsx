"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { deleteProgramme, renameProgramme } from "@/app/(coach)/programmes/actions";

/** Rename in place, and the one destructive control, behind a typed name. */
export function ProgrammeHeader({
  programmeId,
  name,
}: {
  programmeId: string;
  name: string;
}) {
  const t = useTranslations("programme");
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="min-w-0 flex-1">
      {renaming ? (
        <form action={renameProgramme} className="flex items-center gap-2">
          <input type="hidden" name="programme_id" value={programmeId} />
          <input
            name="name"
            defaultValue={name}
            autoFocus
            className="h-8 min-w-0 flex-1 rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[14px] font-bold text-[var(--ink)]"
          />
          <button
            type="submit"
            className="h-8 shrink-0 rounded-r2 bg-[var(--a1)] px-3 text-[11px] font-semibold text-[var(--onA)]"
          >
            {t("rename")}
          </button>
          <button
            type="button"
            onClick={() => setRenaming(false)}
            className="h-8 shrink-0 rounded-r2 px-2 text-[11px] text-[var(--ink3)]"
          >
            {t("cancel")}
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate font-display text-[20px] font-extrabold tracking-[-.04em]">
            {name}
          </h2>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="shrink-0 rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[10px] text-[var(--ink2)]"
          >
            {t("rename")}
          </button>
          <button
            type="button"
            onClick={() => setConfirming((v) => !v)}
            className="shrink-0 rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[10px] text-[var(--ink3)] hover:border-[var(--a3)] hover:text-[var(--a3)]"
          >
            {t("remove")}
          </button>
        </div>
      )}

      {confirming && (
        <div
          role="alertdialog"
          aria-label={t("confirmTitle", { name })}
          className="mt-3 rounded-r2 border border-[var(--a3)] p-3"
        >
          <p className="text-[12px] font-bold text-[var(--a3)]">
            {t("confirmTitle", { name })}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink2)]">
            {t("confirmBody")}
          </p>
          <form action={deleteProgramme} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="programme_id" value={programmeId} />
            <input type="hidden" name="expected" value={name} />
            <label className="block min-w-0 flex-1">
              <span className="block text-[10px] text-[var(--ink3)]">
                {t("confirmType")}
              </span>
              <input
                name="confirm"
                required
                autoComplete="off"
                className="mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[12px] text-[var(--ink)]"
              />
            </label>
            <button
              type="submit"
              className="h-8 shrink-0 rounded-r2 border border-[var(--a3)] px-3 text-[11px] font-semibold text-[var(--a3)]"
            >
              {t("confirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-8 shrink-0 rounded-r2 px-3 text-[11px] text-[var(--ink3)]"
            >
              {t("cancel")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
