# TKI Inbox Insights

A newsletter processing application that connects to Office 365 business accounts, reads email messages from selected folders, and parses newsletter content using dedicated parsers for structured data extraction.

## 🚀 Features

- **Office 365 Integration**: MSAL authentication for business email access
- **Email Folder Browsing**: Select and process specific email folders
- **Newsletter Parsing**: Dedicated parsers for different newsletter formats
- **EML File Processing**: Direct parsing of saved .eml files
- **MongoDB Storage**: Structured data storage for parsed newsletters
- **Link Categorization**: Automatic categorization and extraction of newsletter links

## 🛠️ Tech Stack

- **Frontend**: Next.js 15+ with TypeScript + Joy UI
- **Authentication**: MSAL for Office 365
- **Database**: MongoDB Atlas
- **Parsing**: Cheerio for HTML content extraction
- **Deployment**: Azure App Service

## 🏗️ Project Structure

```
tki-inbox-insights/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── parse-eml/        # EML file parsing endpoint
│   │   │   ├── parse-newsletter/ # Newsletter parsing endpoint
│   │   │   └── save-email/       # Email storage endpoint
│   │   └── page.tsx              # Main application page
│   ├── components/
│   │   ├── EmailFolders.tsx      # Email folder browser
│   │   └── Providers.tsx         # MSAL and Joy UI providers
│   └── lib/
│       ├── parsers/
│       │   ├── index.ts          # ParserFactory (main entry point)
│       │   └── daily-therundown-ai.ts # Newsletter-specific parser
│       ├── authConfig.ts         # MSAL configuration
│       ├── eml-parser.ts         # EML file parsing utilities
│       ├── graphService.ts       # Microsoft Graph API service
│       ├── mongodb.ts            # MongoDB connection
│       └── newsletter-types.ts   # TypeScript interfaces
└── src/raw-email-source/         # Directory for .eml files
```

## � Newsletter Parser Development Process

### Adding a New Newsletter Parser

1. **Save EML File**: Export newsletter as .eml from Outlook and save to `src/raw-email-source/`

2. **Create Parser**: Create new parser in `src/lib/parsers/newsletter-name.ts`:

   ```typescript
   export class NewsletterNameParser implements NewsletterParser {
     name = "newsletter-name";
     version = "1.0.0";

     canParse(fromAddress: string): boolean {
       return fromAddress.includes("newsletter@example.com");
     }

     parse(html: string, emailMetadata: EmailMetadata): ParsedNewsletter {
       // Implementation with Cheerio HTML parsing
     }
   }
   ```

3. **Register Parser**: Add to `src/lib/parsers/index.ts`:

   ```typescript
   import { NewsletterNameParser } from "./newsletter-name";

   const parsers: NewsletterParser[] = [
     new DailyTheRundownAiParser(),
     new NewsletterNameParser(), // Add here
   ];
   ```

4. **Test Parser**: Use `/api/parse-eml` endpoint with EML file path

### EML File Processing Workflow

1. **Web Interface**: Browse Office 365 folders → Select emails → Parse newsletters
2. **Direct EML**: Save .eml files → Use parse-eml API → Extract structured data
3. **Storage**: Parsed newsletters saved to MongoDB with sections and links

## 🗄️ Database Structure

### MongoDB Collections

#### `emails` Collection

```typescript
{
  _id: ObjectId,
  messageId: string,           // Original email message ID
  from: string,                // Sender email address
  subject: string,             // Email subject line
  receivedDateTime: string,    // ISO date string
  bodyPreview: string,         // Email preview text
  htmlContent?: string,        // Full HTML content (if retrieved)
  folderId: string,           // Office 365 folder ID
  isProcessed: boolean,       // Processing status
  createdAt: Date,
  updatedAt: Date
}
```

#### `parsed_newsletters` Collection

```typescript
{
  _id: ObjectId,
  id: string,                  // Unique parsed newsletter ID
  emailId: string,             // Reference to original email
  sender: string,              // Newsletter sender
  subject: string,             // Email subject
  date: string,                // Publication date
  parserUsed: string,          // Parser name (e.g., "daily-therundown-ai")
  sections: NewsletterSection[], // Structured content sections
  links: ExtractedLink[],      // All extracted links with categories
  parsedAt: Date,              // Processing timestamp
  version: string              // Parser version used
}
```

#### Newsletter Section Structure

```typescript
interface NewsletterSection {
  type: string; // e.g., "greeting", "latest-developments"
  title: string; // Section title
  content: string; // Cleaned text content (emojis removed)
  order: number; // Display order
}
```

#### Extracted Link Structure

```typescript
interface ExtractedLink {
  url: string; // Full URL
  text: string; // Link text
  section: string; // Which section it came from
  category: LinkCategoryType; // "news", "product", "social", etc.
}
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account
- Office 365 business account
- Azure App Registration for MSAL

### Local Development

1. **Clone and install**:

   ```bash
   git clone <repo-url>
   cd tki-inbox-insights
   npm install
   ```

2. **Environment variables** (`.env.local`):

   ```bash
   MONGODB_URI=mongodb+srv://...
   AZURE_AD_CLIENT_ID=your-client-id
   AZURE_AD_CLIENT_SECRET=your-client-secret
   AZURE_AD_TENANT_ID=your-tenant-id
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## � Key Features Explained

### Newsletter Parser Architecture

- **Factory Pattern**: `ParserFactory` automatically selects correct parser based on sender email
- **Emoji Cleaning**: All parsers remove emojis and normalize text for reliable data processing
- **Table-Based Parsing**: Handles complex HTML newsletter layouts with nested tables
- **Section Detection**: Identifies newsletter sections like "Latest Developments", "Quick Hits", etc.
- **Link Extraction**: Categorizes all links with context about their source section

### Email Processing Flow

1. **Authentication**: MSAL login to Office 365 business account
2. **Folder Selection**: Browse and select email folders via Microsoft Graph API
3. **Email Retrieval**: Fetch emails with `getFullMessage()` for complete HTML content
4. **Parser Selection**: Factory pattern matches sender to appropriate parser
5. **Content Extraction**: Cheerio-based HTML parsing with section identification
6. **Data Storage**: Structured newsletter data saved to MongoDB
7. **Link Analysis**: URLs categorized by type (news, product, social, etc.)

## 🔒 Security & Configuration

- **MSAL Authentication**: Secure Office 365 integration with proper scopes
- **Environment Variables**: All secrets in `.env.local` (development) or Azure App Settings (production)
- **MongoDB Atlas**: Database connection with connection string authentication
- **Public Repository**: No sensitive data committed to version control

## 🚀 Deployment

- **Platform**: Azure App Service with Node.js runtime
- **Database**: MongoDB Atlas (cloud-hosted)
- **CI/CD**: Manual deployment or GitHub Actions
- **Environment**: Production settings via Azure App Settings

## 📝 Development Notes

- **Monorepo Structure**: All functionality in single Next.js application
- **TypeScript**: Full type safety with comprehensive interfaces
- **Error Handling**: Graceful failures with detailed logging
- **Extensible Design**: Easy to add new newsletter parsers following established patterns
- **Azure App Service**: Hosts the Next.js application
- **Azure Functions**: Hosts Python microservices

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT License - see LICENSE file for details
