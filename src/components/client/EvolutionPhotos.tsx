"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChoiceTiles } from "@/components/ChoiceTiles";
import { PhotoSlider, ShareCompare } from "@/components/PhotoCompare";
import type { PhotoPose } from "@/lib/supabase/types";

export type PosePair = {
  pose: PhotoPose;
  before: { url: string; label: string; weight: string };
  after: { url: string; label: string; weight: string };
};

const POSE_ICONS: Record<PhotoPose, string> = { front: "clients", side: "account", back: "back" };

/**
 * The client's own before and after (1 Oct 2026): the first check-in with
 * a photo of the pose against the latest, the line to drag, and the picture
 * to share — made on the phone, nothing uploaded.
 */
export function EvolutionPhotos({ pairs }: { pairs: PosePair[] }) {
  const t = useTranslations("evolution");
  const tPose = useTranslations("review.poses");
  const [pose, setPose] = useState<PhotoPose>(pairs[0].pose);
  const pair = pairs.find((p) => p.pose === pose) ?? pairs[0];
  return (
    <div className="space-y-3.5">
      {pairs.length > 1 && (
        <ChoiceTiles
          label={t("pose")}
          columns={3}
          value={pose}
          onChange={setPose}
          options={pairs.map((p) => ({ value: p.pose, label: tPose(p.pose), icon: POSE_ICONS[p.pose] }))}
        />
      )}
      <PhotoSlider key={pair.pose} before={pair.before} after={pair.after} />
      <ShareCompare before={pair.before} after={pair.after} title={t("shareTitle")} label={t("share")} />
    </div>
  );
}
