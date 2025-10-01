import { Email, ParsedNewsletter } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { ParserFactory } from "@/lib/parsers";
import { GraphService } from "@/lib/services/graphService";
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

    // Filter for daily rundown emails
    const dailyRundownEmails = allEmails.filter((email) => {
      const fromAddress = email.from.emailAddress.address.toLowerCase();
      return (
        fromAddress.includes("news@daily.therundown.ai") ||
        fromAddress.includes("daily.therundown.ai")
      );
    });

    console.log(`📮 Found ${dailyRundownEmails.length} daily rundown emails`);

    if (dailyRundownEmails.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          processed: 0,
          saved: 0,
          links: 0,
          message: `No daily rundown emails found in ${folderName} folder`,
        },
      });
    }

    // Process each daily rundown email
    let processedCount = 0;
    let savedCount = 0;
    let totalLinks = 0;
    const parser = ParserFactory.getParser("news@daily.therundown.ai");

    if (!parser) {
      return NextResponse.json({
        success: false,
        error: "No parser available for daily rundown emails",
      });
    }

    for (const email of dailyRundownEmails) {
      try {
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

        // Save the raw email first
        const savedEmail = new Email({
          id: email.id,
          subject: email.subject,
          from: {
            emailAddress: {
              address: email.from.emailAddress.address,
              name:
                email.from.emailAddress.name || email.from.emailAddress.address,
            },
          },
          receivedDateTime: new Date(email.receivedDateTime),
          body: {
            content: fullEmail.body?.content || "",
            contentType: normalizeContentType(fullEmail.body?.contentType),
          },
          bodyPreview: email.bodyPreview || "",
          importance: "normal", // Default since not in basic message
          hasAttachments: false, // Default since not in basic message
          internetMessageId: "", // Default since not in basic message
          folderId: folderId,
          categories: [], // Default since not in basic message
        });

        await savedEmail.save();

        // Parse the newsletter content
        const parsedNewsletter = parser.parse(fullEmail.body?.content || "", {
          id: email.id,
          sender: email.from.emailAddress.address,
          subject: email.subject,
          date: email.receivedDateTime, // Keep as string as expected by the parser
        });

        // Check if we already have a parsed version (extra safety)
        const existingParsed = await ParsedNewsletter.findOne({
          emailId: email.id,
        });
        if (!existingParsed) {
          // Save the parsed newsletter
          const savedParsed = new ParsedNewsletter(parsedNewsletter);
          await savedParsed.save();

          totalLinks += parsedNewsletter.links.length;
          savedCount++;
        }

        processedCount++;

        if (processedCount % 10 === 0) {
          console.log(
            `✅ Processed ${processedCount}/${dailyRundownEmails.length} emails`
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
