import { NextRequest, NextResponse } from "next/server";
import { createDocx } from "@/lib/documents/docx";
import { createPdf } from "@/lib/documents/pdf";
import { resumeSchema, safeFileName } from "@/lib/resume";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4_000_000) {
      return NextResponse.json({ error: "The resume data is too large. Choose a smaller photo." }, { status: 413 });
    }

    const body = await request.json();
    const result = resumeSchema.safeParse(body.resume);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || "Please check your resume details." }, { status: 400 });
    }

    const format = body.format === "docx" ? "docx" : body.format === "pdf" ? "pdf" : null;
    if (!format) return NextResponse.json({ error: "Choose PDF or DOCX." }, { status: 400 });

    const bytes = format === "docx" ? await createDocx(result.data) : await createPdf(result.data);
    const filename = `${safeFileName(result.data.basics.fullName)}.${format}`;
    const responseBody = Uint8Array.from(bytes).buffer;

    return new NextResponse(responseBody, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf",
      },
    });
  } catch (error) {
    console.error("Resume generation failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We could not create the file. Please try again." }, { status: 500 });
  }
}
