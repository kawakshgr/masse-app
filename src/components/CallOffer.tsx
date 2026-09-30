import { getTranslations } from "next-intl/server";
import { ActionMenu } from "@/components/ActionMenu";
import { Icon } from "@/components/Icon";
import { MENU_DANGER } from "@/components/Pane";
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
      <form action={offerCall} className="flex flex-col gap-2 p-2">
        <input type="hidden" name="client_id" value={clientId} />
        <label className="flex items-center justify-between gap-3 text-[12px] text-[var(--ink2)]">
          {t("offerLength")}
          <select
            name="minutes"
            defaultValue={20}
            className="h-8 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12.5px] text-[var(--ink)]"
          >
            {CALL_MINUTES.map((m) => (
              <option key={m} value={m}>
                {t("length", { minutes: m })}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="cta h-9 rounded-rp px-4 text-[11.5px] font-bold uppercase tracking-[.08em] text-[var(--onA)]"
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
            {t("withdrawOffer")}
          </button>
        </form>
      </ActionMenu>
    </section>
  );
}
