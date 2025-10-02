"use client";

import { msalConfig } from "@/lib/authConfig";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import { useEffect, useState } from "react";

const loadingStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  fontSize: "18px",
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [msalInstance, setMsalInstance] =
    useState<PublicClientApplication | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only initialize MSAL on client side
    if (typeof window !== "undefined") {
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
            setIsInitialized(true);
          })
          .catch((error) => {
            console.error("MSAL initialization error:", error);
            setIsInitialized(true); // Still set initialized to show content
          });
      } catch (error) {
        console.error("MSAL creation error:", error);
        setIsInitialized(true);
      }
    }
  }, []);

  // Show loading state until MSAL is initialized
  if (!isInitialized) {
    return (
      <CssVarsProvider>
        <CssBaseline />
        <div style={loadingStyle}>
          Loading authentication...
        </div>
      </CssVarsProvider>
    );
  }

  // Render with or without MSAL provider based on initialization success
  if (msalInstance) {
    return (
      <MsalProvider instance={msalInstance}>
        <CssVarsProvider>
          <CssBaseline />
          {children}
        </CssVarsProvider>
      </MsalProvider>
    );
  }

  // Fallback if MSAL failed to initialize
  return (
    <CssVarsProvider>
      <CssBaseline />
      {children}
    </CssVarsProvider>
  );
}
