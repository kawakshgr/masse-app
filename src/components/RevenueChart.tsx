import { SectionTitle } from "@/components/Pane";

export type RevenueMonth = {
  label: string;
  paidCents: number;
  openCents: number;
  current: boolean;
};

/**
 * Twelve months of billing (2 Oct 2026): each month's invoices, what came in
 * at the foot of the bar, what is still owed above it, every total written.
 * Drawn from the invoice rows themselves, so a month nobody was billed for
 * reads as nothing rather than as the agreed amount.
 */
export function RevenueChart({
  months,
  title,
  aside,
  paidLabel,
  openLabel,
  money,
}: {
  months: RevenueMonth[];
  title: string;
  aside: string;
  paidLabel: string;
  openLabel: string;
  money: (cents: number) => string;
}) {
  const max = Math.max(1, ...months.map((m) => m.paidCents + m.openCents));
  const short = (cents: number) => (cents === 0 ? "" : money(cents));

  return (
    <section className="glass rounded-r3 p-4">
      <SectionTitle icon="chart" aside={<span className="tnum text-[12px] font-bold text-[var(--ink2)]">{aside}</span>}>
        {title}
      </SectionTitle>
      <div className="mt-4 overflow-x-auto [scrollbar-width:none]">
        <div className="flex min-w-[560px] items-end gap-1.5" style={{ height: 150 }} role="img" aria-label={title}>
          {months.map((m) => {
            const total = m.paidCents + m.openCents;
            const h = (total / max) * 110;
            return (
              <div key={m.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className={`tnum truncate text-[10.5px] ${m.current ? "font-bold text-[var(--ink)]" : "text-[var(--ink2)]"}`}>
                  {short(total)}
                </span>
                <div className="flex w-full max-w-[44px] flex-col justify-end overflow-hidden" style={{ height: Math.max(h, total ? 4 : 2), borderRadius: "5px 5px 2px 2px" }}>
                  {total === 0 ? (
                    <span className="block h-[2px] w-full bg-[var(--hair)]" />
                  ) : (
                    <>
                      {m.openCents > 0 && <span className="block w-full bg-[var(--a3)] opacity-70" style={{ height: `${(m.openCents / total) * 100}%` }} />}
                      {m.paidCents > 0 && (
                        <span className="block w-full" style={{ height: `${(m.paidCents / total) * 100}%`, background: "linear-gradient(180deg, var(--a1), var(--a2))" }} />
                      )}
                    </>
                  )}
                </div>
                <span className={`text-[11px] ${m.current ? "font-bold text-[var(--accent)]" : "text-[var(--ink3)]"}`}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-[var(--ink2)]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: "linear-gradient(180deg, var(--a1), var(--a2))" }} />
          {paidLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-[var(--a3)] opacity-70" />
          {openLabel}
        </span>
      </div>
    </section>
  );
}
