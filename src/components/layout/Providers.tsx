"use client";

import { msalConfig } from "@/lib/authConfig";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import { useEffect, useState } from "react";

const loadingStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  fontSize: "18px",
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  const [msalInstance, setMsalInstance] =
    useState<PublicClientApplication | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted first
    setIsMounted(true);

    // Then initialize MSAL
    try {
      const instance = new PublicClientApplication(msalConfig);

      instance
        .initialize()
        .then(() => {
          // Handle redirect promise on page load
          return instance.handleRedirectPromise();
        })
        .then(() => {
          setMsalInstance(instance);
        })
        .catch((error) => {
          console.error("MSAL initialization error:", error);
        });
    } catch (error) {
      console.error("MSAL creation error:", error);
    }
  }, []);

  // During SSR and initial client render, always show children to avoid hydration mismatch
  // Only show loading after component has mounted on client
  const content = !isMounted ? (
    children // Always render children during SSR and initial hydration
  ) : !msalInstance ? (
    <div style={loadingStyle}>Loading authentication...</div>
  ) : (
    children
  );

  // Always render with consistent structure
  return (
    <CssVarsProvider>
      <CssBaseline />
      {msalInstance ? (
        <MsalProvider instance={msalInstance}>{content}</MsalProvider>
      ) : (
        content
      )}
    </CssVarsProvider>
  );
}
