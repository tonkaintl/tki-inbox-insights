"use client";

import { loginRequest } from "@/lib/authConfig";
import { useMsal } from "@azure/msal-react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
} from "@mui/joy";

export default function Home() {
  const { instance, accounts } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => {
    instance.logoutPopup();
  };

  const isAuthenticated = accounts.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography level="h1" sx={{ mb: 2 }}>
          TKI Inbox Insights
        </Typography>
        <Typography level="body-lg" sx={{ mb: 4, color: "text.secondary" }}>
          Smart newsletter processing for your Office 365 account
        </Typography>

        {!isAuthenticated ? (
          <Card sx={{ maxWidth: 400, mx: "auto" }}>
            <CardContent>
              <Typography level="h3" sx={{ mb: 2 }}>
                Get Started
              </Typography>
              <Typography sx={{ mb: 3 }}>
                Connect your Office 365 account to start analyzing your
                newsletters
              </Typography>
              <Button onClick={handleLogin} size="lg" fullWidth>
                Sign in with Microsoft
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Box>
            <Typography level="h3" sx={{ mb: 2 }}>
              Welcome, {accounts[0].name}!
            </Typography>
            <Box
              sx={{ display: "flex", gap: 2, justifyContent: "center", mb: 4 }}
            >
              <Button variant="outlined">Browse Email Folders</Button>
              <Button variant="outlined">View Analytics</Button>
              <Button variant="outlined" onClick={handleLogout}>
                Sign Out
              </Button>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 3,
              }}
            >
              <Card>
                <CardContent>
                  <Typography level="h4" sx={{ mb: 1 }}>
                    📧 Email Analysis
                  </Typography>
                  <Typography>
                    Analyze newsletter content and extract valuable insights
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography level="h4" sx={{ mb: 1 }}>
                    🔍 Content Deduplication
                  </Typography>
                  <Typography>
                    Identify and organize repeated content across newsletters
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography level="h4" sx={{ mb: 1 }}>
                    🚀 Tutorial Detection
                  </Typography>
                  <Typography>
                    Automatically find and categorize development tutorials
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography level="h4" sx={{ mb: 1 }}>
                    🏢 Vendor Intelligence
                  </Typography>
                  <Typography>
                    Track service providers and business opportunities
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
}
