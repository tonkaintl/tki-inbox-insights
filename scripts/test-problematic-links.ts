import { DailyTheRundownAiParser } from "@/lib/parsers/daily-therundown-ai";

// Test HTML with problematic links that should be filtered out
const problematicHtml = `
<html>
<body>
  <h2>AI DEVELOPMENTS</h2>
  <p>Here are some links:</p>
  
  <!-- Good links that should be kept -->
  <a href="https://techcrunch.com/ai-news">Major AI breakthrough announced</a>
  <a href="https://github.com/project">Open source AI project</a>
  
  <!-- Bad links that should be filtered out -->
  <a href="https://link.mail.beehiiv.com/nailed-it">⭐️⭐️⭐️⭐️⭐️ Nailed it</a>
  <a href="https://example.com/share">Click to Share</a>
  <a href="https://example.com/empty">   </a>
  <a href="https://example.com/number">123</a>
  <a href="https://example.com/single">a</a>
  <a href="https://example.com/generic">read</a>
  
  <!-- Edge case: link with only emojis after cleaning -->
  <a href="https://example.com/emoji">🔥🔥🔥</a>
</body>
</html>
`;

function testProblematicLinks() {
  console.log("🧪 Testing Problematic Links Filtering\n");
  console.log("=".repeat(80));

  const parser = new DailyTheRundownAiParser();

  const emailMetadata = {
    id: "test-email-1",
    sender: "news@daily.therundown.ai",
    subject: "Test Newsletter",
    date: "2025-10-01T10:00:00Z",
  };

  const result = parser.parse(problematicHtml, emailMetadata);

  console.log(`📊 Total links found: ${result.links.length}`);
  console.log("\n📋 Links that passed filtering:\n");

  result.links.forEach((link, index) => {
    console.log(`${index + 1}. "${link.text}"`);
    console.log(`   URL: ${link.url}`);
    console.log(`   Section: ${link.section}`);
    console.log(`   Category: ${link.category}`);
    console.log();
  });

  // Expected: Only the 2 good links should remain
  const expectedCount = 2;

  if (result.links.length === expectedCount) {
    console.log("✅ SUCCESS: Filtered out problematic links correctly!");
    console.log(
      `   Expected ${expectedCount} links, got ${result.links.length}`
    );
  } else {
    console.log("❌ ISSUE: Unexpected number of links");
    console.log(
      `   Expected ${expectedCount} links, got ${result.links.length}`
    );
  }

  // Check that all remaining links have proper sections
  const linksWithoutSection = result.links.filter(
    (link) => !link.section || link.section.trim() === ""
  );
  if (linksWithoutSection.length === 0) {
    console.log("✅ SUCCESS: All links have valid sections!");
  } else {
    console.log(
      `❌ ISSUE: ${linksWithoutSection.length} links missing sections`
    );
  }
}

testProblematicLinks();
