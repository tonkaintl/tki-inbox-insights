import { DailyTheRundownAiParser } from "@/lib/parsers/daily-therundown-ai";

// Test cases for the new link filtering
const testCases = [
  // Should be filtered out (admin/rating links)
  {
    url: "https://link.mail.beehiiv.com/nailed-it",
    text: "⭐️⭐️⭐️⭐️⭐️ Nailed it",
    shouldSkip: true,
  },
  {
    url: "https://link.mail.beehiiv.com/average",
    text: "⭐️⭐️⭐️ Average",
    shouldSkip: true,
  },
  {
    url: "https://link.mail.beehiiv.com/fail",
    text: "⭐️ Fail",
    shouldSkip: true,
  },
  {
    url: "https://example.com/share",
    text: "Click to Share",
    shouldSkip: true,
  },
  {
    url: "https://link.mail.beehiiv.com/get-in-touch",
    text: "Get in touch",
    shouldSkip: true,
  },
  {
    url: "https://link.mail.beehiiv.com/check-out-ours-here",
    text: "Check out ours here",
    shouldSkip: true,
  },
  {
    url: "https://example.com/unsubscribe",
    text: "Unsubscribe",
    shouldSkip: true,
  },
  { url: "https://example.com/something", text: "here", shouldSkip: true }, // Too short
  { url: "https://example.com/something", text: "⭐️⭐️⭐️", shouldSkip: true }, // Just stars
  { url: "https://example.com/something", text: "   ", shouldSkip: true }, // Just whitespace
  { url: "https://example.com/something", text: "123", shouldSkip: true }, // Just numbers
  { url: "https://example.com/something", text: "a", shouldSkip: true }, // Single character
  { url: "https://example.com/something", text: "read", shouldSkip: true }, // Standalone generic word
  { url: "https://example.com/something", text: "more", shouldSkip: true }, // Standalone generic word

  // Should NOT be filtered out (content links)
  {
    url: "https://example.com/article",
    text: "Read the full article",
    shouldSkip: false,
  }, // Generic word with context
  {
    url: "https://example.com/details",
    text: "View more details",
    shouldSkip: false,
  }, // Generic word with context

  // Should NOT be filtered out (content links)
  {
    url: "https://techcrunch.com/article",
    text: "AI breakthrough announced",
    shouldSkip: false,
  },
  {
    url: "https://github.com/project",
    text: "Open source project",
    shouldSkip: false,
  },
  {
    url: "https://example.com/tool",
    text: "New AI tool released",
    shouldSkip: false,
  },
  {
    url: "https://link.mail.beehiiv.com/some-content",
    text: "Interesting article about AI",
    shouldSkip: false,
  },
];

function testLinkFiltering() {
  console.log("🧪 Testing Link Filtering Logic\n");
  console.log("=".repeat(80));

  const parser = new DailyTheRundownAiParser();
  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    // Access the public method for testing
    const shouldSkip = parser.shouldSkipLink(testCase.url, testCase.text);

    const result = shouldSkip === testCase.shouldSkip ? "✅ PASS" : "❌ FAIL";

    if (shouldSkip === testCase.shouldSkip) {
      passed++;
    } else {
      failed++;
    }

    console.log(`${index + 1}. ${result}`);
    console.log(`   Text: "${testCase.text}"`);
    console.log(`   URL: ${testCase.url}`);
    console.log(
      `   Expected: ${testCase.shouldSkip ? "SKIP" : "KEEP"}, Got: ${
        shouldSkip ? "SKIP" : "KEEP"
      }`
    );
    console.log();
  });

  console.log("=".repeat(80));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("🎉 All link filtering tests passed!");
  } else {
    console.log("⚠️  Some tests failed - check the filtering logic");
  }
}

testLinkFiltering();
