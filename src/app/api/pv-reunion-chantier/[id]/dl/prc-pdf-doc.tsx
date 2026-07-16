import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COMPANY } from "@/lib/company";

const C = "#1E2F6E";
const O = "#F7941E";
const GRAY = "#64748b";
const LIGHT = "#f8fafc";
const BORDER = "#e2e8f0";

const s = StyleSheet.create({
  page:     { fontFamily: "Helvetica", fontSize: 9, color: "#334155", paddingHorizontal: 28, paddingTop: 24, paddingBottom: 48 },
  // ── En-tête ──
  header:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `3pt solid ${O}`, paddingBottom: 8, marginBottom: 14 },
  logo:     { width: 55, height: 28, objectFit: "contain" },
  compName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C },
  compSub:  { fontSize: 7, color: O, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 },
  compInfo: { fontSize: 7, color: GRAY, marginTop: 1 },
  hRight:   { alignItems: "flex-end" },
  titBig:   { fontSize: 15, fontFamily: "Helvetica-Bold", color: C },
  titSub:   { fontSize: 8, color: GRAY, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  titRef:   { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#334155", marginTop: 4 },
  titType:  { fontSize: 8, color: GRAY },
  titDate:  { fontSize: 8, color: GRAY },
  // ── Blocs info ──
  row3:     { flexDirection: "row", gap: 5, marginBottom: 12 },
  row2:     { flexDirection: "row", gap: 5, marginBottom: 12 },
  box:      { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 3, padding: 6, backgroundColor: LIGHT },
  boxLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  boxVal:   { fontSize: 9, color: "#334155" },
  // ── Section titre ──
  secTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  // ── Table ──
  table:    { marginBottom: 12 },
  thead:    { flexDirection: "row", backgroundColor: O, paddingVertical: 4, paddingHorizontal: 5 },
  th:       { fontSize: 8, fontFamily: "Helvetica-Bold", color: "white" },
  trow:     { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" },
  trowAlt:  { backgroundColor: LIGHT },
  td:       { fontSize: 8, color: "#334155" },
  // ── Point ──
  pointBox:  { borderWidth: 1, borderColor: BORDER, borderRadius: 3, padding: 7, marginBottom: 5 },
  pTitle:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: C, marginBottom: 3 },
  pContent:  { fontSize: 8, color: GRAY },
  // ── Prochaine réunion ──
  nextBox:   { borderWidth: 1, borderColor: `${O}66`, borderRadius: 3, backgroundColor: `${O}0D`, padding: 8, marginBottom: 12 },
  nextLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  nextVal:   { fontSize: 9, color: "#334155" },
  // ── Signatures ──
  sigSection: { borderWidth: 1, borderColor: BORDER, borderRadius: 3, marginBottom: 12, overflow: "hidden" },
  sigHeader:  { backgroundColor: C, paddingVertical: 5, paddingHorizontal: 8 },
  sigHText:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: "white", textTransform: "uppercase", letterSpacing: 0.8 },
  sigGrid:    { flexDirection: "row", flexWrap: "wrap" },
  sigBox:     { width: "50%", padding: 10, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  sigBoxFull: { width: "100%", padding: 10 },
  sigRole:    { fontSize: 7, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  sigName:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: C, marginBottom: 2 },
  sigDate:    { fontSize: 7, color: GRAY, marginBottom: 6 },
  sigImg:     { height: 40, objectFit: "contain", objectPositionX: 0, marginTop: 2 },
  sigLine:    { borderBottomWidth: 1, borderBottomStyle: "dashed", borderBottomColor: "#cbd5e1", marginTop: 28, marginBottom: 4 },
  sigLineHint:{ fontSize: 7, color: "#94a3b8" },
  // ── Mention légale ──
  mentBox:   { borderWidth: 1, borderColor: `${O}4D`, backgroundColor: `${O}0A`, borderRadius: 3, padding: 6, marginBottom: 12, textAlign: "center" },
  ment:      { fontSize: 8, color: O, fontFamily: "Helvetica-Bold" },
  // ── Footer ──
  footer:    { position: "absolute", bottom: 20, left: 28, right: 28, borderTopWidth: 0.5, borderTopColor: BORDER, paddingTop: 6, textAlign: "center" },
  footText:  { fontSize: 7, color: "#94a3b8" },
});

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(d));
}

type Participant = {
  nom: string;
  societe?: string | null;
  fonction?: string | null;
  present: boolean;
  signatureImage?: string | null;
  dateSigne?: Date | null;
};

type Point = { ordre: number; titre: string; contenu?: string | null };

type Action = {
  ordre: number;
  description: string;
  responsable?: string | null;
  echeance?: Date | null;
  statut: string;
};

