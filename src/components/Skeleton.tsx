/**
 * What a screen will look like, shown the moment it is asked for
 * (1 Oct 2026): every page used to stay frozen 0.4 to 1 s after a tap, then
 * jump. Plain blocks at the page's own shapes, gently pulsing; nothing that
 * reads as content. Server-safe: no hooks.
 */

const bar = "animate-pulse rounded-r1 bg-[var(--glass2)]";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block ${bar} ${className}`} />;
}

/** A glass card with a title row and a few lines. */
export function SkeletonCard({ lines = 3, tall = false, client = false }: { lines?: number; tall?: boolean; client?: boolean }) {
  return (
    <div aria-hidden className={`glass space-y-3 ${client ? "rounded-r4 p-[18px]" : "rounded-r3 p-4"}`}>
      <div className="flex items-center gap-3">
        <span className={`size-9 shrink-0 ${bar} rounded-r2`} />
        <SkeletonLine className="h-3 w-32" />
      </div>
      {tall && <SkeletonLine className="h-28 w-full" />}
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} className={`h-11 ${i % 2 ? "w-[88%]" : "w-full"}`} />
      ))}
    </div>
  );
}

/** A coach pane: kicker, title, cards. */
export function PaneSkeleton({ cards = 3, label }: { cards?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="min-w-0 flex-1 overflow-hidden p-5">
      <div className="mx-auto max-w-[900px] space-y-5">
        <div className="space-y-2 px-1">
          <SkeletonLine className="h-2.5 w-24" />
          <SkeletonLine className="h-7 w-56" />
        </div>
        {Array.from({ length: cards }, (_, i) => (
          <SkeletonCard key={i} lines={i === 0 ? 3 : 2} tall={i === 1} />
        ))}
      </div>
    </div>
  );
}

/** A client's file: the header, the tabs, then cards. */
export function ClientFileSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-4 p-5">
      <div className="flex items-center gap-4">
        <span aria-hidden className={`size-14 shrink-0 rounded-r3 ${bar}`} />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-2.5 w-48 max-w-full" />
          <SkeletonLine className="h-7 w-56 max-w-full" />
        </div>
      </div>
      <TabsSkeleton />
      <TabSkeleton />
    </div>
  );
}

export function TabsSkeleton() {
  return (
    <div aria-hidden className="flex gap-2 overflow-hidden">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`h-11 w-24 shrink-0 rounded-rp ${bar} max-md:h-[76px] max-md:w-[84px] max-md:rounded-r3`} />
      ))}
    </div>
  );
}

/** One tab's content while it loads; the header and tabs stay. */
export function TabSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className={`h-[110px] rounded-r3 ${bar}`} />
        ))}
      </div>
      <SkeletonCard lines={1} tall />
      <SkeletonCard lines={3} />
    </div>
  );
}

/** A client screen: kicker, big title, cards. */
export function ScreenSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-[18px]">
      <div className="space-y-3 pb-1 pt-3">
        <SkeletonLine className="h-3 w-28" />
        <SkeletonLine className="h-8 w-48" />
      </div>
      <SkeletonCard client lines={2} tall />
      <SkeletonCard client lines={3} />
      <SkeletonCard client lines={2} />
    </div>
  );
}
