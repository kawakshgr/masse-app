"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { intl } from "@/lib/locale";
import { PASSKEY_DOMAIN, passkeyCancelled, passkeysHere } from "@/lib/passkeys";

type Passkey = { id: string; friendly_name?: string; created_at: string };

const never = () => () => {};

/**
 * The passkeys on this account: turn one on for this device, see the others,
 * remove one. Shared by the client's settings and the coach's account. The
 * e-mail code keeps working whatever happens here.
 */
export function PasskeySettings() {
  const t = useTranslations("passkeys");
  const locale = intl(useLocale());
  const here = useSyncExternalStore(never, passkeysHere, () => false);
  const [keys, setKeys] = useState<Passkey[] | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "added" | "exists" | "failed">("idle");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!here) return;
    let alive = true;
    createClient()
      .auth.passkey.list()
      .then(({ data }) => {
        if (alive) setKeys(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, [here]);

  if (!here) {
    return <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{t("elsewhere", { domain: PASSKEY_DOMAIN })}</p>;
  }

  async function add() {
    setState("busy");
    const supabase = createClient();
    const { error } = await supabase.auth.registerPasskey();
    if (error) {
      const exists = (error as { code?: string }).code === "webauthn_credential_exists" || /InvalidState/i.test(error.name ?? "");
      setState(exists ? "exists" : passkeyCancelled(error) ? "idle" : "failed");
      return;
    }
    const { data } = await supabase.auth.passkey.list();
    setKeys(data ?? []);
    setState("added");
  }

  async function remove(id: string) {
    setRemoving(null);
    const supabase = createClient();
    await supabase.auth.passkey.delete({ passkeyId: id });
    const { data } = await supabase.auth.passkey.list();
    setKeys(data ?? []);
    setState("idle");
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-[1.5] text-[var(--ink2)]">{t("lede")}</p>

      {(keys ?? []).length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {(keys ?? []).map((key) => (
            <li key={key.id} className="glass2 flex min-h-12 items-center gap-3 rounded-r2 px-3 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{key.friendly_name || t("unnamed")}</span>
                <span className="block text-[12px] text-[var(--ink3)]">
                  {t("addedOn", {
                    date: new Date(key.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }),
                  })}
                </span>
              </span>
              {removing === key.id ? (
                <button
                  type="button"
                  onClick={() => remove(key.id)}
                  className="h-9 shrink-0 rounded-rp border border-[var(--a3)] px-3 text-[12.5px] font-semibold text-[var(--a3)]"
                >
                  {t("removeConfirm")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRemoving(key.id)}
                  aria-label={t("remove")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-rp text-[16px] text-[var(--ink3)] hover:text-[var(--a3)]"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={add}
        disabled={state === "busy"}
        className="glass2 h-11 w-full rounded-rp px-5 text-[14px] font-semibold text-[var(--ink)] disabled:opacity-50"
      >
        {state === "busy" ? t("asking") : t("add")}
      </button>

      {state === "added" && (
        <p role="status" className="text-[13px] text-[var(--accent-soft)]">
          {t("added")}
        </p>
      )}
      {state === "exists" && <p className="text-[13px] text-[var(--ink2)]">{t("exists")}</p>}
      {state === "failed" && (
        <p role="alert" className="text-[13px] leading-[1.45] text-[var(--a3)]">
          {t("addFailed")}
        </p>
      )}
      <p className="text-[12.5px] leading-[1.45] text-[var(--ink3)]">{t("note")}</p>
    </div>
  );
}
