import { getTranslations } from "next-intl/server";
import { clientSession } from "@/lib/clientData";
import { BackHeader, Card, Kicker } from "@/components/client/ui";
import { ProfileForm } from "@/components/client/ProfileForm";

export default async function DetailsPage() {
  const { supabase, user, client, today } = await clientSession();
  const t = await getTranslations("settings");
  const tCommon = await getTranslations("common");

  const { data } = await supabase
    .from("clients")
    .select("first_name, name, phone, birth_date, height_cm, occupation, emergency_contact")
    .eq("id", client.id)
    .single();

  return (
    <>
      <BackHeader
        href="/reglages"
        back={tCommon("back")}
        title={t("profile")}
        lede={t("profileLede")}
      />
      {data && <ProfileForm initial={data} today={today} />}
      {user.email && (
        <Card className="space-y-1.5">
          <Kicker>{t("email")}</Kicker>
          <p className="text-[15px] font-semibold break-all">{user.email}</p>
          <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{t("emailFixed")}</p>
        </Card>
      )}
    </>
  );
}
