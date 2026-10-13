import React from "react";
import { Document, Image, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { orderedSectionIds, ResumeData, sectionIsVisible } from "@/lib/resume";
import { hasRichText, richTextBlocks } from "@/lib/rich-text";
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
  });

  const contact = [resume.basics.email, resume.basics.phone, resume.basics.location].filter(Boolean).join("  •  ");
  const photo = template.supportsPhoto && /^data:image\/(png|jpeg);base64,/.test(resume.basics.photoDataUrl) ? resume.basics.photoDataUrl : "";

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
  const RichContent = ({ value }: { value: string }) => {
    let orderedItem = 0;
    return <>{richTextBlocks(value).map((block, index) => {
    orderedItem = block.list === "number" ? orderedItem + 1 : 0;
    const text = <Text style={{ flexGrow: block.list ? 1 : undefined, textAlign: block.alignment }}>{block.runs.map((run, runIndex) => <Text key={runIndex} style={{ fontFamily: run.bold && run.italic ? "Helvetica-BoldOblique" : run.bold ? "Helvetica-Bold" : run.italic ? "Helvetica-Oblique" : "Helvetica", textDecoration: run.underline ? "underline" : undefined }}>{run.text}</Text>)}</Text>;
    return block.list ? <View key={index} style={styles.bulletRow}><Text style={styles.bullet}>{block.list === "number" ? `${orderedItem}.` : "•"}</Text>{text}</View> : <View key={index} style={{ marginBottom: 2 }}>{text}</View>;
    })}</>;
  };
  const customSections = new Map(resume.customSections.map((section) => [section.id, section]));
  const textSections: Record<string, [string, string]> = {
    profile: ["Profile", resume.basics.summary],
    skills: ["Skills", resume.skills],
    projects: ["Projects", resume.projects],
    certifications: ["Certifications", resume.certifications],
    languages: ["Languages", resume.languages],
  };

  const renderSection = (id: string) => {
    if (id === "experience" && resume.experience.length > 0) return <Section key={id} title="Experience">{resume.experience.map((entry) => <View key={entry.id} style={styles.entry} wrap={false}><View style={styles.entryHead}><Text style={styles.entryTitle}>{entry.position || "Untitled position"}</Text><Text style={styles.dates}>{[entry.startDate, entry.endDate].filter(Boolean).join(" – ")}</Text></View>{entry.employer && <Text style={styles.organization}>{entry.employer}</Text>}<RichContent value={entry.highlights} /></View>)}</Section>;
    if (id === "education" && resume.education.length > 0) return <Section key={id} title="Education">{resume.education.map((entry) => <View key={entry.id} style={styles.entry} wrap={false}><View style={styles.entryHead}><Text style={styles.entryTitle}>{entry.qualification || "Qualification"}</Text><Text style={styles.dates}>{[entry.startDate, entry.endDate].filter(Boolean).join(" – ")}</Text></View>{entry.institution && <Text style={styles.organization}>{entry.institution}</Text>}<RichContent value={entry.details} /></View>)}</Section>;
    const standard = textSections[id];
    if (standard && hasRichText(standard[1])) return <Section key={id} title={standard[0]}><RichContent value={standard[1]} /></Section>;
    const custom = customSections.get(id);
    if (custom && custom.title && hasRichText(custom.content)) return <Section key={id} title={custom.title}><RichContent value={custom.content} /></Section>;
    return null;
  };

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

        {orderedSectionIds(resume).filter((id) => sectionIsVisible(resume, id)).map(renderSection)}
      </Page>
    </Document>
  );
}

export async function createPdf(resume: ResumeData): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<ResumePdf resume={resume} />);
  return new Uint8Array(buffer);
}
