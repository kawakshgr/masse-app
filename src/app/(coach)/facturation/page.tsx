import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  createInvoice,
  deleteInvoice,
  setInvoiceStatus,
  updateInvoice,
} from "./actions";

const cell =
  "h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

function euros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

export default async function BillingPage() {
  const t = await getTranslations("billing");
  const supabase = await createClient();

  const [invoicesRes, clientsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .order("period_start", { ascending: false }),
    supabase.from("clients").select("id, name").eq("status", "active").order("name"),
  ]);

  const invoices = invoicesRes.data ?? [];
  const clients = clientsRes.data ?? [];
  const nameOf = new Map(clients.map((c) => [c.id, c.name]));

  // Both totals derived from the rows beside them, never stored.
  const outstanding = invoices
    .filter((i) => i.status === "draft" || i.status === "sent")
    .reduce((sum, i) => sum + i.amount_cents, 0);
  const collected = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount_cents, 0);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const statusTone: Record<string, string> = {
    draft: "text-[var(--ink3)]",
    sent: "text-[var(--a2)]",
    paid: "text-[var(--accent-soft)]",
    void: "text-[var(--ink3)] line-through",
  };

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-5">
      <header className="mb-4">
        <h2 className="font-display text-[20px] font-extrabold tracking-[-.03em]">
          {t("title")}
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink2)]">
          {t("lede")}
        </p>
        <p className="tnum mt-2 text-[12px]">
          <span className="text-[var(--ink3)]">{t("outstanding")} </span>
          <span className="font-bold text-[var(--a2)]">{euros(outstanding)}</span>
          <span className="text-[var(--ink3)]"> · {t("collected")} </span>
          <span className="font-bold text-[var(--accent)]">{euros(collected)}</span>
        </p>
      </header>

      {clients.length === 0 ? (
        <p className="text-[12px] text-[var(--ink3)]">{t("noClients")}</p>
      ) : (
        <section className="glass rounded-r3 p-4">
          <form action={createInvoice} className="flex flex-wrap items-end gap-2">
            <label className="block min-w-[150px] flex-1">
              <span className="block text-[10px] text-[var(--ink2)]">{t("client")}</span>
              <select name="client_id" required className={`mt-1 ${cell}`}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-[140px]">
              <span className="block text-[10px] text-[var(--ink2)]">{t("period")}</span>
              <input
                type="date"
                name="period_start"
                required
                defaultValue={monthStart}
                className={`tnum mt-1 ${cell}`}
              />
            </label>
            <label className="block w-[110px]">
              <span className="block text-[10px] text-[var(--ink2)]">{t("amount")}</span>
              <input name="amount" inputMode="decimal" className={`tnum mt-1 ${cell}`} />
            </label>
            <label className="block min-w-[140px] flex-1">
              <span className="block text-[10px] text-[var(--ink2)]">{t("note")}</span>
              <input name="note" className={`mt-1 ${cell}`} />
            </label>
            <button
              type="submit"
              className="h-8 shrink-0 rounded-r2 cta px-4 text-[12px] font-bold text-[var(--on-accent)]"
            >
              {t("create")}
            </button>
          </form>
        </section>
      )}

      {invoices.length === 0 ? (
        <div className="mt-4 p-2">
          <p className="text-[13px] font-bold">{t("empty")}</p>
          <p className="mt-1 text-[12px] text-[var(--ink2)]">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="glass rounded-r2 p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[13px] font-bold">
                  {nameOf.get(invoice.client_id) ?? "—"}
                </span>
                <span className="tnum text-[11px] text-[var(--ink3)]">
                  {invoice.period_start}
                  {invoice.period_end ? ` → ${invoice.period_end}` : ""}
                </span>
                <span
                  className={`ml-auto text-[11px] font-bold ${statusTone[invoice.status]}`}
                >
                  {t(invoice.status)}
                </span>
              </div>

              <form action={updateInvoice} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <label className="block w-[110px]">
                  <span className="sr-only">{t("amount")}</span>
                  <input
                    name="amount"
                    inputMode="decimal"
                    defaultValue={(invoice.amount_cents / 100).toFixed(2)}
                    className={`tnum ${cell}`}
                  />
                </label>
                <label className="block min-w-[150px] flex-1">
                  <span className="sr-only">{t("note")}</span>
                  <input
                    name="note"
                    defaultValue={invoice.note ?? ""}
                    placeholder={t("note")}
                    className={cell}
                  />
                </label>
                <button
                  type="submit"
                  className="h-8 shrink-0 rounded-r2 border border-[var(--edge)] px-3 text-[11px] text-[var(--ink2)]"
                >
                  {t("status")}
                </button>
              </form>

              <div className="mt-2 flex flex-wrap gap-1">
                {(
                  [
                    ["sent", t("markSent")],
                    ["paid", t("markPaid")],
                    ["void", t("markVoid")],
                    ["draft", t("reopen")],
                  ] as const
                )
                  .filter(([status]) => status !== invoice.status)
                  .map(([status, label]) => (
                    <form key={status} action={setInvoiceStatus}>
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <input type="hidden" name="status" value={status} />
                      <button
                        type="submit"
                        className="rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[10px] text-[var(--ink2)]"
                      >
                        {label}
                      </button>
                    </form>
                  ))}

                <form action={deleteInvoice} className="ml-auto">
                  <input type="hidden" name="invoice_id" value={invoice.id} />
                  <button
                    type="submit"
                    className="rounded-r1 px-2 py-0.5 text-[10px] text-[var(--ink3)] hover:text-[var(--a3)]"
                  >
                    {t("remove")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
