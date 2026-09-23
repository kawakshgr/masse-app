import path from "node:path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { euros } from "@/lib/billing";
import type { InvoiceData } from "@/lib/invoice";

/* The same two families as the screen. fontkit reads .woff directly, so the
   files are vendored from @fontsource under assets/fonts (SIL OFL 1.1, licence
   text beside them) rather than fetched at render time — and rather than read
   out of node_modules, which a deployed bundle does not promise to keep.
   next.config.ts traces this folder into the function. */
const fontFile = (file: string) =>
  path.join(process.cwd(), "assets", "fonts", file);

let registered = false;
function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Instrument Sans",
    fonts: [
      { src: fontFile("instrument-sans-latin-400-normal.woff"), fontWeight: 400 },
      { src: fontFile("instrument-sans-latin-600-normal.woff"), fontWeight: 600 },
      { src: fontFile("instrument-sans-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Bricolage",
    fonts: [
      { src: fontFile("bricolage-grotesque-latin-800-normal.woff"), fontWeight: 800 },
    ],
  });
  // A French invoice has long unbroken strings — IBAN, SIRET. Let them wrap
  // rather than run off the sheet.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

/* Ink on white. The screen's palette is not a printing palette: nothing here
   reads a theme token, because paper has no theme. */
const INK = "#111111";
const INK2 = "#454545";
const INK3 = "#6b6b6b";
const RULE = "#d8d8d8";

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Instrument Sans",
    fontSize: 9.5,
    lineHeight: 1.5,
    color: INK,
  },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 24 },
  issuer: { flex: 1, paddingRight: 24 },
  meta: { width: 190, textAlign: "right" },
  display: {
    fontFamily: "Bricolage",
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 1.25,
    marginBottom: 3,
  },
  number: {
    fontFamily: "Bricolage",
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 1.25,
    marginTop: 2,
  },
  micro: { fontSize: 7, letterSpacing: 1.3, textTransform: "uppercase", color: INK2 },
  dim: { color: INK2 },
  faint: { color: INK3 },
  section: { marginTop: 26 },
  name: { fontSize: 11, fontWeight: 700, marginTop: 4 },
  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    paddingBottom: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    paddingVertical: 9,
  },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 28 },
  totalLabel: { color: INK2 },
  totalValue: { width: 90, textAlign: "right" },
  grand: {
    fontFamily: "Bricolage",
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 1.25,
    width: 90,
    textAlign: "right",
  },
  columns: { flexDirection: "row", gap: 28, marginTop: 26 },
  column: { flex: 1 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    fontSize: 7.5,
    color: INK3,
    textAlign: "center",
  },
});

type Labels = {
  invoice: string;
  issuedOn: string;
  notIssued: string;
  period: string;
  billTo: string;
  description: string;
  net: string;
  subtotal: string;
  vat: string;
  vatAt: string;
  total: string;
  payment: string;
  legal: string;
  defaultPenalty: string;
  recovery: string;
  settledOn: string;
  vatNumber: string;
  franchise: string;
};

function line(value: string | null | undefined) {
  return value ? <Text>{value}</Text> : null;
}

/**
 * The invoice as paper. It carries no disclaimer about itself: that belongs on
 * the screen the coach is looking at, not on the document she sends.
 */
