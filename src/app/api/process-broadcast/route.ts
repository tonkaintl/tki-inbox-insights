import { BroadcastItem } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { GraphService } from "@/lib/services/graphService";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

// Helper function to extract text and clean it
function extractText(html: string): string {
  const $ = cheerio.load(html);

  // Remove script and style elements
  $("script, style").remove();

  // Replace block-level elements with semicolons to preserve structure
  $("br").replaceWith("; ");
  $("div, p, h1, h2, h3, h4, h5, h6, li, tr, td").each((_, el) => {
    $(el).append("; ");
  });

  // Get all text
  const text = $("body").text() || $.text();

  // Clean up: remove extra whitespace, normalize line breaks
  const cleaned = text
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/\n+/g, " ") // Remove newlines
    .replace(/;\s*;+/g, "; ") // Multiple semicolons to single semicolon with space
    .trim();

  // Remove common repetitive sections
  let result = cleaned;

  // Remove header/contact info (before the main content)
  result = result.replace(
    /TONKA INTERNATIONAL CORPORATION.*?Email: gary@tonkaintl\.com/gi,
    ""
  );

  // Remove footer/unsubscribe info
  result = result.replace(
    /TONKA INTERNATIONAL.*?Constant Contact Data Notice/gi,
    ""
  );

  // Remove duplicate "Tonka International Corporation" mentions
  result = result.replace(/Tonka International Corporation.*?US/gi, "");

  // Remove "Unsubscribe | Update Profile" sections
  result = result.replace(/Unsubscribe.*?Data Notice/gi, "");

  // Remove standalone address lines
  result = result.replace(
    /\d+\s+(?:Alma Road|Forest Central Drive).*?(?:TX|Texas)\s+\d{5}/gi,
    ""
  );

  // Clean up any remaining multiple spaces and semicolons
  result = result
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/;\s*;+/g, "; ") // Multiple semicolons to single semicolon
    .replace(/;\s+;/g, "; ") // Clean up semicolons with only spaces between
    .replace(/^[;\s]+/, "") // Remove leading semicolons and spaces
    .replace(/[;\s]+$/, "") // Remove trailing semicolons and spaces
    .replace(/;\s*;+/g, "; ") // One more pass for multiple semicolons
    .trim();

  return result;
}

// Helper function to extract price (finds all prices, returns first full price with thousand separator)
function extractPrice(text: string): string | null {
  // Match prices like $7,000 or $7,500 or $11,000
  const priceMatches = text.match(/\$\s*\d{1,3}(?:,\s*\d{3})+/g);
  if (priceMatches && priceMatches.length > 0) {
    // Return the first complete price found
    return priceMatches[0].replace(/\s/g, ""); // Remove any spaces
  }

  // Fallback: try to match any price format
  const simplePriceMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
  return simplePriceMatch ? simplePriceMatch[0] : null;
}

// Helper function to extract location after EXW:
function extractLocation(text: string): string | null {
  // Match "EXW: Location" where location is letters/spaces
  // Stop at: semicolon, "EXW:", "$", or end of string
  const locationMatch = text.match(
    /EXW:\s*([A-Za-z\s]+?)(?=\s*(?:;|EXW:|$|\$))/i
  );
  if (locationMatch) {
    return locationMatch[1].trim();
  }
  return null;
}

