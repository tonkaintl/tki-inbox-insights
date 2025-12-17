import { BroadcastItem } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { GraphService } from "@/lib/services/graphService";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

// Helper function to extract text and clean it
function extractText(html: string): string {
  const $ = cheerio.load(html);

  console.log("\n🔍 DEBUG: Analyzing HTML structure");

  // Log all h2, h3 tags to see titles
  $("h2").each((i, el) => {
    console.log(`   H2 [${i}]: ${$(el).text().trim()}`);
  });
  $("h3").each((i, el) => {
    console.log(`   H3 [${i}]: ${$(el).text().trim()}`);
  });

  // Log all links to find the machine listing URL
  console.log("\n🔗 All links found:");
  $("a").each((i, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (href && href.includes("tonkaintl.com") && !href.includes("mailto")) {
      console.log(`   [${i}] ${text}: ${href}`);
    }
  });

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
function extractPrice(html: string, text: string): string | null {
  console.log("\n💰 DEBUG: Searching for price...");

  const $ = cheerio.load(html);

  // Check H2 tags first (new design has "EXW: Wisconsin @ $10,000" in H2)
  let price = null;
  $("h2, h3").each((i, el) => {
    const headingText = $(el).text();
    const priceMatch = headingText.match(/\$\s*\d{1,3}(?:,\s*\d{3})+/);
    if (priceMatch) {
      price = priceMatch[0].replace(/\s/g, "");
      console.log(`   Found in heading [${i}]: ${price}`);
      return false; // break
    }
  });

  if (price) return price;

  // Fallback: search in text
  const priceMatches = text.match(/\$\s*\d{1,3}(?:,\s*\d{3})+/g);
  console.log(
    `   Found ${priceMatches?.length || 0} price matches in text:`,
    priceMatches
  );

  if (priceMatches && priceMatches.length > 0) {
    return priceMatches[0].replace(/\s/g, "");
  }

  // Last resort: try to match any price format
  const simplePriceMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
  console.log("   Fallback simple price match:", simplePriceMatch?.[0]);
  return simplePriceMatch ? simplePriceMatch[0] : null;
}

// Helper function to extract location after EXW:
function extractLocation(html: string, text: string): string | null {
  console.log("\n📍 DEBUG: Searching for location (EXW:)...");

  const $ = cheerio.load(html);

  // Check H2 tags first (new design has "EXW: Wisconsin @ $10,000" in H2)
  let location = null;
  $("h2, h3").each((i, el) => {
    const headingText = $(el).text();
    // Pattern: "EXW: Wisconsin @ $10,000"
    const locationMatch = headingText.match(/EXW:\s*([A-Za-z\s]+?)\s*@/i);
    if (locationMatch) {
      location = locationMatch[1].trim();
      console.log(`   Found in heading [${i}]: ${location}`);
      return false; // break
    }
  });

  if (location) return location;

  // Fallback: search in text
  const textLocationMatch = text.match(/EXW:\s*([A-Za-z\s]+?)\s*@/i);
  console.log("   Location match in text:", textLocationMatch?.[1]);

  if (textLocationMatch) {
    return textLocationMatch[1].trim();
  }

  // Alternative pattern without @
  const altLocationMatch = text.match(
    /EXW:\s*([A-Za-z\s]+?)(?=\s*(?:;|EXW:|$|\$))/i
  );
  console.log("   Alt location match:", altLocationMatch?.[1]);
  if (altLocationMatch) {
    return altLocationMatch[1].trim();
  }

  return null;
}

// Helper function to extract stock number from text or HTML
// Returns array of stock numbers [first, ...others]
function extractStockNumber(html: string, text: string): string[] {
  console.log("\n🔢 DEBUG: Searching for stock number (STK#)...");

  const $ = cheerio.load(html);

  // Look in h3 tags first (new design)
  const stockNumbers: string[] = [];
  $("h3").each((i, el) => {
    const h3Text = $(el).text();

    // Check for multiple stock numbers format: "STK#: (Utility): 409961029 (Wabash): 409961033"
    const multiMatch = h3Text.match(/STK#?\s*:?\s*.*?(\d{9,}).*?(\d{9,})/i);
    if (multiMatch) {
      stockNumbers.push(multiMatch[1], multiMatch[2]);
      console.log(
        `   Found multiple in H3 [${i}]: ${multiMatch[1]}, ${multiMatch[2]}`
      );
      return false; // break
    }

    // Single stock number
    const match = h3Text.match(/STK#?\s*:?\s*(\d+)/i);
    if (match) {
      stockNumbers.push(match[1]);
      console.log(`   Found in H3 [${i}]: ${match[1]}`);
    }
  });

  if (stockNumbers.length > 0) return stockNumbers;

  // Fallback: search in full text
  const textMatch = text.match(/STK#?\s*:?\s*(\d+)/i);
  if (textMatch) {
    stockNumbers.push(textMatch[1]);
    console.log(`   Found in text: ${textMatch[1]}`);
  }

  return stockNumbers;
}

// Helper function to extract machine info (specs like engine, transmission, miles, condition)
function extractMachineInfo(html: string): string[] {
  console.log("\n🔧 DEBUG: Extracting machine info...");

  const $ = cheerio.load(html);
  const specs: string[] = [];
  const seenSpecs = new Set<string>();

  // Look for text content blocks that might contain specs
  // Check p tags, divs, and spans (some specs have font-size styling)
  $("p, div, span").each((i, el) => {
    const text = $(el).text().trim();

    // Skip if already seen (avoid duplicates)
    if (seenSpecs.has(text)) return;

    // Match patterns like:
    // - "Cummins ISX Engine"
    // - "53' x 102""
    // - "Air Ride Suspension"
    // - "Swing Doors"
    // - "Aluminum Roofs"
    // - "Current DOT"
    if (
      text &&
      !text.includes("TONKA") &&
      !text.includes("Tonka") &&
      !text.includes("@") &&
      !text.includes("Unsubscribe") &&
      !text.includes("www.") &&
      !text.includes("More Images") &&
      !text.includes("STK#") &&
      !text.includes("Plano") &&
      !text.includes("Texas") &&
      !text.includes("Alma") &&
      text.length > 3 &&
      text.length < 150
    ) {
      // Check if it looks like a spec line
      if (
        /engine|transmission|miles|issues|codes|axle|sleeper|day cab|suspension|doors|roof|dot|x\s*\d+/i.test(
          text
        ) ||
        /\d{3,}\s*miles/i.test(text) ||
        /no\s+issues/i.test(text) ||
        /\d+'\s*x\s*\d+/i.test(text) || // dimensions like 53' x 102"
        /^[A-Z][a-z]+\s+(Doors|Roof|Suspension|DOT)/i.test(text) // Swing Doors, Aluminum Roofs, etc.
      ) {
        specs.push(text);
        seenSpecs.add(text);
        console.log(`   Spec [${specs.length}]: ${text}`);
      }
    }
  });

  return specs;
}

// Helper function to extract machine listing URL
function extractMachineUrl(html: string): string | null {
  console.log("\n🔗 DEBUG: Searching for machine listing URL...");

  const $ = cheerio.load(html);
  let url = null;

  $("a").each((i, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();

    // NEW: Check if the link TEXT contains the actual URL (Constant Contact uses tracking URLs in href)
    if (text.includes("tonkaintl.com/inventory/")) {
      url = text;
      console.log(`   Found inventory URL in link text [${i}]: ${url}`);
      return false; // break the loop
    }

    // Fallback: Look for inventory links in href
    if (href && href.includes("tonkaintl.com/inventory/")) {
      url = href;
      console.log(`   Found inventory link in href [${i}]: ${url}`);
      return false; // break the loop
    }
  });

  return url;
}

// Helper function to extract YouTube video URL
function extractYoutubeUrl(html: string, text: string): string | null {
  console.log("\n🎥 DEBUG: Searching for YouTube video link...");

  const $ = cheerio.load(html);
  let youtubeUrl = null;

  // Check link text for YouTube URLs (Constant Contact wraps in tracking URLs)
  $("a").each((i, el) => {
    const linkText = $(el).text().trim();

    // Match youtube.com or youtu.be URLs
    const youtubeMatch = linkText.match(
      /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[-\w]+)/i
    );
    if (youtubeMatch) {
      youtubeUrl = youtubeMatch[1];
      console.log(`   Found YouTube URL in link text [${i}]: ${youtubeUrl}`);
      return false; // break
    }
  });

  if (youtubeUrl) return youtubeUrl;

  // Fallback: search in plain text
  const textMatch = text.match(
    /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[-\w]+)/i
  );
  if (textMatch) {
    youtubeUrl = textMatch[1];
    console.log(`   Found YouTube URL in text: ${youtubeUrl}`);
  }

  return youtubeUrl;
}

// Helper function to extract image URLs (excluding logo and template images)
function extractImages(html: string): string[] {
  console.log("\n🖼️  DEBUG: Extracting images...");

  const $ = cheerio.load(html);
  const images: string[] = [];

  $("img").each((i, el) => {
    const src = $(el).attr("src");
    const alt = $(el).attr("alt")?.toLowerCase() || "";

    console.log(
      `   Image [${i}]: src="${src?.substring(0, 80)}..." alt="${alt}"`
    );

    // Skip logo images
    if (src && !alt.includes("logo") && !alt.includes("tonka")) {
      const srcLower = src.toLowerCase();

      // Skip .gif and .png files (99% are email support images)
      if (srcLower.includes(".gif") || srcLower.includes(".png")) {
        console.log(`      ⏭️  Skipped (gif/png)`);
        return;
      }

      // Include images from constantcontact.com (actual vehicle photos)
      // Accept jpg, jpeg, heic, tiff, and other common image formats
      if (src.includes("constantcontact.com") || src.includes("files.")) {
        const hasImageExtension = /\.(jpe?g|png|heic|tiff?|webp|bmp)/i.test(
          src
        );
        if (
          hasImageExtension &&
          !srcLower.includes(".png") &&
          !srcLower.includes(".gif")
        ) {
          images.push(src);
          console.log(`      ✅ Added (vehicle photo)`);
        }
      }
    }
  });

  console.log(`   Total images found: ${images.length}`);

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
        const stockNumbers = extractStockNumber(htmlContent, fullText);
        const machineInfo = extractMachineInfo(htmlContent);
        console.log(
          `   🔍 machineInfo type: ${typeof machineInfo}, isArray: ${Array.isArray(
            machineInfo
          )}, length: ${machineInfo?.length}`
        );
        const machineUrl = extractMachineUrl(htmlContent);
        const youtubeUrl = extractYoutubeUrl(htmlContent, fullText);
        const price = extractPrice(htmlContent, fullText);
        const location = extractLocation(htmlContent, fullText);
        const images = extractImages(htmlContent);

        // Use first stock number, add others to notes
        const primaryStockNumber =
          stockNumbers.length > 0 ? stockNumbers[0] : null;
        const additionalStockNumbers = stockNumbers.slice(1);
        let notesText = "";
        if (additionalStockNumbers.length > 0) {
          notesText = `Additional Stock Numbers: ${additionalStockNumbers.join(
            ", "
          )}`;
          console.log(
            `   ℹ️  Additional stock#: ${additionalStockNumbers.join(", ")}`
          );
        }

        console.log("\n📊 EXTRACTION RESULTS:");
        console.log(`   📝 Subject: ${email.subject}`);
        console.log(`   🔢 Stock#: ${primaryStockNumber || "NOT FOUND"}`);
        if (additionalStockNumbers.length > 0) {
          console.log(
            `   🔢 Additional Stock#s: ${additionalStockNumbers.join(", ")}`
          );
        }
        console.log(`   🔧 Machine Info (${machineInfo.length} specs):`);
        machineInfo.forEach((spec, idx) =>
          console.log(`      ${idx + 1}. ${spec}`)
        );
        console.log(`   🔗 Machine URL: ${machineUrl || "NOT FOUND"}`);
        console.log(`   🎥 YouTube URL: ${youtubeUrl || "NOT FOUND"}`);
        console.log(`   💰 Price: ${price || "NOT FOUND"}`);
        console.log(`   📍 Location: ${location || "NOT FOUND"}`);
        console.log(`   🖼️  Images: ${images.length} found`);
        console.log(`   📄 Full text length: ${fullText.length} chars`);
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
          stock_number: primaryStockNumber || null,
          machine_info: Array.isArray(machineInfo) ? machineInfo : [],
          machine_url: machineUrl || null,
          youtube_url: youtubeUrl || null,
          price: price || null,
          location: location || null,
          images: Array.isArray(images) ? images : [],
          notes: notesText,
          parsed_at: new Date(),
          raw_html: "", // Don't store full HTML - too large!
        };

        console.log(
          `   📋 broadcastItem.machine_info:`,
          broadcastItem.machine_info
        );

        // Save to database
        console.log(`   💾 Saving to database...`);
        console.log(
          `   📦 Data being saved:`,
          JSON.stringify(
            {
              stock_number: primaryStockNumber,
              additional_stock_numbers: additionalStockNumbers,
              machine_info: machineInfo,
              machine_url: machineUrl,
              youtube_url: youtubeUrl,
              price,
              location,
              images_count: images.length,
            },
            null,
            2
          )
        );

        const savedItem = await BroadcastItem.findOneAndUpdate(
          { message_id: messageId },
          broadcastItem,
          {
            upsert: true,
            new: true,
          }
        );

        console.log(`   ✅ Saved to database`);
        console.log(
          `   ✓ Verified machine_info in DB:`,
          savedItem.machine_info
        );

        processedItems.push({
          subject: email.subject,
          stockNumber: primaryStockNumber,
          machineUrl,
          machineInfoCount: machineInfo.length,
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
      console.log(`   Stock#: ${item.stockNumber || "N/A"}`);
      console.log(`   Machine Info: ${item.machineInfoCount} specs`);
      console.log(`   URL: ${item.machineUrl || "N/A"}`);
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
