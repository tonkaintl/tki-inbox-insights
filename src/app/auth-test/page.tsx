"use client";

import { MSALWrapper } from "@/components/layout/MSALWrapper";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Alert, Box, Button, Card, Typography } from "@mui/joy";

function AuthTestContent() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h1" sx={{ mb: 3 }}>
        🔧 MSAL Authentication Test
      </Typography>

      <Card sx={{ p: 3, mb: 3 }}>
        <Typography level="h3" sx={{ mb: 2 }}>
          MSAL Status
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert color={instance ? "success" : "danger"}>
            <Typography level="body-sm">
              <strong>MSAL Instance:</strong>{" "}
              {instance ? "✅ Available" : "❌ Not Available"}
            </Typography>
          </Alert>

          <Alert color={isAuthenticated ? "success" : "warning"}>
            <Typography level="body-sm">
              <strong>Authentication Status:</strong>{" "}
              {isAuthenticated ? "✅ Authenticated" : "⚠️ Not Authenticated"}
            </Typography>
          </Alert>

          <Alert color={accounts.length > 0 ? "success" : "neutral"}>
            <Typography level="body-sm">
              <strong>Accounts:</strong> {accounts.length} account(s) available
            </Typography>
          </Alert>
        </Box>
      </Card>

      {accounts.length > 0 && (
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography level="h4" sx={{ mb: 2 }}>
            Account Details
          </Typography>
          {accounts.map((account, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Typography level="body-sm">
                <strong>Username:</strong> {account.username}
              </Typography>
              <Typography level="body-sm">
                <strong>Name:</strong> {account.name || "N/A"}
              </Typography>
            </Box>
          ))}
        </Card>
      )}

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button component="a" href="/" variant="outlined">
          ← Back to Home
        </Button>
        <Button onClick={() => window.location.reload()} variant="soft">
          🔄 Reload Test
        </Button>
      </Box>
    </Box>
  );
}

export default function AuthTestPage() {
  return (
    <MSALWrapper
      fallback={
        <Box sx={{ p: 3 }}>
          <Typography level="h1">Loading MSAL Test...</Typography>
        </Box>
      }
    >
      <AuthTestContent />
    </MSALWrapper>
  );
}
