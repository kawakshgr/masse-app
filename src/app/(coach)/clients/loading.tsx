import { getTranslations } from "next-intl/server";
import { PaneSkeleton } from "@/components/Skeleton";

/** À traiter, beside the roster that stays in place. */
export default async function Loading() {
  const t = await getTranslations("shell");
  return <PaneSkeleton cards={4} label={t("loading")} />;
}
