import { getTranslations } from "next-intl/server";
import { SubNav } from "@/components/SubNav";

/**
 * Foods and supplements are two libraries, not two tabs in the chrome: a
 * seventh top-level entry would bury both. The switch lives where nutrition is
 * already being worked on.
 */
export async function LibrarySwitch({
  active,
}: {
  active: "foods" | "supplements";
}) {
  const t = await getTranslations("supp");

  return (
    <SubNav
      items={[
        { key: "foods", href: "/aliments", label: t("switchFoods"), active: active === "foods" },
        {
          key: "supplements",
          href: "/complements",
          label: t("switchSupplements"),
          active: active === "supplements",
        },
      ]}
    />
  );
}