type PVData = {
  numero: string;
  typeReunion: string;
  dateReunion?: Date | null;
  lieuReunion?: string | null;
  heureDebut?: string | null;
  heureFin?: string | null;
  animateur?: string | null;
  redacteur?: string | null;
  prochaineDateReunion?: Date | null;
  prochaineLieu?: string | null;
  notes?: string | null;
  signatureSDA?: string | null;
  dateSigSDA?: Date | null;
  signataireNomSDA?: string | null;
  chantier?: { nom: string; reference?: string | null } | null;
  client?: { nom: string; prenom?: string | null; raisonSociale?: string | null } | null;
  participants: Participant[];
  points: Point[];
  actions: Action[];
};

const TYPE_LABELS: Record<string, string> = {
  COORDINATION: "Coordination", AVANCEMENT: "Avancement",
  SECURITE: "Sécurité", RECEPTION: "Réception", AUTRE: "Autre",
};
const ACTION_LABELS: Record<string, string> = {
  OUVERTE: "Ouverte", EN_COURS: "En cours", CLOTUREE: "Clôturée",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";

export function PrcPdfDocument({ pv }: { pv: PVData }) {
  const clientNom = pv.client?.raisonSociale
    ?? (pv.client ? `${pv.client.prenom ?? ""} ${pv.client.nom}`.trim() : "—");

  return (
    <Document title={`PV Réunion — ${pv.numero}`} author="SDA Rénovation" creator="CRM SDA Rénovation">
      <Page size="A4" style={s.page}>

        {/* ── EN-TÊTE ── */}
        <View style={s.header} fixed>
          <View>
            <Image src={`${APP_URL}/logo.png`} style={s.logo} />
            <Text style={s.compSub}>{COMPANY.activite}</Text>
            <Text style={s.compInfo}>{COMPANY.adresse} — {COMPANY.codePostal} {COMPANY.ville}</Text>
            <Text style={s.compInfo}>{COMPANY.email} · {COMPANY.telephone}</Text>
            <Text style={s.compInfo}>SIREN {COMPANY.siren}</Text>
          </View>
          <View style={s.hRight}>
            <Text style={s.titBig}>PROCÈS-VERBAL</Text>
            <Text style={s.titSub}>de réunion de chantier</Text>
            <Text style={s.titRef}>{pv.numero}</Text>
            <Text style={s.titType}>{TYPE_LABELS[pv.typeReunion] ?? pv.typeReunion}</Text>
            {pv.dateReunion && <Text style={s.titDate}>{fmt(pv.dateReunion)}</Text>}
          </View>
        </View>

        {/* ── BLOC INFO ── */}
        <View style={s.row3}>
          <View style={s.box}>
            <Text style={s.boxLabel}>Chantier</Text>
            <Text style={s.boxVal}>{pv.chantier?.nom ?? "—"}</Text>
            {pv.chantier?.reference && <Text style={[s.boxVal, { color: GRAY, fontSize: 7 }]}>{pv.chantier.reference}</Text>}
          </View>
          <View style={s.box}>
            <Text style={s.boxLabel}>Client</Text>
            <Text style={s.boxVal}>{clientNom}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.boxLabel}>Lieu</Text>
            <Text style={s.boxVal}>{pv.lieuReunion ?? "—"}</Text>
          </View>
        </View>
        <View style={s.row3}>
          <View style={s.box}>
            <Text style={s.boxLabel}>Horaires</Text>
            <Text style={s.boxVal}>{pv.heureDebut ?? "—"} → {pv.heureFin ?? "—"}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.boxLabel}>Animateur</Text>
            <Text style={s.boxVal}>{pv.animateur ?? "—"}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.boxLabel}>Rédacteur</Text>
            <Text style={s.boxVal}>{pv.redacteur ?? "—"}</Text>
          </View>
        </View>

        {/* ── PARTICIPANTS ── */}
        {pv.participants.length > 0 && (
          <View style={s.table} wrap={false}>
            <Text style={s.secTitle}>Participants</Text>
            <View style={s.thead}>
              <Text style={[s.th, { flex: 3 }]}>Nom</Text>
              <Text style={[s.th, { flex: 3 }]}>Société</Text>
              <Text style={[s.th, { flex: 2 }]}>Fonction</Text>
              <Text style={[s.th, { flex: 1, textAlign: "center" }]}>Présence</Text>
              <Text style={[s.th, { flex: 1, textAlign: "center" }]}>Signature</Text>
            </View>
            {pv.participants.map((p, i) => (
              <View key={i} style={[s.trow, i % 2 === 1 ? s.trowAlt : {}]}>
                <Text style={[s.td, { flex: 3, fontFamily: "Helvetica-Bold" }]}>{p.nom}</Text>
                <Text style={[s.td, { flex: 3 }]}>{p.societe ?? "—"}</Text>
                <Text style={[s.td, { flex: 2 }]}>{p.fonction ?? "—"}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "center", color: p.present ? "#16a34a" : "#ef4444", fontFamily: "Helvetica-Bold" }]}>
                  {p.present ? "✓" : "✗"}
                </Text>
                <Text style={[s.td, { flex: 1, textAlign: "center", color: p.dateSigne ? "#16a34a" : "#94a3b8" }]}>
                  {p.dateSigne ? "✅ Signé" : "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── POINTS ── */}
        {pv.points.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={s.secTitle}>Points traités</Text>
            {pv.points.map((pt, i) => (
              <View key={i} style={s.pointBox} wrap={false}>
                <Text style={s.pTitle}>{i + 1}. {pt.titre}</Text>
                {pt.contenu ? <Text style={s.pContent}>{pt.contenu}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* ── ACTIONS ── */}
        {pv.actions.length > 0 && (
          <View style={s.table} wrap={false}>
            <Text style={s.secTitle}>Plan d'actions</Text>
            <View style={s.thead}>
              <Text style={[s.th, { width: 20 }]}>#</Text>
              <Text style={[s.th, { flex: 4 }]}>Description</Text>
              <Text style={[s.th, { flex: 2 }]}>Responsable</Text>
              <Text style={[s.th, { width: 55, textAlign: "center" }]}>Échéance</Text>
              <Text style={[s.th, { width: 50, textAlign: "center" }]}>Statut</Text>
            </View>
            {pv.actions.map((a, i) => (
              <View key={i} style={[s.trow, i % 2 === 1 ? s.trowAlt : {}]}>
                <Text style={[s.td, { width: 20, textAlign: "center", color: GRAY }]}>{a.ordre}</Text>
                <Text style={[s.td, { flex: 4 }]}>{a.description}</Text>
                <Text style={[s.td, { flex: 2 }]}>{a.responsable ?? "—"}</Text>
                <Text style={[s.td, { width: 55, textAlign: "center" }]}>{fmt(a.echeance)}</Text>
                <Text style={[s.td, { width: 50, textAlign: "center", color: a.statut === "CLOTUREE" ? "#16a34a" : a.statut === "EN_COURS" ? "#2563eb" : "#64748b" }]}>
                  {ACTION_LABELS[a.statut] ?? a.statut}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── PROCHAINE RÉUNION ── */}
        {(pv.prochaineDateReunion || pv.prochaineLieu) && (
          <View style={s.nextBox} wrap={false}>
            <Text style={s.nextLabel}>Prochaine réunion</Text>
            <Text style={s.nextVal}>
              {pv.prochaineDateReunion ? fmt(pv.prochaineDateReunion) : ""}
              {pv.prochaineLieu ? `  —  ${pv.prochaineLieu}` : ""}
            </Text>
          </View>
        )}

        {/* ── SIGNATURES ── */}
        <View style={s.sigSection} wrap={false}>
          <View style={s.sigHeader}>
            <Text style={s.sigHText}>Signatures électroniques</Text>
          </View>
          <View style={s.sigGrid}>
            {/* Participants qui ont signé */}
            {pv.participants.filter(p => !!p.dateSigne || true).map((p, i) => (
              <View key={i} style={[s.sigBox, { borderRightWidth: i % 2 === 0 ? 0.5 : 0, borderRightColor: BORDER }]}>
                <Text style={s.sigRole}>{p.societe ?? "Participant"}</Text>
                <Text style={s.sigName}>{p.nom}</Text>
                {p.dateSigne ? (
                  <>
                    <Text style={[s.sigDate, { color: "#16a34a" }]}>✅ Signé le {fmt(p.dateSigne)}</Text>
                    {p.signatureImage && (
                      <Image src={p.signatureImage} style={s.sigImg} />
                    )}
                  </>
                ) : (
                  <>
                    <View style={s.sigLine} />
                    <Text style={s.sigLineHint}>Signature</Text>
                    <Text style={[s.sigLineHint, { marginTop: 4 }]}>À ________ / ________ / ____________</Text>
                  </>
                )}
              </View>
            ))}
            {/* SDA */}
            <View style={[s.sigBoxFull, { borderTopWidth: 0.5, borderTopColor: BORDER }]}>
              <Text style={s.sigRole}>Représentant — SDA Rénovation</Text>
              <Text style={s.sigName}>{pv.signataireNomSDA ?? COMPANY.nom}</Text>
              {pv.dateSigSDA ? (
                <>
                  <Text style={[s.sigDate, { color: "#16a34a" }]}>✅ Contre-signé le {fmt(pv.dateSigSDA)}</Text>
                  {pv.signatureSDA && (
                    <Image src={pv.signatureSDA} style={[s.sigImg, { height: 50 }]} />
                  )}
                </>
              ) : (
                <>
                  <View style={s.sigLine} />
                  <Text style={s.sigLineHint}>Signature SDA Rénovation</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ── MENTION LÉGALE ── */}
        <View style={s.mentBox}>
          <Text style={s.ment}>Ce PV fait foi en cas de litige. À contresigner et retourner sous 8 jours ouvrés.</Text>
        </View>

        {/* ── PIED DE PAGE ── */}
        <View style={s.footer} fixed>
          <Text style={s.footText}>
            {COMPANY.nom} · SIREN {COMPANY.siren} · {COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville}
          </Text>
          <Text style={s.footText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages} — ${pv.numero}`} />
        </View>
      </Page>
    </Document>
  );
}
