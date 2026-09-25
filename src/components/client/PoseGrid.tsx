"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Kicker } from "./ui";

const BUCKET = "check-in-photos";
const POSES = ["front", "side", "back"] as const;
type Pose = (typeof POSES)[number];

/**
 * Three poses, three slots — PoseGrid.swift on the web. Not a gallery: the
 * check-in is a comparison, and a pile of photos is not one.
 *
 * The bucket is private; every read is a short-lived signed URL, and the path
 * starts with her id because that segment is what storage filters on.
 */
export function PoseGrid({ checkInId, clientId }: { checkInId: string; clientId: string }) {
  const t = useTranslations("photos");
  const tBilan = useTranslations("bilan");
  const tPoses = useTranslations("review.poses");
  const [urls, setUrls] = useState<Partial<Record<Pose, string>>>({});
  const [busy, setBusy] = useState<Pose | null>(null);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const picking = useRef<Pose | null>(null);

  useEffect(() => {
    let live = true;
    void signedUrls(checkInId).then((next) => {
      if (live) setUrls(next);
    });
    return () => {
      live = false;
    };
  }, [checkInId]);

  async function accept(file: File, pose: Pose) {
    setBusy(pose);
    setFailed(false);
    try {
      const jpeg = await shrink(file);
      const supabase = createClient();
      const path = `${clientId}/${checkInId}/${crypto.randomUUID()}.jpg`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, jpeg, { contentType: "image/jpeg" });
      if (error) throw error;

      // The slot is replaced, file and row both: a dangling object is still a
      // stored photograph of somebody.
      const { data: previous } = await supabase
        .from("check_in_photos")
        .select("id, storage_path")
        .eq("check_in_id", checkInId)
        .eq("pose", pose);
      for (const old of previous ?? []) {
        await supabase.from("check_in_photos").delete().eq("id", old.id);
        await supabase.storage.from(BUCKET).remove([old.storage_path]);
      }

      const { error: rowError } = await supabase.from("check_in_photos").insert({
        check_in_id: checkInId,
        client_id: clientId,
        storage_path: path,
        pose,
      });
      if (rowError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw rowError;
      }
      setUrls(await signedUrls(checkInId));
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <Kicker icon="photo">{t("title")}</Kicker>
      <div className="flex gap-2">
        {POSES.map((pose) => (
          <button
            key={pose}
            type="button"
            aria-label={tPoses(pose)}
            onClick={() => {
              picking.current = pose;
              input.current?.click();
            }}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <span className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-r1 bg-[var(--glass2)]">
              {busy === pose ? (
                <span className="text-[13px] text-[var(--a1)]">{t("uploading")}</span>
              ) : urls[pose] ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
                <img src={urls[pose]} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <span className="text-[20px] font-semibold text-[var(--ink3)]">+</span>
              )}
            </span>
            <span
              className={`text-[13px] ${urls[pose] ? "text-[var(--ink2)]" : "text-[var(--ink3)]"}`}
            >
              {tPoses(pose)}
            </span>
          </button>
        ))}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          const pose = picking.current;
          event.target.value = "";
          if (file && pose) void accept(file, pose);
        }}
      />
      <p className={`text-[13px] leading-[1.45] ${failed ? "text-[var(--a3)]" : "text-[var(--ink3)]"}`}>
        {failed ? t("failed") : tBilan("discipline")}
      </p>
    </div>
  );
}

/** Each pose's photo, through a short-lived signed URL: the bucket is private. */
async function signedUrls(checkInId: string): Promise<Partial<Record<Pose, string>>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("check_in_photos")
    .select("storage_path, pose")
    .eq("check_in_id", checkInId);
  const next: Partial<Record<Pose, string>> = {};
  for (const photo of data ?? []) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(photo.storage_path, 600);
    if (signed?.signedUrl) next[photo.pose as Pose] = signed.signedUrl;
  }
  return next;
}

/**
 * Re-encoded rather than sent as picked: a phone photo is several megabytes of
 * detail nobody looks at on a check-in, and the bucket caps at eight.
 */
async function shrink(file: File, longest = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", 0.8),
  );
}
