interface ParsedEmail {
  from?: string;
  subject?: string;
  date?: string;
  html?: string;
  text?: string;
}

export function parseEml(emlContent: string): ParsedEmail {
  const lines = emlContent.split("\n");
  const result: ParsedEmail = {};

  let currentSection = "headers";
  let htmlContent = "";
  let inHtmlSection = false;
  let boundaryPattern = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse headers
    if (currentSection === "headers") {
      if (line.startsWith("From:")) {
        const match = line.match(
          /From:\s*(?:"?([^"]*)"?\s*<([^>]*)>|([^<\s]*@[^>\s]*))/
        );
        if (match) {
          result.from = match[2] || match[3] || match[1];
        }
      } else if (line.startsWith("Subject:")) {
        result.subject = decodeSubject(line.replace("Subject:", "").trim());
      } else if (line.startsWith("Date:")) {
        result.date = line.replace("Date:", "").trim();
      } else if (line.includes("boundary=")) {
        const boundaryMatch = line.match(/boundary=([^;\s]+)/);
        if (boundaryMatch) {
          boundaryPattern = boundaryMatch[1].replace(/"/g, "");
        }
      }

      // Empty line indicates end of headers
      if (line.trim() === "") {
        currentSection = "body";
      }
    }

    // Look for HTML content section
    if (line.includes("Content-Type: text/html")) {
      inHtmlSection = true;
      // Skip the next few lines (usually encoding info)
      continue;
    }

    // Check for boundary markers
    if (boundaryPattern && line.includes(boundaryPattern)) {
      inHtmlSection = false;
      if (htmlContent) {
        // We've collected HTML content, process it
        break;
      }
      continue;
    }

    // Collect HTML content
    if (inHtmlSection && line.trim() !== "" && !line.startsWith("Content-")) {
      htmlContent += line + "\n";
    }
  }

  if (htmlContent) {
    // Decode quoted-printable encoding
    result.html = decodeQuotedPrintable(htmlContent);
  }

  return result;
}

function decodeSubject(subject: string): string {
  // Handle UTF-8 encoded subjects like =?UTF-8?B?8J+OrA==?=
  return subject.replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_, base64) => {
    try {
      return Buffer.from(base64, "base64").toString("utf-8");
    } catch {
      return subject;
    }
  });
}

function decodeQuotedPrintable(input: string): string {
  return (
    input
      // Decode =XX hex sequences
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      // Handle soft line breaks (= at end of line)
      .replace(/=\r?\n/g, "")
      // Decode =3D sequences (= signs)
      .replace(/=3D/g, "=")
      // Clean up any remaining encoding artifacts
      .replace(/=\r?\n/g, "")
  );
}
