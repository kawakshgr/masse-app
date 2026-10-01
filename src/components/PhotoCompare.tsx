"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Side = { url: string; label: string; weight: string };

/**
 * Before and after on one frame (1 Oct 2026): the later photo over the
 * earlier one, a line to drag between them. Same pose, same size, so what
 * changed is all that moves.
 */
export function PhotoSlider({ after, before }: { after: Side; before: Side }) {
  const t = useTranslations("compare");
  const [at, setAt] = useState(50);
  return (
    <div className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-r3 border border-[var(--edge)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before.url} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after.url}
        alt=""
        draggable={false}
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow" style={{ left: `${at}%` }}>
        <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[14px] font-bold text-black shadow">
          ⇆
        </span>
      </div>
      <span className="tnum absolute left-2 top-2 rounded-rp bg-black/55 px-2 py-0.5 text-[11.5px] font-semibold text-white">
        {after.label} · {after.weight}
      </span>
      <span className="tnum absolute right-2 top-2 rounded-rp bg-black/55 px-2 py-0.5 text-[11.5px] font-semibold text-white">
        {before.label} · {before.weight}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={at}
        onChange={(e) => setAt(Number(e.target.value))}
        aria-label={t("slider")}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

/** Draws an image onto a canvas, cover-fitted into the box. */
function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  context.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

/**
 * The two photos as one picture to send to the client — the phone's share
 * sheet where there is one (WhatsApp is in it), a download otherwise. Made
 * on this device; nothing is uploaded.
 */
export function ShareCompare({
  after,
  before,
  title,
  label,
}: {
  after: Side;
  before: Side;
  title: string;
  /** The button's words; the coach's "send the before/after" by default. */
  label?: string;
}) {
  const t = useTranslations("compare");
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  async function share() {
    setState("busy");
    try {
      const [a, b] = await Promise.all([load(before.url), load(after.url)]);
      const w = 600;
      const h = 800;
      const band = 64;
      const canvas = document.createElement("canvas");
      canvas.width = w * 2 + 12;
      canvas.height = h + band;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#161616";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawCover(context, a, 0, 0, w, h);
      drawCover(context, b, w + 12, 0, w, h);
      context.fillStyle = "#f4f2fb";
      context.font = "600 26px system-ui, sans-serif";
      context.textBaseline = "middle";
      context.fillText(`${before.label} · ${before.weight}`, 20, h + band / 2);
      context.fillText(`${after.label} · ${after.weight}`, w + 32, h + band / 2);
      context.textAlign = "right";
      context.fillStyle = "#9c86ff";
      context.fillText("Masse", canvas.width - 20, h + band / 2);

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("no image"))), "image/jpeg", 0.9),
      );
      const file = new File([blob], `${title}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(link.href);
      }
      setState("idle");
    } catch (error) {
      // The share sheet closed without sending is not a failure.
      setState((error as Error)?.name === "AbortError" ? "idle" : "failed");
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={share}
        disabled={state === "busy"}
        className="cta h-11 w-full rounded-r2 text-[13.5px] font-semibold text-[var(--onA)] disabled:opacity-60"
      >
        {label ?? t("share")}
      </button>
      {state === "failed" && <p className="text-[12px] text-[var(--a3)]">{t("failed")}</p>}
    </div>
  );
}
