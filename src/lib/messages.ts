/**
 * The WhatsApp messages Masse writes for a coach, in her own words when she
 * changed them (Admin → Messages, 1 Oct 2026; `coach_messages`). Plain
 * module: the Admin editor and the server components that write the links
 * both read it.
 *
 * Stored with the placeholders the default texts use — {first}, {amount}… —
 * and shown to her in her language ({prénom}, {montant}…).
 */

export const MESSAGE_KINDS = [
  "late",
  "silent",
  "missed",
  "sleep",
  "pain",
  "unpaid",
  "callOffer",
  "callConfirm",
  "callCancel",
  "welcome",
  "decline",
] as const;

export type MessageKind = (typeof MESSAGE_KINDS)[number];

/** Where each default text lives in the messages, and what it can say. */
export const MESSAGES: Record<MessageKind, { key: string; tokens: string[] }> = {
  late: { key: "queue.wa.late", tokens: ["first"] },
  silent: { key: "queue.wa.silent", tokens: ["first"] },
  missed: { key: "queue.wa.missed", tokens: ["first"] },
  sleep: { key: "queue.wa.sleep", tokens: ["first"] },
  pain: { key: "pain.wa", tokens: ["first", "exercise"] },
  unpaid: { key: "queue.wa.unpaid", tokens: ["first", "period", "amount"] },
  callOffer: { key: "calls.waOffer", tokens: ["first", "length"] },
  callConfirm: { key: "calls.waConfirm", tokens: ["first", "when", "length", "link"] },
  callCancel: { key: "calls.waCancel", tokens: ["first", "when"] },
  welcome: { key: "request.waWelcome", tokens: ["first"] },
  decline: { key: "request.waDecline", tokens: ["first"] },
};

/** The groups the editor shows them in. */
export const MESSAGE_GROUPS: { key: string; kinds: MessageKind[] }[] = [
  { key: "followUp", kinds: ["late", "silent", "missed", "sleep", "pain"] },
  { key: "money", kinds: ["unpaid"] },
  { key: "calls", kinds: ["callOffer", "callConfirm", "callCancel"] },
  { key: "requests", kinds: ["welcome", "decline"] },
];

const TOKEN_WORDS: Record<"fr" | "en", Record<string, string>> = {
  fr: { first: "prénom", exercise: "mouvement", period: "mois", amount: "montant", when: "date", length: "durée", link: "lien" },
  en: { first: "firstname", exercise: "movement", period: "month", amount: "amount", when: "date", length: "length", link: "link" },
};

function words(locale: string) {
  return TOKEN_WORDS[locale === "en" ? "en" : "fr"];
}

/** The word she reads for a placeholder: "prénom" for {first}. */
export function tokenWord(token: string, locale: string): string {
  return words(locale)[token] ?? token;
}

/** Stored text → what she edits: {first} becomes {prénom}. */
export function toDisplay(text: string, locale: string): string {
  const map = words(locale);
  return text.replace(/\{(\w+)\}/g, (whole, token: string) => (map[token] ? `{${map[token]}}` : whole));
}

/** What she typed → stored text: {prénom} (any case) becomes {first}. */
export function fromDisplay(text: string, locale: string): string {
  const back = new Map(Object.entries(words(locale)).map(([token, word]) => [word.toLowerCase(), token]));
  return text.replace(/\{([^{}]+)\}/g, (whole, word: string) => {
    const token = back.get(word.trim().toLowerCase());
    return token ? `{${token}}` : whole;
  });
}

/** Fills the placeholders; one left unknown stays as written. */
export function fillMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, token: string) =>
    token in values ? String(values[token]) : whole,
  );
}

export function isMessageKind(value: string): value is MessageKind {
  return (MESSAGE_KINDS as readonly string[]).includes(value);
}
