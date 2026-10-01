"use client";

import { useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveCoachMessage } from "@/app/(coach)/admin/actions";
import { SectionTitle } from "@/components/Pane";

export type EditableMessage = {
  kind: string;
  label: string;
  /** Her text when she rewrote it, Masse's otherwise — placeholders in her language. */
  text: string;
  /** Masse's text, for "back to the original". */
  original: string;
  custom: boolean;
  /** Placeholder words this message can use: "prénom", "montant"… */
  tokens: string[];
};

/**
 * The WhatsApp messages Masse writes for her, in her words (1 Oct 2026):
 * tutoiement or vouvoiement, emojis, her sign-off. Each one in its group, a
 * tap on a placeholder puts it where the cursor is, and one button puts
 * Masse's text back.
 */
export function MessageEditor({ groups }: { groups: { title: string; icon: string; messages: EditableMessage[] }[] }) {
  return (
    // Already inside the part's card: groups are headed, not boxed again.
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <SectionTitle icon={group.icon}>{group.title}</SectionTitle>
          {group.messages.map((message) => (
            <OneMessage key={message.kind} message={message} />
          ))}
        </section>
      ))}
    </div>
  );
}

function OneMessage({ message }: { message: EditableMessage }) {
  const t = useTranslations("messages");
  const locale = useLocale();
  const [text, setText] = useState(message.text);
  const [saved, setSaved] = useState(message.text);
  const [custom, setCustom] = useState(message.custom);
  const [state, setState] = useState<"idle" | "saved" | "failed">("idle");
  const [pending, startTransition] = useTransition();
  const field = useRef<HTMLTextAreaElement>(null);

  function insert(word: string) {
    const area = field.current;
    const token = `{${word}}`;
    const at = area?.selectionStart ?? text.length;
    const end = area?.selectionEnd ?? at;
    setText(text.slice(0, at) + token + text.slice(end));
    setState("idle");
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(at + token.length, at + token.length);
    });
  }

  function save(next: string) {
    startTransition(async () => {
      const { ok } = await saveCoachMessage(message.kind, next, locale);
      if (ok) {
        const back = next.trim() === "" ? message.original : next;
        setText(back);
        setSaved(back);
        setCustom(back.trim() !== message.original.trim());
      }
      setState(ok ? "saved" : "failed");
    });
  }

  return (
    <div className="glass2 space-y-2.5 rounded-r2 p-3 max-md:p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-semibold">{message.label}</span>
        <span className={`shrink-0 text-[11px] font-bold uppercase tracking-[.1em] ${custom ? "text-[var(--accent)]" : "text-[var(--ink3)]"}`}>
          {custom ? t("custom") : t("original")}
        </span>
      </div>
      <textarea
        ref={field}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setState("idle");
        }}
        maxLength={1000}
        aria-label={message.label}
        className="min-h-[96px] w-full rounded-r2 border border-[var(--edge)] bg-[var(--deep)] px-3 py-2.5 text-[16px] leading-[1.45] text-[var(--ink)] md:text-[14px]"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11.5px] text-[var(--ink3)]">{t("insert")}</span>
        {message.tokens.map((word) => (
          <button
            key={word}
            type="button"
            onClick={() => insert(word)}
            className="h-8 rounded-rp border border-[var(--edge)] px-3 text-[12px] font-semibold text-[var(--accent)]"
          >
            {`{${word}}`}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || text === saved}
          onClick={() => save(text)}
          className="cta h-10 rounded-r2 px-4 text-[13px] font-semibold text-[var(--on-accent)] disabled:opacity-50"
        >
          {t("save")}
        </button>
        {custom && (
          <button
            type="button"
            disabled={pending}
            onClick={() => save("")}
            className="h-10 rounded-r2 px-3 text-[13px] font-semibold text-[var(--ink2)]"
          >
            {t("reset")}
          </button>
        )}
        {state === "saved" && <span className="text-[12.5px] font-semibold text-[var(--accent-soft)]">✓ {t("saved")}</span>}
        {state === "failed" && <span className="text-[12.5px] text-[var(--a3)]">{t("failed")}</span>}
      </div>
    </div>
  );
}
