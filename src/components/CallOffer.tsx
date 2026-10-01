import { getTranslations } from "next-intl/server";
import { ActionMenu } from "@/components/ActionMenu";
import { Icon } from "@/components/Icon";
import { MENU_DANGER, MenuIcon } from "@/components/Pane";
import { offerCall } from "@/app/(coach)/clients/actions";
import { CALL_MINUTES, type CallMinutes } from "@/lib/supabase/types";
import { waLink } from "@/lib/whatsapp";

/**
 * In the client's header when no call is booked: the way to offer one — a
 * length, one button — and, once offered, the wait said plainly with the
 * message for WhatsApp and the way to take the offer back.
 */
export async function CallOfferMenu({ clientId }: { clientId: string }) {
  const t = await getTranslations("calls");
  return (
    <ActionMenu label={t("actions")}>
      {/* Wide: the whole sheet on a phone, not one tile of it. */}
      <form action={offerCall} data-wide className="col-span-2 flex flex-col gap-2.5 p-2 max-md:p-0">
        <input type="hidden" name="client_id" value={clientId} />
        <p className="text-[12px] text-[var(--ink2)]">{t("offerLength")}</p>
        <MinuteTiles name="minutes" defaultValue={20} />
        <button
          type="submit"
          className="cta h-11 rounded-rp px-4 text-[12px] font-bold uppercase tracking-[.08em] text-[var(--onA)]"
        >
          {t("offer")}
        </button>
      </form>
    </ActionMenu>
  );
}

export async function CallOfferBanner({
  clientId,
  minutes,
  firstName,
  phone,
}: {
  clientId: string;
  minutes: CallMinutes;
  firstName: string;
  phone: string | null;
}) {
  const t = await getTranslations("calls");
  const length = t("length", { minutes });
  const message = waLink(phone, t("waOffer", { first: firstName, length }));

  return (
    <section className="glass flex flex-wrap items-center gap-3 rounded-r3 p-3">
      <span className="glass2 flex size-11 shrink-0 items-center justify-center rounded-r2 text-[var(--accent)]">
        <Icon name="video" size={24} />
      </span>
      <span className="min-w-[220px] flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
          {t("offered", { length })}
        </span>
        <span className="block text-[14px] font-semibold">{t("offeredHint", { first: firstName })}</span>
      </span>
      {message && (
        <a
          href={message}
          target="_blank"
          rel="noopener noreferrer"
          className="cta flex h-10 shrink-0 items-center gap-1.5 rounded-rp px-4 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--onA)]"
        >
          <Icon name="whatsapp" size={16} />
          {t("whatsapp")}
        </a>
      )}
      <ActionMenu label={t("actions")}>
        <form action={offerCall}>
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="minutes" value="" />
          <button type="submit" className={MENU_DANGER}>
            <MenuIcon name="cancel" />
            {t("withdrawOffer")}
          </button>
        </form>
      </ActionMenu>
    </section>
  );
}

/**
 * The call's length as big tiles to tick, not a dropdown (1 Oct 2026).
 * Radio inputs, so it works inside a server form without any state.
 */
export function MinuteTiles({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: CallMinutes;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2">
      {CALL_MINUTES.map((m) => (
        <label
          key={m}
          className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-r3 border border-[var(--edge)] bg-[var(--glass2)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[color-mix(in_oklab,var(--accent)_16%,var(--glass2))]"
        >
          <input type="radio" name={name} value={m} defaultChecked={m === defaultValue} className="sr-only" />
          <span className="tnum font-display text-[22px] font-extrabold leading-none">{m}</span>
          <span className="mt-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-[var(--ink3)]">min</span>
        </label>
      ))}
    </div>
  );
}
