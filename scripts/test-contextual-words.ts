import { DailyTheRundownAiParser } from "@/lib/parsers/daily-therundown-ai";

// Test HTML with contextual word usage
const contextualWordsHtml = `
<html>
<body>
  <h2>NEWS SECTION</h2>
  
  <!-- These should be KEPT (contextual usage) -->
  <a href="https://example.com/article">Read the full research paper</a>
  <a href="https://example.com/details">View more technical details</a>
  <a href="https://example.com/tutorial">Learn more about AI ethics</a>
  <a href="https://example.com/guide">Click here to access the complete guide</a>
  
  <!-- These should be FILTERED OUT (standalone) -->
  <a href="https://example.com/generic1">read</a>
  <a href="https://example.com/generic2">more</a>
  <a href="https://example.com/generic3">view</a>
  <a href="https://example.com/generic4">here</a>
  <a href="https://example.com/generic5">click</a>
</body>
</html>
`;

function testContextualWords() {
  console.log("🧪 Testing Contextual vs Standalone Word Filtering\n");
  console.log("=".repeat(80));

  const parser = new DailyTheRundownAiParser();

  const emailMetadata = {
    id: "test-contextual-1",
    sender: "news@daily.therundown.ai",
    subject: "Test Contextual Words",
    date: "2025-10-01T10:00:00Z",
  };

  const result = parser.parse(contextualWordsHtml, emailMetadata);

  console.log(`📊 Total links found: ${result.links.length}`);
  console.log("\n📋 Links that passed filtering:\n");

  result.links.forEach((link, index) => {
    console.log(`${index + 1}. "${link.text}"`);
    console.log(`   URL: ${link.url}`);
    console.log(
      `   Analysis: ${
        link.text.split(" ").length > 1 ? "CONTEXTUAL" : "STANDALONE"
      }`
    );
    console.log();
  });

  // Expected: Only the 4 contextual links should remain
  const expectedCount = 4;
  const contextualLinks = result.links.filter(
    (link) => link.text.split(" ").length > 1
  );
  const standaloneLinks = result.links.filter(
    (link) => link.text.split(" ").length === 1
  );

  console.log("=".repeat(80));
  console.log(`📈 Analysis:`);
  console.log(`   Expected: ${expectedCount} contextual links`);
  console.log(`   Found: ${result.links.length} total links`);
  console.log(`   Contextual links: ${contextualLinks.length}`);
  console.log(`   Standalone links: ${standaloneLinks.length}`);

  if (result.links.length === expectedCount && standaloneLinks.length === 0) {
    console.log(
      "\n✅ SUCCESS: Correctly filtered standalone words while keeping contextual usage!"
    );
  } else {
    console.log("\n❌ ISSUE: Filtering logic needs adjustment");
    if (standaloneLinks.length > 0) {
      console.log(`   Standalone links that should have been filtered:`);
      standaloneLinks.forEach((link) => console.log(`   - "${link.text}"`));
    }
  }
}

testContextualWords();
