"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { attachCheckInPhoto, deleteCheckInPhoto } from "@/app/(coach)/clients/actions";

const BUCKET = "check-in-photos";
const MAX_BYTES = 8 * 1024 * 1024;

export type PhotoView = { id: string; url: string | null };

export function CheckInPhotos({
  checkInId,
  clientId,
  photos,
}: {
  checkInId: string;
  clientId: string;
  photos: PhotoView[];
}) {
  const t = useTranslations("photos");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(file: File) {
    setProblem(null);

    if (file.size > MAX_BYTES) {
      setProblem(t("tooBig"));
      return;
    }

    setBusy(true);
    const supabase = createClient();

    // The client id leads the path: that first segment is what the storage
    // policies filter on, so a photo cannot be written outside her folder.
    const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${clientId}/${checkInId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    setBusy(false);

    if (error) {
      setProblem(t("failed"));
      return;
    }

    startTransition(() => {
      void attachCheckInPhoto(checkInId, clientId, path);
    });
    if (input.current) input.current.value = "";
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {t("title")}
        </span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t("add")}
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
          className="text-[10px] text-[var(--ink3)] file:mr-2 file:rounded-rp file:border file:border-[var(--edge)] file:bg-transparent file:px-2 file:py-0.5 file:text-[10px] file:text-[var(--ink2)]"
        />
        {busy && (
          <span className="text-[10px] text-[var(--accent)]">{t("uploading")}</span>
        )}
      </div>

      {problem && (
        <p role="alert" className="mt-1 text-[10px] text-[var(--a3)]">
          {problem}
        </p>
      )}

      {photos.length === 0 ? (
        <p className="mt-1 text-[10px] text-[var(--ink3)]">{t("hint")}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.url}
                  alt=""
                  className="size-20 rounded-r2 border border-[var(--edge)] object-cover"
                />
              ) : (
                <div className="size-20 rounded-r2 border border-[var(--edge)]" />
              )}
              <form action={deleteCheckInPhoto} className="absolute right-1 top-1">
                <input type="hidden" name="photo_id" value={photo.id} />
                <input type="hidden" name="client_id" value={clientId} />
                <button
                  type="submit"
                  aria-label={t("remove")}
                  className="rounded-rp bg-[var(--deep)]/80 px-1.5 text-[10px] text-[var(--ink2)] hover:text-[var(--a3)]"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
