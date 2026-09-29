import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { registerFonts } from "@/lib/pdfFonts";

/**
 * What a client can keep on paper or in their files: this week's programme,
 * their meal plan, or both — the same numbers their app shows today, under
 * their coach's logo. Ink on white: paper has no theme.
 */
export type ClientPdfExercise = { name: string; target: string | null; cue: string | null };
export type ClientPdfDay = { day: string; name: string | null; exercises: ClientPdfExercise[] };
export type ClientPdfMeal = { label: string; items: { name: string; quantity: string | null }[] };
export type ClientPdfDayType = {
  name: string;
  targets: string | null;
  meals: ClientPdfMeal[];
  supplements: string[];
};

export type ClientPdfData = {
  logo: string | null;
  coachName: string;
  clientName: string;
  date: string;
  programme: { title: string; days: ClientPdfDay[]; note: string | null } | null;
  plan: { dayTypes: ClientPdfDayType[]; note: string | null } | null;
};

export type ClientPdfLabels = {
  programme: string;
  plan: string;
  rest: string;
  supplements: string;
  empty: string;
  preparedBy: string;
};

const INK = "#111111";
const INK2 = "#454545";
const INK3 = "#6b6b6b";
const RULE = "#d8d8d8";

const s = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 52, paddingHorizontal: 44, fontFamily: "Instrument Sans", fontSize: 9.5, lineHeight: 1.45, color: INK },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  who: { fontSize: 9, color: INK2, textAlign: "right" },
  kicker: { fontSize: 8, fontWeight: 700, letterSpacing: 1.2, color: INK3, textTransform: "uppercase" },
  title: { fontFamily: "Bricolage", fontWeight: 800, fontSize: 20, textTransform: "uppercase", marginTop: 2 },
  note: { fontSize: 8.5, color: INK3, marginTop: 4 },
  block: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: RULE },
  blockTitle: { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 },
  sub: { fontSize: 9, color: INK2, marginTop: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: RULE },
  rowName: { fontWeight: 600, flex: 1, paddingRight: 10 },
  rowValue: { color: INK2, textAlign: "right" },
  cue: { fontSize: 8.5, color: INK3, marginTop: 1 },
  meal: { marginTop: 6 },
  mealLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: INK2 },
  footer: { position: "absolute", bottom: 26, left: 44, right: 44, fontSize: 8, color: INK3, textAlign: "center" },
});

function Section({ kicker, title, note, children }: { kicker: string; title: string; note: string | null; children: React.ReactNode }) {
  return (
    <View>
      <Text style={s.kicker}>{kicker}</Text>
      <Text style={s.title}>{title}</Text>
      {note && <Text style={s.note}>{note}</Text>}
      {children}
    </View>
  );
}

function ClientDocument({ data, labels }: { data: ClientPdfData; labels: ClientPdfLabels }) {
  const head = (
    <View style={s.header} fixed>
      <View>
        {data.logo ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt
          <Image src={data.logo} style={{ height: 36, maxWidth: 140, objectFit: "contain" }} />
        ) : (
          <Text style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 14 }}>{data.coachName}</Text>
        )}
      </View>
      <View>
        <Text style={s.who}>{data.clientName}</Text>
        <Text style={s.who}>{data.date}</Text>
      </View>
    </View>
  );

  return (
    <Document title={`${data.clientName} · ${data.date}`} author={data.coachName}>
      {data.programme && (
        <Page size="A4" style={s.page}>
          {head}
          <Section kicker={labels.programme} title={data.programme.title} note={data.programme.note}>
            {data.programme.days.map((day) => (
              <View key={day.day} style={s.block} wrap={false}>
                <Text style={s.blockTitle}>{day.day}</Text>
                {day.exercises.length === 0 ? (
                  <Text style={s.sub}>{labels.rest}</Text>
                ) : (
                  <>
                    {day.name && <Text style={s.sub}>{day.name}</Text>}
                    {day.exercises.map((exercise, i) => (
                      <View key={`${exercise.name}-${i}`} style={s.row}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ fontWeight: 600 }}>{exercise.name}</Text>
                          {exercise.cue && <Text style={s.cue}>{exercise.cue}</Text>}
                        </View>
                        {exercise.target && <Text style={s.rowValue}>{exercise.target}</Text>}
                      </View>
                    ))}
                  </>
                )}
              </View>
            ))}
          </Section>
          <Text style={s.footer} fixed>{`${labels.preparedBy} ${data.coachName} · Masse`}</Text>
        </Page>
      )}

      {data.plan && (
        <Page size="A4" style={s.page}>
          {head}
          <Section kicker={labels.plan} title={data.clientName} note={data.plan.note}>
            {data.plan.dayTypes.length === 0 && <Text style={s.sub}>{labels.empty}</Text>}
            {data.plan.dayTypes.map((type) => (
              <View key={type.name} style={s.block} wrap={false}>
                <Text style={s.blockTitle}>{type.name}</Text>
                {type.targets && <Text style={s.sub}>{type.targets}</Text>}
                {type.meals.map((meal) => (
                  <View key={meal.label} style={s.meal}>
                    <Text style={s.mealLabel}>{meal.label}</Text>
                    {meal.items.map((item, i) => (
                      <View key={`${item.name}-${i}`} style={s.row}>
                        <Text style={s.rowName}>{item.name}</Text>
                        {item.quantity && <Text style={s.rowValue}>{item.quantity}</Text>}
                      </View>
                    ))}
                  </View>
                ))}
                {type.supplements.length > 0 && (
                  <View style={s.meal}>
                    <Text style={s.mealLabel}>{labels.supplements}</Text>
                    {type.supplements.map((line) => (
                      <Text key={line} style={s.sub}>{line}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </Section>
          <Text style={s.footer} fixed>{`${labels.preparedBy} ${data.coachName} · Masse`}</Text>
        </Page>
      )}
    </Document>
  );
}

export async function renderClientPdf(data: ClientPdfData, labels: ClientPdfLabels): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<ClientDocument data={data} labels={labels} />);
}
