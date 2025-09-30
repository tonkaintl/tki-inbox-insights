import { getDatabase } from "@/lib/mongodb";
import { ParserFactory } from "@/lib/parsers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { emailId } = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: "Email ID is required" },
        { status: 400 }
      );
    }

    // Get the email from MongoDB
    const db = await getDatabase();
    const emailsCollection = db.collection("emails");
    const email = await emailsCollection.findOne({ id: emailId });

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email not found" },
        { status: 404 }
      );
    }

    // Get appropriate parser
    const parser = ParserFactory.getParser(
      email.from?.emailAddress?.address || ""
    );

    if (!parser) {
      return NextResponse.json(
        {
          success: false,
          error: "No parser available for this email address",
          emailAddress: email.from?.emailAddress?.address,
        },
        { status: 400 }
      );
    }

    // Get HTML content from the email body
    let htmlContent = "";

    if (email.body && email.body.content) {
      htmlContent = email.body.content;
    } else if (email.bodyPreview) {
      // Fallback to bodyPreview if no HTML body
      htmlContent = email.bodyPreview;
    }

    if (!htmlContent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No HTML content found in email. Make sure to save the email with full body first.",
        },
        { status: 400 }
      );
    }

    // Parse the newsletter
    const parsedNewsletter = parser.parse(htmlContent, {
      id: email.id,
      sender: email.from?.emailAddress?.address || "",
      subject: email.subject || "",
      date: email.receivedDateTime || "",
    });

    // Save parsed newsletter to MongoDB
    const parsedCollection = db.collection("parsed-newsletters");

    // Check if already parsed
    const existingParsed = await parsedCollection.findOne({ emailId });
    if (existingParsed) {
      return NextResponse.json({
        success: false,
        message: "Newsletter already parsed",
        parsedId: existingParsed._id,
      });
    }

    const result = await parsedCollection.insertOne(parsedNewsletter);

    return NextResponse.json({
      success: true,
      message: `Newsletter parsed using ${parser.name} parser`,
      insertedId: result.insertedId,
      parserId: parser.name,
      sectionsFound: parsedNewsletter.sections.length,
      linksFound: parsedNewsletter.links.length,
      htmlContentLength: htmlContent.length,
      contentType: email.body?.contentType || "text/plain",
      parsedNewsletter,
    });
  } catch (error) {
    console.error("Error parsing newsletter:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to parse newsletter",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
