import React from "react";
import { Document, Image, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { ResumeData, lines, list } from "@/lib/resume";
import { getTemplate } from "@/lib/templates";

function ResumePdf({ resume }: { resume: ResumeData }) {
  const template = getTemplate(resume.templateId);
  const accent = template.accent;
  const styles = StyleSheet.create({
    page: { backgroundColor: "#ffffff", color: "#28302e", fontFamily: "Helvetica", fontSize: 9.5, lineHeight: 1.42, paddingBottom: 38, paddingHorizontal: 48, paddingTop: resume.templateId === "clean-modern" ? 34 : 46, borderTopColor: accent, borderTopWidth: resume.templateId === "clean-modern" ? 9 : 0, borderLeftColor: accent, borderLeftWidth: resume.templateId === "profile-sidebar" ? 18 : 0 },
    header: { alignItems: "center", borderBottomColor: accent, borderBottomWidth: 1.5, flexDirection: template.supportsPhoto && resume.basics.photoDataUrl ? "row" : "column", paddingBottom: 12 },
    photo: { borderRadius: 36, height: 68, marginRight: 16, objectFit: "cover", width: 68 },
    headerText: { flexGrow: 1, textAlign: resume.templateId === "classic-ats" ? "center" : "left" },
    name: { color: accent, fontFamily: "Times-Bold", fontSize: 24, letterSpacing: 0.6, textTransform: "uppercase" },
    headline: { color: "#46514d", fontSize: 10.5, letterSpacing: 1.2, marginTop: 3, textTransform: "uppercase" },
    contact: { color: "#58635f", flexDirection: "row", flexWrap: "wrap", fontSize: 8.4, justifyContent: resume.templateId === "classic-ats" ? "center" : "flex-start", marginTop: 7 },
    link: { color: accent, textDecoration: "none" },
    section: { marginTop: 13 },
    sectionTitle: { borderBottomColor: "#ccd3d0", borderBottomWidth: 0.7, color: accent, fontFamily: "Helvetica-Bold", fontSize: 10.5, letterSpacing: 1.5, marginBottom: 6, paddingBottom: 3, textTransform: "uppercase" },
    entry: { marginBottom: 8 },
    entryHead: { flexDirection: "row", justifyContent: "space-between" },
    entryTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.3 },
    dates: { color: "#66706d", fontSize: 8.8 },
    organization: { color: "#46514d", fontFamily: "Helvetica-Oblique", marginBottom: 2 },
    bulletRow: { flexDirection: "row", marginBottom: 1.5, paddingLeft: 4 },
    bullet: { color: accent, marginRight: 5 },
    skillRow: { flexDirection: "row", flexWrap: "wrap" },
    skill: { backgroundColor: resume.templateId === "classic-ats" ? "#ffffff" : `${accent}12`, marginBottom: 4, marginRight: 5, paddingHorizontal: 6, paddingVertical: 3 },
  });

  const contact = [resume.basics.email, resume.basics.phone, resume.basics.location].filter(Boolean).join("  •  ");
  const photo = template.supportsPhoto && /^data:image\/(png|jpeg);base64,/.test(resume.basics.photoDataUrl) ? resume.basics.photoDataUrl : "";

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
  const Bullets = ({ values }: { values: string[] }) => <>{values.map((value, index) => <View key={`${value}-${index}`} style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text>{value}</Text></View>)}</>;

  return (
    <Document title={`${resume.basics.fullName} Resume`} author={resume.basics.fullName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {photo && <Image src={photo} style={styles.photo} />}
          <View style={styles.headerText}>
            <Text style={styles.name}>{resume.basics.fullName}</Text>
            {resume.basics.headline && <Text style={styles.headline}>{resume.basics.headline}</Text>}
            <View style={styles.contact}>
              <Text>{contact}{contact && resume.basics.link ? "  •  " : ""}</Text>
              {resume.basics.link && <Link src={/^https?:\/\//i.test(resume.basics.link) ? resume.basics.link : `https://${resume.basics.link}`} style={styles.link}>{resume.basics.link}</Link>}
            </View>
          </View>
        </View>

        {resume.basics.summary && <Section title="Profile"><Text>{resume.basics.summary}</Text></Section>}
        {resume.experience.length > 0 && <Section title="Experience">{resume.experience.map((entry) => <View key={entry.id} style={styles.entry} wrap={false}><View style={styles.entryHead}><Text style={styles.entryTitle}>{entry.position || "Untitled position"}</Text><Text style={styles.dates}>{[entry.startDate, entry.endDate].filter(Boolean).join(" – ")}</Text></View>{entry.employer && <Text style={styles.organization}>{entry.employer}</Text>}<Bullets values={lines(entry.highlights)} /></View>)}</Section>}
        {resume.education.length > 0 && <Section title="Education">{resume.education.map((entry) => <View key={entry.id} style={styles.entry} wrap={false}><View style={styles.entryHead}><Text style={styles.entryTitle}>{entry.qualification || "Qualification"}</Text><Text style={styles.dates}>{[entry.startDate, entry.endDate].filter(Boolean).join(" – ")}</Text></View>{entry.institution && <Text style={styles.organization}>{entry.institution}</Text>}{entry.details && <Text>{entry.details}</Text>}</View>)}</Section>}
        {list(resume.skills).length > 0 && <Section title="Skills"><View style={styles.skillRow}>{list(resume.skills).map((skill) => <Text key={skill} style={styles.skill}>{skill}</Text>)}</View></Section>}
        {lines(resume.projects).length > 0 && <Section title="Projects"><Bullets values={lines(resume.projects)} /></Section>}
        {lines(resume.certifications).length > 0 && <Section title="Certifications"><Bullets values={lines(resume.certifications)} /></Section>}
        {lines(resume.languages).length > 0 && <Section title="Languages"><Text>{lines(resume.languages).join("  •  ")}</Text></Section>}
      </Page>
    </Document>
  );
}

export async function createPdf(resume: ResumeData): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<ResumePdf resume={resume} />);
  return new Uint8Array(buffer);
}
