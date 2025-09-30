# TKI Inbox Insights

A powerful Office 365 newsletter processing application that helps you organize, analyze, and extract valuable content from your email newsletters.

## 🚀 Features

- **Office 365 Integration**: Secure MSAL authentication for business accounts
- **Smart Email Analysis**: AI-powered content categorization and deduplication
- **Tutorial Detection**: Automatically identify and organize development tutorials
- **Vendor Intelligence**: Track and categorize service provider links
- **Environment Setup**: One-click tutorial environment preparation
- **Export Options**: Multiple formats for processed data

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ with TypeScript
- **UI Framework**: Joy UI (MUI's modern design system)
- **Authentication**: MSAL for Office 365
- **Backend**: Python Azure Functions
- **Deployment**: Azure App Service + Azure Functions
- **CI/CD**: GitHub Actions

## 🏗️ Project Structure

```
tki-inbox-insights/
├── src/                    # Next.js application
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   └── lib/              # Utilities and configuration
├── python-functions/      # Azure Functions (Python)
│   ├── email-analyzer/   # Email content analysis
│   ├── content-processor/ # Content deduplication
│   └── environment-setup/ # Tutorial environment tools
├── .github/              # GitHub Actions workflows
└── docs/                 # Documentation
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Azure account (for deployment)
- Office 365 business account

### Local Development

1. **Clone and install dependencies**:

   ```bash
   git clone <your-repo-url>
   cd tki-inbox-insights
   npm install
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Azure App Registration details
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Start Python Functions** (optional for full functionality):

   ```bash
   cd python-functions
   pip install -r requirements.txt
   func start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Azure Setup

1. Create an Azure App Registration for Office 365 access
2. Configure redirect URIs for your domain
3. Set up Azure App Service and Functions
4. Configure environment variables in Azure App Settings

## 🔒 Security

- All sensitive configuration stored in Azure App Settings
- MSAL handles secure Office 365 authentication
- Client ID is public (by MSAL design)
- No secrets committed to public repository

## 🚀 Deployment

The project uses GitHub Actions for CI/CD:

- **Dev branch**: Continuous development
- **Main branch**: Production deployment triggered by PR merge
- **Azure App Service**: Hosts the Next.js application
- **Azure Functions**: Hosts Python microservices

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT License - see LICENSE file for details
