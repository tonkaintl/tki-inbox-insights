import { Email, ParsedNewsletter } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { ParserFactory } from "@/lib/parsers";
import { GraphService } from "@/lib/services/graphService";
import { cleanSubject, getParserByEmail } from "@/types/newsletter-types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { folderId, folderName, accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Access token is required",
        },
        { status: 401 }
      );
    }

    if (!folderId || !folderName) {
      return NextResponse.json(
        {
          success: false,
          error: "folderId and folderName are required",
        },
        { status: 400 }
      );
    }

    console.log(`🚀 Processing folder: ${folderName} (${folderId})`);
    console.log(`📊 Processing ALL emails (no limit)`);

    // Connect to database
    await connectToDatabase();

    // Initialize Graph service with access token
    const graphService = new GraphService(accessToken);

    // Get ALL emails from the folder (no limit - we'll use a large number)
    console.log(`📧 Fetching all emails from ${folderName} folder...`);
    const allEmails = await graphService.getMessages(folderId, 1000); // Large number to get most emails

    console.log(
      `📧 Retrieved ${allEmails.length} total emails from ${folderName} folder`
    );

    if (!allEmails || allEmails.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No emails found in ${folderName} folder`,
      });
    }

    // Filter for emails we can parse (based on parser email mappings)
    const parseableEmails = allEmails.filter((email) => {
      const fromAddress = email.from.emailAddress.address.toLowerCase();
      const parserType = getParserByEmail(fromAddress);
      return parserType !== null;
    });

    console.log(
      `📮 Found ${parseableEmails.length} parseable newsletter emails`
    );

    if (parseableEmails.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          processed: 0,
          saved: 0,
          links: 0,
          message: `No parseable newsletter emails found in ${folderName} folder`,
        },
      });
    }

    // Process each parseable email
    let processedCount = 0;
    let savedCount = 0;
    let totalLinks = 0;

    for (const email of parseableEmails) {
      try {
        // Get the parser for this email address
        const fromAddress = email.from.emailAddress.address.toLowerCase();
        const parserType = getParserByEmail(fromAddress);
        if (!parserType) {
          console.log(`⏭️ No parser available for: ${fromAddress}`);
          continue;
        }

        const parser = ParserFactory.getParser(fromAddress);
        if (!parser) {
          console.log(
            `⏭️ Parser factory couldn't create parser for: ${fromAddress}`
          );
          continue;
        }

        // Check if we already processed this email (deduplication by ID)
        const existingEmail = await Email.findOne({ id: email.id });
        if (existingEmail) {
          console.log(`⏭️ Skipping already processed email: ${email.id}`);
          continue;
        }

        // Get the full email content
        const fullEmail = await graphService.getFullMessage(email.id);

        // Normalize contentType to match our schema
        const normalizeContentType = (
          contentType: string | undefined
        ): "text/plain" | "text/html" => {
          if (!contentType) return "text/html";
          const lowerType = contentType.toLowerCase();
          if (lowerType === "text" || lowerType === "plain")
            return "text/plain";
          // Map "html", "text/html", or anything else to "text/html"
          return "text/html";
        };

        // Save the raw email first with snake_case fields
        const savedEmail = new Email({
          id: email.id,
          subject: cleanSubject(email.subject), // Clean emojis from subject
          from: {
            email_address: {
              address: email.from.emailAddress.address,
              name:
                email.from.emailAddress.name || email.from.emailAddress.address,
            },
          },
          received_date_time: email.receivedDateTime, // Keep as string
          body: {
            content: fullEmail.body?.content || "",
            content_type: normalizeContentType(fullEmail.body?.contentType),
          },
          body_preview: email.bodyPreview || "",
          folder_id: folderId,
        });

        await savedEmail.save();

        // Parse the newsletter content
        const parsedNewsletter = parser.parse(fullEmail.body?.content || "", {
          id: email.id,
          sender: email.from.emailAddress.address,
          subject: cleanSubject(email.subject), // Clean emojis from subject
          date: email.receivedDateTime, // Keep as string as expected by the parser
        });

        // Check if we already have a parsed version (extra safety) - using snake_case field
        const existingParsed = await ParsedNewsletter.findOne({
          email_id: email.id,
        });
        if (!existingParsed) {
          // Save the parsed newsletter with snake_case fields
          const savedParsed = new ParsedNewsletter({
            id: parsedNewsletter.id,
            email_id: parsedNewsletter.email_id, // Already snake_case
            sender: parsedNewsletter.sender,
            subject: cleanSubject(parsedNewsletter.subject), // Clean emojis
            date: parsedNewsletter.date,
            parser_used: parsedNewsletter.parser_used, // Already snake_case
            links: parsedNewsletter.links, // Links should already be in correct format
            parsed_at: parsedNewsletter.parsed_at,
            version: parsedNewsletter.version,
          });
          await savedParsed.save();

          totalLinks += parsedNewsletter.links.length;
          savedCount++;
        }

        processedCount++;

        if (processedCount % 10 === 0) {
          console.log(
            `✅ Processed ${processedCount}/${parseableEmails.length} emails`
          );
        }
      } catch (emailError) {
        console.error(`❌ Error processing email ${email.id}:`, emailError);
        // Continue with next email even if one fails
      }
    }

    console.log(
      `🎉 Processing complete! Processed: ${processedCount}, Saved: ${savedCount}, Links: ${totalLinks}`
    );

    return NextResponse.json({
      success: true,
      data: {
        processed: processedCount,
        saved: savedCount,
        links: totalLinks,
        message: `Successfully processed ${processedCount} emails and extracted ${totalLinks} links`,
      },
    });
  } catch (error) {
    console.error("❌ Error processing folder:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
