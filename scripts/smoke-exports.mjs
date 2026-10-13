const baseUrl = process.env.RESUME_BUILDER_URL || "http://localhost:3000";

const resume = {
  templateId: "clean-modern",
  basics: {
    fullName: "Amina Rahman",
    headline: "Customer Service Associate",
    email: "amina@example.com",
    phone: "+880 1700 000000",
    location: "Dhaka, Bangladesh",
    link: "linkedin.com/in/amina",
    summary: "Friendly and reliable graduate with strong communication and organization skills.",
    photoDataUrl: "",
  },
  experience: [{
    id: "exp1",
    employer: "Community Shop",
    position: "Sales Assistant",
    startDate: "Jan 2025",
    endDate: "Present",
    highlights: "Helped customers find suitable products\nMaintained accurate sales records",
  }],
  education: [{
    id: "edu1",
    institution: "Dhaka College",
    qualification: "Bachelor of Business Studies",
    startDate: "2021",
    endDate: "2025",
    details: "Focused on management and communication.",
  }],
  skills: "Customer service, Microsoft Excel, Communication",
  projects: "Created a student budget tracker",
  certifications: "Digital Marketing Basics, 2025",
  languages: "Bangla — Native\nEnglish — Professional",
};

const expectedSignatures = { pdf: "25504446", docx: "504b0304" };

for (const format of ["pdf", "docx"]) {
  const response = await fetch(`${baseUrl}/api/resumes/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ format, resume }),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const signature = Array.from(bytes.slice(0, 4), (value) => value.toString(16).padStart(2, "0")).join("");
  if (!response.ok || signature !== expectedSignatures[format] || bytes.length < 1000) {
    throw new Error(`${format.toUpperCase()} generation failed (${response.status}, ${bytes.length} bytes, ${signature})`);
  }
  console.log(`${format.toUpperCase()}: ${response.status}, ${bytes.length} bytes, valid signature ${signature}`);
}
