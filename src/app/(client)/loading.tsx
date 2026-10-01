import { getTranslations } from "next-intl/server";
import { ScreenSkeleton } from "@/components/Skeleton";

export default async function Loading() {
  const t = await getTranslations("shell");
  return <ScreenSkeleton label={t("loading")} />;
}
