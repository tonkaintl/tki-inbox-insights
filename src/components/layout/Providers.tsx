"use client";

import { msalConfig } from "@/lib/authConfig";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL and handle redirects
msalInstance.initialize().then(() => {
  // Handle redirect promise on page load
  msalInstance.handleRedirectPromise().catch((error) => {
    console.error("Redirect promise error:", error);
  });
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <CssVarsProvider>
        <CssBaseline />
        {children}
      </CssVarsProvider>
    </MsalProvider>
  );
}
