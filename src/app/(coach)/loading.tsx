import { getTranslations } from "next-intl/server";
import { PaneSkeleton } from "@/components/Skeleton";

export default async function Loading() {
  const t = await getTranslations("shell");
  return <PaneSkeleton label={t("loading")} />;
}
