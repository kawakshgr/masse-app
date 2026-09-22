import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { markAllPaid, setMonthStatus } from "@/app/(coach)/facturation/actions";
import { euros, nextLabel } from "@/lib/billing";
import type { BillingClient } from "@/components/BillingInspector";

// Six columns when there is room, four when there is not — and the decision is
// made on the pane's own width, not the window's, because the divider moves.
const GRID =
  "grid-cols-[24px_minmax(0,1.7fr)_92px_96px] " +
  "@2xl:grid-cols-[24px_minmax(0,1.7fr)_92px_minmax(0,1fr)_minmax(0,1fr)_96px]";

/**
 * The ledger itself. Every figure it prints comes from the row it sits on, and
 * the tick is the only thing on this page that writes.
 */
export async function BillingTable({
  rows,
  total,
  open,
  selectedId,
  filter,
  period,
  nextMonth,
}: {
  rows: BillingClient[];
  /** How many clients exist in all, for the footer's count. */
  total: number;
  open: { id: string; amountCents: number }[];
  selectedId: string | null;
  filter: string;
  period: string;
  nextMonth: string;
}) {
  const t = await getTranslations("billing");
  const shown = rows;
  const selected = selectedId;

  return (
    <div className="@container min-w-0 overflow-hidden rounded-r3 border border-[var(--edge)]">
      <div
        className={`grid ${GRID} gap-2.5 bg-[var(--glass2)] px-3.5 py-2.5 text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]`}
      >
        <span aria-label={t("paid")}>✓</span>
        <span className="truncate">{t("client")}</span>
        <span className="truncate">{t("amount")}</span>
        <span className="hidden truncate @2xl:block">{t("type")}</span>
        <span className="hidden truncate @2xl:block">{t("next")}</span>
        <span className="truncate">{t("status")}</span>
      </div>

      {shown.length === 0 ? (
        <p className="border-t border-[var(--hair)] p-6 text-center text-[13px] text-[var(--ink3)]">
          {t("filterEmpty")}
        </p>
      ) : (
        shown.map((row) => (
          <div
            key={row.id}
            className={`grid ${GRID} items-center gap-2.5 border-t border-[var(--hair)] px-3.5 py-3 text-[13.5px] ${
              selected === row.id ? "bg-[var(--glass2)]" : ""
            }`}
          >
            {/* The tick goes both ways, as the prototype's does: a month ticked
                by accident has to be un-tickable. */}
            <form action={setMonthStatus}>
              <input type="hidden" name="client_id" value={row.id} />
              <input type="hidden" name="period" value={period} />
              <input
                type="hidden"
                name="amount"
                value={(row.amountCents / 100).toFixed(2)}
              />
              <input
                type="hidden"
                name="state"
                value={row.state === "paid" ? "awaiting" : "paid"}
              />
              <button
                type="submit"
                aria-label={t("markPaidFor", { name: row.name })}
                aria-pressed={row.state === "paid"}
                className="flex size-[19px] items-center justify-center rounded-r1 text-[11px] text-[var(--onA)] active:scale-[.88]"
                style={
                  row.state === "paid"
                    ? {
                        background:
                          "linear-gradient(120deg, var(--a1), var(--a2))",
                      }
                    : { border: "1px solid var(--edge)" }
                }
              >
                {row.state === "paid" ? "✓" : ""}
              </button>
            </form>

            <Link
              href={`/facturation?filtre=${filter}&ligne=${row.id}`}
              className="flex min-w-0 flex-col gap-0.5"
            >
              <span className="truncate font-semibold">{row.name}</span>
              <span className="truncate text-[11.5px] text-[var(--ink3)] @2xl:hidden">
                {t(row.type)} ·{" "}
                {nextLabel(
                  row.type,
                  row.dayOfMonth,
                  row.packSessions,
                  nextMonth,
                )}
              </span>
            </Link>

            <span className="tnum font-semibold">{euros(row.amountCents)}</span>
            <span className="hidden truncate text-[var(--ink2)] @2xl:block">
              {t(row.type)}
            </span>
            <span className="hidden truncate text-[var(--ink2)] @2xl:block">
              {nextLabel(row.type, row.dayOfMonth, row.packSessions, nextMonth)}
            </span>
            <span
              className="truncate rounded-rp border border-[var(--edge)] px-2 py-1 text-center text-[12px] font-bold"
              style={{
                background:
                  row.state === "late"
                    ? "color-mix(in oklab, var(--a3) 22%, var(--glass2))"
                    : "var(--glass2)",
                color:
                  row.state === "late"
                    ? "var(--a3)"
                    : row.state === "awaiting"
                      ? "var(--a1)"
                      : "var(--ink2)",
              }}
            >
              {t(row.state)}
            </span>
          </div>
        ))
      )}

      <div className="flex flex-wrap items-center gap-3.5 border-t border-[var(--hair)] bg-[var(--glass)] px-3.5 py-2.5 text-[12px] text-[var(--ink3)]">
        <span>{t("footShown", { shown: shown.length, total: total })}</span>
        <div className="flex-1" />
        {open.length > 0 ? (
          <form action={markAllPaid}>
            <input type="hidden" name="period" value={period} />
            <input
              type="hidden"
              name="client_ids"
              value={open.map((r) => r.id).join(",")}
            />
            <input
              type="hidden"
              name="amounts"
              value={open.map((r) => r.amountCents).join(",")}
            />
            <button
              type="submit"
              className="text-[12.5px] font-semibold text-[var(--ink2)] hover:text-[var(--accent-soft)]"
            >
              {t("markAllPaid", { count: open.length })}
            </button>
          </form>
        ) : (
          <span className="text-[12.5px] font-semibold text-[var(--ink2)]">
            {t("allPaid")}
          </span>
        )}
      </div>
    </div>
  );
}
