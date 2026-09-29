import { getTranslations } from "next-intl/server";
import { ActionMenu } from "@/components/ActionMenu";
import { Icon } from "@/components/Icon";
import { MENU_DANGER, MENU_ITEM } from "@/components/Pane";
import { cancelAppointment } from "@/app/(coach)/clients/actions";
import { callLabel } from "@/lib/calls";
import { waLink } from "@/lib/whatsapp";

/**
 * The client's booked video call, above her tabs while it is still to come:
 * when, how long, the confirmation already written for WhatsApp, and the
 * calendar file. Cancelling frees the slot; the message tells her why.
 */
export async function CallBanner({
  call,
  clientId,
  firstName,
  phone,
  callLink,
}: {
  call: { id: string; starts_at: string; minutes: number };
  clientId: string;
  firstName: string;
  phone: string | null;
  callLink: string | null;
}) {
  const t = await getTranslations("calls");
  const when = callLabel(call.starts_at);
  const length = t("length", { minutes: call.minutes });
  const confirm = waLink(
    phone,
    t("waConfirm", { first: firstName, when, length, link: callLink ? t("waLink", { link: callLink }) : "" }),
  );
  const cancelNote = waLink(phone, t("waCancel", { first: firstName, when }));

  return (
    <section className="glass flex flex-wrap items-center gap-3 rounded-r3 p-3">
      <span className="glass2 flex size-11 shrink-0 items-center justify-center rounded-r2 text-[var(--accent)]">
        <Icon name="video" size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
          {t("kicker", { length })}
        </span>
        <span className="block truncate text-[14px] font-semibold first-letter:uppercase">{when}</span>
        {!callLink && <span className="block text-[11.5px] text-[var(--ink3)]">{t("noLink")}</span>}
      </span>
      {confirm && (
        <a
          href={confirm}
          target="_blank"
          rel="noopener noreferrer"
          className="cta flex h-10 shrink-0 items-center gap-1.5 rounded-rp px-4 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--onA)]"
        >
          <Icon name="whatsapp" size={16} />
          {t("whatsapp")}
        </a>
      )}
      <ActionMenu label="Actions">
        <a href={`/rendez-vous/${call.id}`} className={MENU_ITEM}>
          {t("addToCalendar")}
        </a>
        {callLink && (
          <a href={callLink} target="_blank" rel="noopener noreferrer" className={MENU_ITEM}>
            {t("join")}
          </a>
        )}
        {cancelNote && (
          <a href={cancelNote} target="_blank" rel="noopener noreferrer" className={MENU_ITEM}>
            {t("tellCancel")}
          </a>
        )}
        <form
          action={async () => {
            "use server";
            await cancelAppointment(call.id, clientId);
          }}
        >
          <button type="submit" className={MENU_DANGER}>
            {t("cancel")}
          </button>
        </form>
      </ActionMenu>
    </section>
  );
}