function InvoiceDocument({ data, labels }: { data: InvoiceData; labels: Labels }) {
  const { profile, client, invoice } = data;
  const address = [
    profile.address_line1,
    profile.address_line2,
    [profile.postcode, profile.city].filter(Boolean).join(" ") || null,
    profile.country,
  ].filter(Boolean) as string[];

  const registry = [
    `SIRET ${profile.siret}`,
    profile.ape_code ? `APE ${profile.ape_code}` : null,
    profile.rcs_city ? `RCS ${profile.rcs_city}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document
      title={invoice?.invoice_number ?? labels.invoice}
      author={profile.legal_name ?? ""}
      subject={`${labels.invoice} · ${data.monthName}`}
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.issuer}>
            <Text style={s.display}>{profile.legal_name}</Text>
            {line(profile.legal_form)}
            {address.map((l) => (
              <Text key={l}>{l}</Text>
            ))}
            <Text style={[s.dim, { marginTop: 6 }]}>{registry}</Text>
            {profile.vat_number && (
              <Text style={s.dim}>
                {labels.vatNumber} {profile.vat_number}
              </Text>
            )}
          </View>

          <View style={s.meta}>
            <Text style={s.micro}>{labels.invoice}</Text>
            <Text style={s.number}>{invoice?.invoice_number ?? "—"}</Text>
            <Text style={[s.dim, { marginTop: 6 }]}>
              {invoice?.issued_at
                ? labels.issuedOn.replace(
                    "{date}",
                    new Date(invoice.issued_at).toLocaleDateString("fr-FR"),
                  )
                : labels.notIssued}
            </Text>
            <Text style={s.dim}>
              {labels.period.replace("{month}", data.monthName)}
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.micro}>{labels.billTo}</Text>
          <Text style={s.name}>{client.name}</Text>
          {line(client.email)}
          {line(client.phone)}
        </View>

        <View style={s.section}>
          <View style={s.tableHead}>
            <Text style={s.micro}>{labels.description}</Text>
            <Text style={s.micro}>{labels.net}</Text>
          </View>
          <View style={s.row}>
            <Text style={{ flex: 1, paddingRight: 16 }}>{data.description}</Text>
            <Text style={{ width: 90, textAlign: "right" }}>{euros(data.net)}</Text>
          </View>

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{labels.subtotal}</Text>
            <Text style={s.totalValue}>{euros(data.net)}</Text>
          </View>
          <View style={[s.totalRow, { marginTop: 2 }]}>
            <Text style={s.totalLabel}>
              {data.vatRate > 0
                ? labels.vatAt.replace("{rate}", String(data.vatRate))
                : labels.vat}
            </Text>
            <Text style={s.totalValue}>{euros(data.vat)}</Text>
          </View>
          <View style={[s.totalRow, { marginTop: 6, alignItems: "flex-end" }]}>
            <Text style={{ fontWeight: 700 }}>{labels.total}</Text>
            <Text style={s.grand}>{euros(data.gross)}</Text>
          </View>

          {profile.vat_regime === "franchise" && (
            <Text style={[s.dim, { marginTop: 14 }]}>{labels.franchise}</Text>
          )}
        </View>

        <View style={s.columns}>
          <View style={s.column}>
            <Text style={s.micro}>{labels.payment}</Text>
            <View style={{ marginTop: 5 }}>
              {line(profile.payment_terms)}
              {profile.iban && <Text>IBAN {profile.iban}</Text>}
              {profile.bic && <Text>BIC {profile.bic}</Text>}
              {invoice?.status === "paid" && invoice.paid_at && (
                <Text style={{ fontWeight: 700, marginTop: 5 }}>
                  {labels.settledOn.replace(
                    "{date}",
                    new Date(invoice.paid_at).toLocaleDateString("fr-FR"),
                  )}
                </Text>
              )}
            </View>
          </View>

          <View style={s.column}>
            <Text style={s.micro}>{labels.legal}</Text>
            <View style={[{ marginTop: 5 }, s.dim]}>
              <Text>{profile.late_penalty ?? labels.defaultPenalty}</Text>
              <Text style={{ marginTop: 4 }}>
                {labels.recovery.replace("{amount}", euros(profile.recovery_fee_cents))}
              </Text>
              {profile.insurance && (
                <Text style={{ marginTop: 4 }}>{profile.insurance}</Text>
              )}
            </View>
          </View>
        </View>

        {profile.footer_note && (
          <Text fixed style={s.footer}>
            {profile.footer_note}
          </Text>
        )}
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(
  data: InvoiceData,
  labels: Labels,
): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<InvoiceDocument data={data} labels={labels} />);
}

/** The strings the paper needs, resolved once by the caller that has `t`. */
export type InvoiceLabels = Labels;