// Helper function to extract image URLs (excluding logo and template images)
function extractImages(html: string): string[] {
  const $ = cheerio.load(html);
  const images: string[] = [];

  $("img").each((_, el) => {
    const src = $(el).attr("src");
    const alt = $(el).attr("alt")?.toLowerCase() || "";

    // Skip logo images
    if (src && !alt.includes("logo") && !alt.includes("tonka")) {
      const srcLower = src.toLowerCase();

      // Skip .gif and .png files (99% are email support images)
      if (srcLower.includes(".gif") || srcLower.includes(".png")) {
        return;
      }

      // Only include .jpg images from constantcontact.com (actual vehicle photos)
      if (src.includes("constantcontact.com") && srcLower.includes(".jpg")) {
        images.push(src);
      }
    }
  });

  return images;
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Broadcast endpoint called");

    const {
      folderId,
      folderName,
      accessToken,
      batchSize = 10,
    } = await request.json();
    console.log(
      `📁 Folder: ${folderName}, ID: ${folderId?.substring(0, 20)}...`
    );
    console.log(`📦 Batch size: ${batchSize}`);

    if (!accessToken) {
      console.log("❌ No access token");
      return NextResponse.json(
        {
          success: false,
          error: "Access token is required",
        },
        { status: 401 }
      );
    }

    if (!folderId || !folderName) {
      console.log("❌ Missing folder info");
      return NextResponse.json(
        {
          success: false,
          error: "folderId and folderName are required",
        },
        { status: 400 }
      );
    }

    // Initialize Graph service with access token
    console.log("📧 Initializing Graph service...");
    const graphService = new GraphService(accessToken);

    // Connect to database
    console.log("🔌 Connecting to database...");
    await connectToDatabase();
    console.log("✅ Database connected");

    // Get last N emails from the folder based on batchSize
    console.log(`📬 Fetching last ${batchSize} messages...`);
    const messages = await graphService.getMessages(folderId, batchSize);
    console.log(`✅ Retrieved ${messages.length} messages`);
    console.log("\n📋 PROCESSING BROADCAST EMAILS:");
    console.log("================");

    const processedItems = [];
    let skippedCount = 0;

    // Process each email
    for (let i = 0; i < messages.length; i++) {
      const email = messages[i];
      console.log(
        `\n📧 Processing ${i + 1}/${messages.length}: "${email.subject}"`
      );
      console.log(`   From: ${email.from.emailAddress.address}`);

      try {
        // Get full email content
        console.log(`   ⏳ Fetching full email...`);
        const fullEmail = await graphService.getFullMessage(email.id);
        const htmlContent = fullEmail.body?.content || "";
        const messageId = fullEmail.internetMessageId;
        console.log(`   ✅ Got HTML (${htmlContent.length} chars)`);
        console.log(`   🔑 Message-ID: ${messageId}`);

        // Check if this message was already processed
        console.log(`   🔍 Checking if already processed...`);
        const existingItem = await BroadcastItem.findOne({
          message_id: messageId,
        });
        if (existingItem) {
          console.log(`   ⏭️  SKIPPED - Already processed`);
          skippedCount++;
          continue;
        }

        // Extract data
        console.log(`   🔍 Extracting data...`);
        const fullText = extractText(htmlContent);
        const price = extractPrice(fullText);
        const location = extractLocation(fullText);
        const images = extractImages(htmlContent);
        console.log(
          `   ✅ Extracted: ${fullText.length} chars text, ${images.length} images`
        );

        // Create broadcast item (DON'T store raw_html to save memory!)
        const broadcastItem = {
          id: email.id,
          message_id: messageId,
          subject: email.subject,
          sender: email.from.emailAddress.address,
          received_date: email.receivedDateTime,
          full_text: fullText.substring(0, 5000), // Limit to 5000 chars max
          price,
          location,
          images,
          parsed_at: new Date(),
          raw_html: "", // Don't store full HTML - too large!
        };

        // Save to database
        console.log(`   💾 Saving to database...`);
        await BroadcastItem.findOneAndUpdate(
          { message_id: messageId },
          broadcastItem,
          {
            upsert: true,
            new: true,
          }
        );

        console.log(`   ✅ Saved to database`);
        console.log(`   📄 Text length: ${fullText.length} chars`);
        console.log(`   💰 Price: ${price || "NOT FOUND"}`);
        console.log(`   📍 Location: ${location || "NOT FOUND"}`);
        console.log(`   🖼️  Images: ${images.length} found`);

        processedItems.push({
          subject: email.subject,
          price,
          location,
          imageCount: images.length,
          textLength: fullText.length,
        });
      } catch (err) {
        console.error(`   ❌ Error processing email: ${err}`);
      }
    }

    console.log("\n================");
    console.log(
      `✅ Processed ${processedItems.length} new emails, skipped ${skippedCount} already processed`
    );
    console.log("\n📊 SUMMARY:");
    processedItems.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.subject}`);
      console.log(`   Price: ${item.price || "N/A"}`);
      console.log(`   Location: ${item.location || "N/A"}`);
      console.log(`   Images: ${item.imageCount}`);
    });

    return NextResponse.json({
      success: true,
      data: {
        count: processedItems.length,
        skipped: skippedCount,
        items: processedItems,
        message: `Processed ${processedItems.length} new emails, skipped ${skippedCount} already processed.`,
      },
    });
  } catch (error) {
    console.error("❌ Error processing broadcast folder:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
