import { ParserFactory } from "@/lib/parsers";
import fs from "fs";
import path from "path";

async function testNewsletterParsing() {
  console.log("🧪 Testing Newsletter Parsing (HTML Direct)");

  // Read test data
  const htmlPath = path.join(process.cwd(), "test-data", "newsletter.html");
  const metadataPath = path.join(process.cwd(), "test-data", "metadata.json");

  if (!fs.existsSync(htmlPath)) {
    console.error("❌ Test HTML file not found:", htmlPath);
    return;
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

  console.log("📧 Email metadata:");
  console.log(`  From: ${metadata.from}`);
  console.log(`  Subject: ${metadata.subject}`);
  console.log(`  HTML length: ${html.length}`);

  // Get parser
  const parser = ParserFactory.getParser(metadata.from);
  if (!parser) {
    console.error("❌ No parser found for:", metadata.from);
    return;
  }

  console.log(`🔍 Parser found: ${parser.name}`);

  // Parse newsletter
  const emailMetadata = {
    id: "test-email-1",
    sender: metadata.from,
    subject: metadata.subject,
    date: metadata.date,
  };

  const result = parser.parse(html, emailMetadata);

  console.log("📄 Parsing results:");
  console.log(`  Sections found: ${result.sections.length}`);
  console.log(`  Links found: ${result.links.length}`);

  result.sections.forEach((section, index) => {
    console.log(`  ${index + 1}. ${section.title} (${section.type})`);
    console.log(`     Content: ${section.content.substring(0, 80)}...`);
  });

  // Final output: Show category breakdown
  console.log("\n" + "=".repeat(80));
  console.log("� LINK CATEGORY BREAKDOWN:");
  console.log("=".repeat(80));

  const categoryCount = result.links.reduce((acc, link) => {
    acc[link.category] = (acc[link.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(categoryCount).forEach(([category, count]) => {
    console.log(`${category.toUpperCase()}: ${count} links`);
  });

  // Check for duplicates
  const urlCounts = result.links.reduce((acc, link) => {
    acc[link.url] = (acc[link.url] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const duplicates = Object.entries(urlCounts).filter(
    ([url, count]) => count > 1
  );

  console.log("\n� DUPLICATE CHECK:");
  console.log("=".repeat(80));
  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate URLs:`);
    duplicates.forEach(([url, count]) => {
      console.log(`  ${count}x: ${url.substring(0, 60)}...`);
    });
  } else {
    console.log("✅ No duplicate URLs found");
  }

  console.log("\n📋 UNIQUE LINKS SAMPLE (first 15):");
  console.log("=".repeat(80));

  const uniqueLinks = result.links.filter(
    (link, index, self) => index === self.findIndex((l) => l.url === link.url)
  );

  console.log(
    `Total links: ${result.links.length}, Unique: ${uniqueLinks.length}`
  );

  uniqueLinks.slice(0, 15).forEach((link, i) => {
    console.log(`${i + 1}. [${link.category}] "${link.text}"`);
    console.log(`   URL: ${link.url.substring(0, 70)}...`);
    console.log("");
  });
}

testNewsletterParsing().catch(console.error);
