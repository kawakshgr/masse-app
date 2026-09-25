"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ActionMenu } from "@/components/ActionMenu";
import { MENU_DANGER, MENU_ITEM } from "@/components/Pane";
import { deleteProgramme, renameProgramme } from "@/app/(coach)/programmes/actions";

/** Rename in place, and the one destructive control, behind a typed name. */
export function ProgrammeHeader({
  programmeId,
  name,
  actions,
}: {
  programmeId: string;
  name: string;
  /** The page's own actions, drawn as rows of the same menu. */
  actions?: React.ReactNode;
}) {
  const t = useTranslations("programme");
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="min-w-0">
      {renaming ? (
        <form action={renameProgramme} className="flex items-center gap-2">
          <input type="hidden" name="programme_id" value={programmeId} />
          <input
            name="name"
            defaultValue={name}
            autoFocus
            className="h-8 min-w-0 flex-1 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[15px] font-semibold text-[var(--ink)]"
          />
          <button
            type="submit"
            className="h-8 shrink-0 rounded-r2 cta px-3 text-[12px] font-semibold text-[var(--on-accent)]"
          >
            {t("rename")}
          </button>
          <button
            type="button"
            onClick={() => setRenaming(false)}
            className="h-8 shrink-0 rounded-r2 px-2 text-[12px] text-[var(--ink3)]"
          >
            {t("cancel")}
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <h2 className="min-w-0 flex-1 truncate font-display text-[28px] font-extrabold uppercase leading-none tracking-[-.01em]">
            {name}
          </h2>
          <ActionMenu label={t("actions")}>
            <button type="button" onClick={() => setRenaming(true)} className={MENU_ITEM}>
              {t("rename")}
            </button>
            {actions}
            <div className="my-1.5 border-t border-[var(--hair)]" />
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={MENU_DANGER}
            >
              {t("remove")}
            </button>
          </ActionMenu>
        </div>
      )}

      {confirming && (
        <div
          role="alertdialog"
          aria-label={t("confirmTitle", { name })}
          className="mt-3 rounded-r2 border border-[var(--a3)] p-3"
        >
          <p className="text-[13px] font-semibold text-[var(--a3)]">
            {t("confirmTitle", { name })}
          </p>
          <p className="mt-1 text-[12px] leading-[1.5] text-[var(--ink2)]">
            {t("confirmBody")}
          </p>
          <form action={deleteProgramme} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="programme_id" value={programmeId} />
            <input type="hidden" name="expected" value={name} />
            <label className="block min-w-0 flex-1">
              <span className="block text-[11px] text-[var(--ink2)]">
                {t("confirmType")}
              </span>
              <input
                name="confirm"
                required
                autoComplete="off"
                className="mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)]"
              />
            </label>
            <button
              type="submit"
              className="h-8 shrink-0 rounded-r2 border border-[var(--a3)] px-3 text-[12px] font-semibold text-[var(--a3)]"
            >
              {t("confirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-8 shrink-0 rounded-r2 px-3 text-[12px] text-[var(--ink3)]"
            >
              {t("cancel")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
