"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export type PaletteClient = { id: string; name: string };

type Command = { id: string; label: string; run: () => void };

export function CommandPalette({
  clients,
  isPlatformAdmin,
}: {
  clients: PaletteClient[];
  isPlatformAdmin: boolean;
}) {
  const t = useTranslations("palette");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setCursor(0);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };

    return [
      { id: "clients", label: t("goClients"), run: go("/clients") },
      { id: "programmes", label: t("goProgrammes"), run: go("/programmes") },
      ...(isPlatformAdmin
        ? [{ id: "admin", label: t("goAdmin"), run: go("/admin") }]
        : []),
      ...clients.map((client) => ({
        id: `client-${client.id}`,
        label: client.name,
        run: go(`/clients/${client.id}`),
      })),
    ];
  }, [clients, isPlatformAdmin, router, t]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(needle));
  }, [commands, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[14vh]"
      style={{ background: "rgba(0, 0, 0, .58)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className="chrome w-full max-w-[520px] overflow-hidden rounded-r3"
        style={{ boxShadow: "0 40px 90px rgba(0, 0, 0, .6)" }}
      >
        <input
          ref={input}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setCursor((c) => Math.min(shown.length - 1, c + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              shown[cursor]?.run();
            }
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="h-12 w-full border-b border-[var(--hair)] bg-transparent px-4 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink3)] focus:outline-none"
        />

        {shown.length === 0 ? (
          <p className="px-4 py-4 text-[12px] text-[var(--ink3)]">{t("empty")}</p>
        ) : (
          <ul className="max-h-[320px] overflow-y-auto py-1">
            {shown.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(index)}
                  onClick={command.run}
                  className={`flex h-10 w-full items-center px-4 text-left text-[13px] ${
                    index === cursor
                      ? "bg-[var(--glass2)] text-[var(--ink)]"
                      : "text-[var(--ink2)]"
                  }`}
                >
                  {command.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
