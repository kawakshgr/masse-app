"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

type Facing = "user" | "environment";

/**
 * The check-in photo, taken with a guide (2 Oct 2026): the camera on the
 * whole screen with the last check-in's photo of the same pose laid over
 * it, faint, so the client stands where they stood and the before/after
 * compares like with like. A timer for a phone set down on a shelf. The
 * picture is cropped 3:4 as the slots show it and handed back; nothing
 * leaves the phone until it is used. The front camera's preview is
 * mirrored, as a mirror is — the photo kept is not, as the guide was not.
 */
export function CameraSheet({
  title,
  guideUrl,
  onUse,
  onPickFile,
  onClose,
}: {
  title: string;
  /** The same pose from the last check-in, when there is one. */
  guideUrl: string | null;
  onUse: (photo: Blob) => void;
  onPickFile: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("camera");
  const video = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<Facing>("user");
  const [failed, setFailed] = useState(false);
  const [guide, setGuide] = useState(0.35);
  const [delay, setDelay] = useState<0 | 5 | 10>(0);
  const [count, setCount] = useState<number | null>(null);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);

  // The stream follows the camera chosen, and stops with the sheet.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let live = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (!live) return s.getTracks().forEach((track) => track.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facing]);

  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    // 3:4, centred, as the slots and the review crop it.
    const want = 3 / 4;
    const have = v.videoWidth / v.videoHeight;
    const sw = have > want ? v.videoHeight * want : v.videoWidth;
    const sh = have > want ? v.videoHeight : v.videoWidth / want;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    canvas.getContext("2d")?.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, sw, sh);
    canvas.toBlob((blob) => blob && setShot({ blob, url: URL.createObjectURL(blob) }), "image/jpeg", 0.9);
  }

  function shutter() {
    if (delay === 0) return capture();
    let left = delay;
    setCount(left);
    const tick = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(tick);
        setCount(null);
        capture();
      } else setCount(left);
    }, 1000);
  }

  const mirror = facing === "user" ? "scale-x-[-1]" : "";
  const pill = (on: boolean) =>
    `h-10 rounded-rp border px-3.5 text-[13px] font-semibold ${
      on ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_22%,#000)] text-white" : "border-white/20 bg-black/40 text-white/80"
    }`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-x-0 top-0 z-[80] flex h-[calc(var(--app-h,100dvh)-var(--app-gap,0px))] flex-col bg-black pt-[env(safe-area-inset-top)] text-white"
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold uppercase tracking-[.14em]">{title}</p>
        <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-11 items-center justify-center rounded-full bg-white/10 text-[24px] leading-none">
          ×
        </button>
      </header>

      <div className="relative mx-auto aspect-[3/4] max-h-full w-full min-h-0 flex-1 overflow-hidden bg-neutral-900">
        {/* The video stays mounted under the picture taken: "Reprendre" finds
            the camera still running instead of a black frame. */}
        {shot && (
          // eslint-disable-next-line @next/next/no-img-element -- a local capture
          <img src={shot.url} alt="" className="absolute inset-0 z-10 size-full object-cover" />
        )}
        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-[15px] leading-[1.5] text-white/80">{t("noCamera")}</p>
            <button type="button" onClick={onPickFile} className="cta h-12 rounded-rp px-5 text-[15px] font-semibold text-[var(--onA)]">
              {t("pick")}
            </button>
          </div>
        ) : (
          <>
            <video ref={video} playsInline muted className={`absolute inset-0 size-full object-cover ${mirror}`} />
            {guideUrl && guide > 0 && (
              // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
              <img src={guideUrl} alt="" style={{ opacity: guide }} className={`pointer-events-none absolute inset-0 size-full object-cover ${mirror}`} />
            )}
            {count !== null && (
              <span className="absolute inset-0 flex items-center justify-center font-display text-[120px] font-extrabold text-white drop-shadow-lg">
                {count}
              </span>
            )}
          </>
        )}
      </div>

      <div className="space-y-3 px-4 pb-[max(14px,calc(env(safe-area-inset-bottom)+8px-var(--app-gap,0px)))] pt-3">
        {shot ? (
          <div className="flex gap-2.5">
            <button type="button" onClick={() => setShot(null)} className="h-[52px] flex-1 rounded-rp bg-white/10 text-[15px] font-semibold">
              {t("retake")}
            </button>
            <button type="button" onClick={() => onUse(shot.blob)} className="cta h-[52px] flex-[2] rounded-rp text-[15px] font-semibold text-[var(--onA)]">
              {t("use")}
            </button>
          </div>
        ) : (
          !failed && (
            <>
              {guideUrl ? (
                <label className="flex items-center gap-3 text-[13px] text-white/80">
                  <span className="shrink-0">{t("guide")}</span>
                  <input
                    type="range"
                    min={0}
                    max={0.6}
                    step={0.05}
                    value={guide}
                    onChange={(e) => setGuide(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
              ) : (
                <p className="text-[12.5px] text-white/60">{t("noGuide")}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {([0, 5, 10] as const).map((d) => (
                  <button key={d} type="button" aria-pressed={delay === d} onClick={() => setDelay(d)} className={pill(delay === d)}>
                    {d === 0 ? t("now") : t("timer", { s: d })}
                  </button>
                ))}
                <button type="button" onClick={() => setFacing(facing === "user" ? "environment" : "user")} className={`${pill(false)} ml-auto`}>
                  {t("flip")}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={onPickFile} className="h-[52px] flex-1 rounded-rp bg-white/10 text-[14px] font-semibold">
                  {t("pick")}
                </button>
                <button
                  type="button"
                  aria-label={t("shoot")}
                  disabled={count !== null}
                  onClick={shutter}
                  className="flex size-[68px] shrink-0 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-50"
                >
                  <span className="size-[52px] rounded-full bg-white" />
                </button>
                <span className="flex-1" />
              </div>
            </>
          )
        )}
      </div>
    </div>,
    document.body,
  );
}
