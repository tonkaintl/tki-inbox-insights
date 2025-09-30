import { parseEml } from "@/lib/eml-parser";
import { ParserFactory } from "@/lib/parsers";
import * as fs from "fs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "filePath is required" },
        { status: 400 }
      );
    }

    // Read the EML file
    const emlContent = fs.readFileSync(filePath, "utf-8");

    // Parse the EML to extract HTML content
    const parsedEmail = parseEml(emlContent);

    if (!parsedEmail.html) {
      return NextResponse.json(
        { success: false, error: "No HTML content found in EML file" },
        { status: 400 }
      );
    }

    // Get the appropriate parser
    const parser = ParserFactory.getParser(parsedEmail.from || "");

    if (!parser) {
      return NextResponse.json(
        { success: false, error: "No parser found for this email sender" },
        { status: 400 }
      );
    }

    // Parse the newsletter
    const parsedNewsletter = parser.parse(parsedEmail.html, {
      id: `eml-${Date.now()}`,
      sender: parsedEmail.from || "",
      subject: parsedEmail.subject || "",
      date: parsedEmail.date || new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Newsletter parsed using ${parser.name} parser`,
      parserId: parser.name,
      sectionsFound: parsedNewsletter.sections.length,
      linksFound: parsedNewsletter.links.length,
      htmlContentLength: parsedEmail.html.length,
      parsedNewsletter,
      emailMetadata: {
        from: parsedEmail.from,
        subject: parsedEmail.subject,
        date: parsedEmail.date,
      },
    });
  } catch (error) {
    console.error("Error parsing EML:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to parse EML file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
