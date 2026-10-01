import { getTranslations } from "next-intl/server";
import { ClientFileSkeleton } from "@/components/Skeleton";

export default async function Loading() {
  const t = await getTranslations("shell");
  return <ClientFileSkeleton label={t("loading")} />;
}
