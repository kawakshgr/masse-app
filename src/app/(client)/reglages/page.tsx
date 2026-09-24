import { getTranslations } from "next-intl/server";
import { clientSession } from "@/lib/clientData";
import releases from "@/lib/releases.json";
import { BackHeader, Card, Kicker, NavRow } from "@/components/client/ui";
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

      <Section title={t("account")}>
        {user.email && (
          <div>
            <p className="text-[13px] text-[var(--ink2)]">{t("email")}</p>
            <p className="text-[15px] font-semibold break-all">{user.email}</p>
          </div>
        )}
        <NavRow href="/reglages/infos">{t("editProfile")}</NavRow>
        <SignOutButton />
      </Section>

      <Section title={t("billing")}>
        <NavRow href="/reglages/facturation">{t("billingOpen")}</NavRow>
      </Section>

      <Section title={t("notifications")}>
        <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("webReminders")}</p>
      </Section>

      <Section title={t("appearance")}>
        <AppearanceChoice />
      </Section>

      <Section title={t("language")}>
        <LanguageChoice />
        <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{t("languageWeb")}</p>
      </Section>

      <Section title={t("privacy")}>
        <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("privacyCoach")}</p>
        <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("privacyNotes")}</p>
        <ClearNotes />
      </Section>

      <Section title={t("about")}>
        <NavRow href="/reglages/versions">{t("releases")}</NavRow>
        <p className="tnum text-[13px] text-[var(--ink3)]">
          {t("version", { version: releases[0]?.version ?? "—" })}
        </p>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3.5">
      <Kicker>{title}</Kicker>
      {children}
    </Card>
  );
}
