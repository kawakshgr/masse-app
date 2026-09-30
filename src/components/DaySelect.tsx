/**
 * A day picked from a dropdown, grouped by week — in place of the browser's
 * date field, whose calendar opens under the field and spills out of the
 * window when the field sits at the bottom of a pane (seen in Safari,
 * 30 Sep 2026). Works in a server form (`name`) or controlled (`value`).
 * Pure: the caller says what today is.
 */
export function DaySelect({
  today,
  weeks,
  fromMonday = false,
  value,
  defaultValue,
  onChange,
  name,
  label,
  className,
  locale = "fr",
  todayLabel,
  placeholder,
}: {
  /** "YYYY-MM-DD", in the coach's own day. */
  today: string;
  /** How many weeks ahead are offered. */
  weeks: number;
  /** Start the list at this week's Monday rather than today. */
  fromMonday?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (day: string) => void;
  name?: string;
  label: string;
  className?: string;
  locale?: string;
  /** "aujourd'hui", appended to today's line. */
  todayLabel: string;
  /** An empty first choice, when no day may be picked. */
  placeholder?: string;
}) {
  const at = (iso: string, offset: number) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  };
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  // Monday = 0, as everywhere in Masse.
  const weekday = (at(today, 0).getUTCDay() + 6) % 7;
  const monday = at(today, -weekday);

  const groups = Array.from({ length: weeks }, (_, w) => {
    const start = new Date(monday);
    start.setUTCDate(start.getUTCDate() + w * 7);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      return d;
    }).filter((d) => fromMonday || iso(d) >= today);
    return { start, days };
  }).filter((group) => group.days.length > 0);

  const dayLabel = (d: Date) =>
    d.toLocaleDateString(locale, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const weekLabel = (d: Date) =>
    d.toLocaleDateString(locale, { timeZone: "UTC", day: "numeric", month: "long" });

  return (
    <select
      name={name}
      aria-label={label}
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? (placeholder ? "" : today)) : undefined}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      required={Boolean(name)}
      className={className}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {groups.map((group) => (
        <optgroup key={iso(group.start)} label={`${label} ${weekLabel(group.start)}`}>
          {group.days.map((d) => (
            <option key={iso(d)} value={iso(d)}>
              {dayLabel(d)}
              {iso(d) === today ? ` · ${todayLabel}` : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
