<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Status

- [x] Verify that the copilot-instructions.md file in the .github directory is created. ✓ Created
- [x] Clarify Project Requirements ✓ Next.js + TypeScript + Joy UI + Python Functions
- [x] Scaffold the Project ✓ Next.js 14+ with TypeScript, ESLint, App Router, src directory
- [x] Customize the Project ✓ Added Joy UI, MSAL auth, Python Functions structure
- [x] Install Required Extensions ✓ No additional extensions needed
- [x] Compile the Project ✓ Built successfully with Next.js 15.5.4
- [x] Create and Run Task ✓ Development server running at http://localhost:3000
- [x] Launch the Project ✓ Ready for development
- [x] Ensure Documentation is Complete ✓ README and instructions updated

## Project: TKI Inbox Insights

**Description**: Office 365 newsletter processing application with MSAL authentication, Next.js + TypeScript frontend with Joy UI, and Python Azure Functions for email analysis.

**Tech Stack**:

- Frontend: Next.js 14+ with TypeScript
- UI: Joy UI (MUI's modern design system)
- Authentication: MSAL for Office 365
- Backend: Python Azure Functions for email processing
- Deployment: Azure App Service + Azure Functions
- CI/CD: GitHub Actions with dev->main workflow

**Key Features**:

- Office 365 email folder browsing
- Newsletter content analysis and deduplication
- Tutorial environment setup detection
- Vendor/advertiser link categorization
- Content export and organization

**Development Notes**:

- Monorepo structure for Next.js + Python Functions
- Public GitHub repo with private Azure deployment
- Environment variables secured in Azure App Settings
- Dev branch workflow with PR-triggered deployments
