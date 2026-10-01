import { getLocale, getTranslations } from "next-intl/server";
import { Tile, TileGrid } from "@/components/Tiles";
import { clientSession } from "@/lib/clientData";
import releases from "@/lib/releases.json";
import { BackHeader, NavRow } from "@/components/client/ui";
import { PasskeySettings } from "@/components/PasskeySettings";
import { PushSettings } from "@/components/PushSettings";
import {
  AppearanceChoice,
  ClearNotes,
  DeleteAccount,
  HealthConsent,
  LanguageChoice,
  SignOutButton,
} from "@/components/client/SettingsControls";

/**
 * Settings, behind the gear on Today. No notifications section: reminders
 * belonged to the iPhone app, frozen since 29 Sep 2026, and a dropped feature
 * leaves the screen rather than apologising on it.
 */
/** The parts a tile opens, by their key in the address. */
const PARTS = ["compte", "notifications", "cle", "apparence", "langue", "confidentialite", "donnees", "apropos"] as const;
type Part = (typeof PARTS)[number];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ partie?: string }>;
}) {
  const { user, supabase, client } = await clientSession();
  const t = await getTranslations("settings");
  const tData = await getTranslations("myData");
  const { data: consent } = await supabase
    .from("clients")
    .select("health_consent_at")
    .eq("id", client.id)
    .maybeSingle();
  const tCommon = await getTranslations("common");
  const tKeys = await getTranslations("passkeys");
  const tPush = await getTranslations("pushSettings");
  const locale = await getLocale();
  const { partie } = await searchParams;
  const part = (PARTS as readonly string[]).includes(partie ?? "") ? (partie as Part) : null;
  const version = releases[0]?.version ?? "—";

  const titles: Record<Part, string> = {
    compte: t("account"),
    notifications: tPush("title"),
    cle: tKeys("title"),
    apparence: t("appearance"),
    langue: t("language"),
    confidentialite: t("privacy"),
    donnees: tData("title"),
    apropos: t("about"),
  };

  // Settings open on tiles, one per part (Kevin, 1 Oct 2026: big icons,
  // no long list); a tile opens its part on its own screen.
  if (!part) {
    return (
      <>
        <BackHeader href="/aujourdhui" back={tCommon("back")} title={t("title")} />
        <TileGrid>
          <Tile href="/reglages?partie=compte" icon="account" label={t("account")} sub={user.email ?? null} />
          <Tile href="/reglages?partie=notifications" icon="bell" label={tPush("title")} sub={tPush("sub")} />
          <Tile href="/reglages?partie=cle" icon="key" label={tKeys("title")} sub={t("keySub")} />
          <Tile href="/reglages/facturation" icon="billing" label={t("billing")} sub={t("billingOpen")} />
          <Tile href="/reglages?partie=apparence" icon="appearance" label={t("appearance")} sub={t("appearanceSub")} />
          <Tile href="/reglages?partie=langue" icon="language" label={t("language")} sub={locale.startsWith("en") ? t("en") : t("fr")} />
          <Tile href="/reglages?partie=confidentialite" icon="privacy" label={t("privacy")} sub={t("privacySub")} />
          <Tile
            href="/reglages?partie=donnees"
            icon="note"
            label={tData("title")}
            sub={consent?.health_consent_at ? t("consentOn") : t("consentOff")}
          />
          <Tile href="/reglages?partie=apropos" icon="info" label={t("about")} sub={t("version", { version })} />
        </TileGrid>
      </>
    );
  }

  return (
    <>
      <BackHeader href="/reglages" back={t("title")} title={titles[part]} />
      <section className="glass space-y-3.5 rounded-r4 p-[18px]">
        {part === "compte" && (
          <>
            {user.email && (
              <div>
                <p className="text-[13px] text-[var(--ink2)]">{t("email")}</p>
                <p className="text-[15px] font-semibold break-all">{user.email}</p>
              </div>
            )}
            <NavRow href="/reglages/infos" icon="account">{t("editProfile")}</NavRow>
            <SignOutButton />
          </>
        )}

        {part === "notifications" && <PushSettings />}

        {part === "cle" && <PasskeySettings />}

        {part === "apparence" && <AppearanceChoice />}

        {part === "langue" && (
          <>
            <LanguageChoice />
            <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{t("languageWeb")}</p>
          </>
        )}

        {part === "confidentialite" && (
          <>
            <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("privacyCoach")}</p>
            <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("privacyNotes")}</p>
            <ClearNotes />
          </>
        )}

        {/* GDPR: consent to health data, a copy of everything, and erasure. */}
        {part === "donnees" && (
          <>
            <HealthConsent givenAt={consent?.health_consent_at ?? null} />
            <NavRow href="/reglages/donnees" icon="note">{tData("download")}</NavRow>
            <p className="text-[12.5px] leading-[1.45] text-[var(--ink3)]">{tData("downloadHint")}</p>
            <DeleteAccount />
            <p className="text-[12.5px] leading-[1.45] text-[var(--ink3)]">
              {tData("legal")} <a className="text-[var(--accent)] underline" href="/confidentialite">{tData("privacyLink")}</a>
            </p>
          </>
        )}

        {part === "apropos" && (
          <>
            <NavRow href="/reglages/versions" icon="note">{t("releases")}</NavRow>
            <p className="tnum text-[13px] text-[var(--ink3)]">{t("version", { version })}</p>
          </>
        )}
      </section>
    </>
  );
}
