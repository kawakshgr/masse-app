import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { clientSession } from "@/lib/clientData";
import releases from "@/lib/releases.json";
import { BackHeader, NavRow } from "@/components/client/ui";
import {
  AppearanceChoice,
  ClearNotes,
  LanguageChoice,
  SignOutButton,
} from "@/components/client/SettingsControls";

/**
 * Settings — SettingsView.swift, section for section. Apple Health is the one
 * the web cannot have, and reminders need the phone to schedule them; the
 * notifications section says so rather than disappearing.
 */
export default async function SettingsPage() {
  const { user } = await clientSession();
  const t = await getTranslations("settings");
  const tCommon = await getTranslations("common");

  return (
    <>
      <BackHeader href="/aujourdhui" back={tCommon("back")} title={t("title")} />

      <Section icon="account" title={t("account")}>
        {user.email && (
          <div>
            <p className="text-[13px] text-[var(--ink2)]">{t("email")}</p>
            <p className="text-[15px] font-semibold break-all">{user.email}</p>
          </div>
        )}
        <NavRow href="/reglages/infos" icon="account">{t("editProfile")}</NavRow>
        <SignOutButton />
      </Section>

      <Section icon="billing" title={t("billing")}>
        <NavRow href="/reglages/facturation" icon="billing">{t("billingOpen")}</NavRow>
      </Section>

      <Section icon="bell" title={t("notifications")}>
        <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("webReminders")}</p>
      </Section>

      <Section icon="appearance" title={t("appearance")}>
        <AppearanceChoice />
      </Section>

      <Section icon="language" title={t("language")}>
        <LanguageChoice />
        <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{t("languageWeb")}</p>
      </Section>

      <Section icon="privacy" title={t("privacy")}>
        <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("privacyCoach")}</p>
        <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("privacyNotes")}</p>
        <ClearNotes />
      </Section>

      <Section icon="info" title={t("about")}>
        <NavRow href="/reglages/versions" icon="note">{t("releases")}</NavRow>
        <p className="tnum text-[13px] text-[var(--ink3)]">
          {t("version", { version: releases[0]?.version ?? "—" })}
        </p>
      </Section>
    </>
  );
}

/**
 * One setting, folded: a large icon and its name in capitals. Native
 * <details>, so it needs no state and a form inside keeps working.
 */
function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group glass rounded-r4">
      <summary className="flex min-h-[68px] cursor-pointer list-none items-center gap-3 px-[18px] [&::-webkit-details-marker]:hidden">
        <span className="glass2 flex size-10 shrink-0 items-center justify-center rounded-r2 text-[var(--ink2)] group-open:text-[var(--accent)]">
          <Icon name={icon} size={21} />
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-bold uppercase tracking-[.12em]">
          {title}
        </span>
        <span
          aria-hidden
          className="text-[18px] leading-none text-[var(--ink3)] transition-transform group-open:rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="space-y-3.5 border-t border-[var(--hair)] p-[18px]">{children}</div>
    </details>
  );
}
