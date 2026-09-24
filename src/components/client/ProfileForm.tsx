"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveProfile } from "@/app/(client)/actions";
import { Card, Cta, fieldClass } from "./ui";

export type Details = {
  first_name: string | null;
  name: string;
  phone: string | null;
  birth_date: string | null;
  height_cm: number | null;
  occupation: string | null;
  emergency_contact: string | null;
};

/** Her details, as she would correct them — ProfileView.swift. */
export function ProfileForm({ initial, today }: { initial: Details; today: string }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.first_name ?? "");
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [birthDate, setBirthDate] = useState(initial.birth_date ?? "");
  const [height, setHeight] = useState(initial.height_cm?.toString() ?? "");
  const [occupation, setOccupation] = useState(initial.occupation ?? "");
  const [emergency, setEmergency] = useState(initial.emergency_contact ?? "");
  const [outcome, setOutcome] = useState<"saved" | "failed" | "nameMissing" | null>(null);
  const [pending, startTransition] = useTransition();

  /** A blank field is nothing said, not an empty string on her file. */
  const text = (value: string) => value.trim() || null;

  function save() {
    if (!name.trim()) {
      setOutcome("nameMissing");
      return;
    }
    startTransition(async () => {
      const heightCm = Number(height.replace(",", "."));
      const result = await saveProfile({
        firstName: text(firstName),
        name,
        phone: text(phone),
        birthDate: birthDate || null,
        heightCm: height.trim() && !Number.isNaN(heightCm) ? heightCm : null,
        occupation: text(occupation),
        emergencyContact: text(emergency),
      });
      setOutcome(result.ok ? "saved" : "failed");
      router.refresh();
    });
  }

  const message = {
    saved: "profileSaved",
    failed: "profileError",
    nameMissing: "nameRequired",
  } as const;

  return (
    <>
      <Card className="space-y-4">
        <Field label={t("firstName")} value={firstName} onChange={setFirstName} autoComplete="given-name" />
        <Field label={t("fullName")} value={name} onChange={setName} autoComplete="name" />
        <Field label={t("phone")} value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
        <Field
          label={t("birthDate")}
          value={birthDate}
          onChange={setBirthDate}
          type="date"
          max={today}
          autoComplete="bday"
        />
        <Field label={t("height")} value={height} onChange={setHeight} inputMode="decimal" />
        <Field label={t("occupation")} value={occupation} onChange={setOccupation} />
        <Field
          label={t("emergency")}
          value={emergency}
          onChange={setEmergency}
          placeholder={t("emergencyHint")}
        />
      </Card>

      {outcome && (
        <p className={`text-[13px] ${outcome === "saved" ? "text-[var(--a1)]" : "text-[var(--a3)]"}`}>
          {t(message[outcome])}
        </p>
      )}

      <Cta onClick={save} disabled={pending}>
        {t("profileSave")}
      </Cta>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block space-y-2">
      <span className="block text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--ink2)]">
        {label}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}
