/**
 * Test script for broadcast parser
 * This reads the example .eml file and tests the parsing functions
 */

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

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
    if (href) {
      console.log(`   [${i}] ${text}: ${href.substring(0, 120)}...`);
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
function extractStockNumber(html: string, text: string): string | null {
  console.log("\n🔢 DEBUG: Searching for stock number (STK#)...");

  const $ = cheerio.load(html);

  // Look in h3 tags first (new design)
  let stockNumber = null;
  $("h3").each((i, el) => {
    const h3Text = $(el).text();
    const match = h3Text.match(/STK#?\s*:?\s*(\d+)/i);
    if (match) {
      stockNumber = match[1];
      console.log(`   Found in H3 [${i}]: ${stockNumber}`);
    }
  });

  if (stockNumber) return stockNumber;

  // Fallback: search in full text
  const textMatch = text.match(/STK#?\s*:?\s*(\d+)/i);
  if (textMatch) {
    stockNumber = textMatch[1];
    console.log(`   Found in text: ${stockNumber}`);
  }

  return stockNumber;
}

// Helper function to extract machine info (specs like engine, transmission, miles, condition)
function extractMachineInfo(html: string): string[] {
  console.log("\n🔧 DEBUG: Extracting machine info...");

  const $ = cheerio.load(html);
  const specs: string[] = [];

  // Look for text content blocks that might contain specs
  // In the new design, these appear as separate lines
  $("p, div").each((i, el) => {
    const text = $(el).text().trim();

    // Match patterns like:
    // - "Cummins ISX Engine"
    // - "Manual Transmission"
    // - "826,455 Miles"
    // - "No Issues / No Codes"
    if (
      text &&
      !text.includes("TONKA") &&
      !text.includes("@") &&
      !text.includes("Unsubscribe") &&
      !text.includes("www.") &&
      text.length > 5 &&
      text.length < 150
    ) {
      // Check if it looks like a spec line
      if (
        /engine|transmission|miles|issues|codes|axle|sleeper|day cab/i.test(
          text
        ) ||
        /\d{3,}\s*miles/i.test(text) ||
        /no\s+issues/i.test(text)
      ) {
        specs.push(text);
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

// Main test function
async function testParser() {
  const emlPath = path.join(
    __dirname,
    "..",
    "test-data",
    "2007 KW T800 Tandem Axle Day Cab.eml"
  );

  console.log("📧 Reading test email file...");
  console.log(`   Path: ${emlPath}`);

  const emlContent = fs.readFileSync(emlPath, "utf-8");

  // Extract HTML content from .eml file (it's after the Content-Type: text/html line)
  // First, let's find where the HTML part starts
  const htmlStartMatch = emlContent.match(
    /Content-Type: text\/html[\s\S]*?Content-Transfer-Encoding: quoted-printable\r?\n\r?\n/i
  );

  if (!htmlStartMatch) {
    console.error("❌ Could not find HTML content start in .eml file");
    console.log("\n📄 File preview (first 2000 chars):");
    console.log(emlContent.substring(0, 2000));
    return;
  }

  const htmlStartIndex = htmlStartMatch.index! + htmlStartMatch[0].length;
  const htmlEndMatch = emlContent
    .substring(htmlStartIndex)
    .match(/------=_Part/);
  const htmlEndIndex = htmlEndMatch
    ? htmlStartIndex + htmlEndMatch.index!
    : emlContent.length;

  let htmlContent = emlContent.substring(htmlStartIndex, htmlEndIndex);

  // Decode quoted-printable encoding
  htmlContent = htmlContent
    .replace(/=\r?\n/g, "") // Remove soft line breaks
    .replace(/=([0-9A-F]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    ); // Decode =XX

  console.log(`✅ Extracted HTML (${htmlContent.length} chars)`);
  console.log(
    "\n" + "=".repeat(80) + "\n🧪 TESTING PARSER FUNCTIONS\n" + "=".repeat(80)
  );

  // Test all extraction functions
  const fullText = extractText(htmlContent);
  const stockNumber = extractStockNumber(htmlContent, fullText);
  const machineInfo = extractMachineInfo(htmlContent);
  const machineUrl = extractMachineUrl(htmlContent);
  const price = extractPrice(htmlContent, fullText);
  const location = extractLocation(htmlContent, fullText);
  const images = extractImages(htmlContent);

  console.log(
    "\n" + "=".repeat(80) + "\n📊 FINAL EXTRACTION RESULTS\n" + "=".repeat(80)
  );
  console.log(`\n📝 Subject: 2007 KW T800 Tandem Axle Day Cab`);
  console.log(`🔢 Stock#: ${stockNumber || "❌ NOT FOUND"}`);
  console.log(`\n🔧 Machine Info (${machineInfo.length} specs):`);
  if (machineInfo.length === 0) {
    console.log("   ❌ NO SPECS FOUND");
  } else {
    machineInfo.forEach((spec, idx) => console.log(`   ${idx + 1}. ${spec}`));
  }
  console.log(`\n🔗 Machine URL: ${machineUrl || "❌ NOT FOUND"}`);
  console.log(`💰 Price: ${price || "❌ NOT FOUND"}`);
  console.log(`📍 Location: ${location || "❌ NOT FOUND"}`);
  console.log(`🖼️  Images: ${images.length} found`);
  if (images.length > 0) {
    images.forEach((img, idx) =>
      console.log(`   ${idx + 1}. ${img.substring(0, 100)}...`)
    );
  }
  console.log(`\n📄 Full text (first 500 chars):`);
  console.log(`   ${fullText.substring(0, 500)}...`);

  console.log(
    "\n" + "=".repeat(80) + "\n✅ Expected Values (from user requirements):\n"
  );
  console.log(`   Title: "2007 KW T800 Tandem Axle Day Cab"`);
  console.log(`   Stock#: "855161000"`);
  console.log(`   Machine Info:`);
  console.log(`      - Cummins ISX Engine`);
  console.log(`      - Manual Transmission`);
  console.log(`      - 826,455 Miles`);
  console.log(`      - No Issues / No Codes`);
  console.log(`   Location: "Wisconsin"`);
  console.log(`   Price: "$10,000"`);
  console.log(
    `   URL: "https://www.tonkaintl.com/inventory/855161000/2007-kw-t800-tadc/"`
  );
  console.log(`   Image: Should have at least 1 vehicle image`);
  console.log("=".repeat(80) + "\n");
}

// Run the test
testParser().catch(console.error);
