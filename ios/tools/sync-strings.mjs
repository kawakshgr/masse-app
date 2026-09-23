#!/usr/bin/env node
/**
 * Generates the iOS String Catalog from the web's dictionaries.
 *
 * The French copy is reviewed once and lifted verbatim — the two clients must
 * not drift into saying different things about the same screen. Run this after
 * touching src/i18n/messages/*.json:
 *
 *     node ios/tools/sync-strings.mjs
 *
 * Only the namespaces the client app actually shows are carried over; the
 * coach's vocabulary has no business in a client bundle.
 */
import { readFileSync, writeFileSync } from "node:fs";

const NAMESPACES = [
  "onboarding", "today", "goal", "equipment", "days", "cycle",
  "phase", "offline", "auth", "sets", "feel", "pain", "adherence",
];

const read = (locale) =>
  JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8"));

const fr = read("fr");
const en = read("en");

/** ICU `{n}` is what next-intl uses; Foundation wants `%1$@`. */
function toFoundation(value) {
  const order = [];
  const out = value.replace(/\{(\w+)\}/g, (_, name) => {
    let index = order.indexOf(name);
    if (index === -1) index = order.push(name) - 1;
    return `%${index + 1}$@`;
  });
  return { out, order };
}

const strings = {};
let carried = 0;
let skipped = 0;

for (const ns of NAMESPACES) {
  for (const [key, value] of Object.entries(fr[ns] ?? {})) {
    if (typeof value !== "string") continue;
    // A plural or a select is ICU machinery the catalog would mangle. Those
    // few live in Swift, where they can use the real plural rules.
    if (/\{[^}]*,\s*(plural|select)/.test(value)) { skipped += 1; continue; }

    const frText = toFoundation(value);
    const enValue = en[ns]?.[key];
    const enText = typeof enValue === "string" ? toFoundation(enValue).out : frText.out;

    strings[`${ns}.${key}`] = {
      extractionState: "manual",
      localizations: {
        fr: { stringUnit: { state: "translated", value: frText.out } },
        en: { stringUnit: { state: "translated", value: enText } },
      },
      ...(frText.order.length ? { comment: `args: ${frText.order.join(", ")}` } : {}),
    };
    carried += 1;
  }
}

writeFileSync(
  "ios/Masse/Resources/Localizable.xcstrings",
  JSON.stringify({ sourceLanguage: "fr", strings, version: "1.0" }, null, 2) + "\n",
);

console.log(`${carried} strings carried, ${skipped} ICU plurals left to Swift`);
