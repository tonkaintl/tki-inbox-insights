"use client";

import EmailFolders from "@/components/email/EmailFolders";
import ProcessFolderButton from "@/components/ProcessFolderButton";
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
import { useState } from "react";

export default function Home() {
  const { instance, accounts } = useMsal();
  const [selectedFolder, setSelectedFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);

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
              <Button variant="outlined" onClick={handleLogout}>
                Sign Out
              </Button>
            </Box>

            {selectedFolder && selectedFolder.name !== "All Folders" && (
              <ProcessFolderButton
                folderId={selectedFolder.id}
                folderName={selectedFolder.name}
              />
            )}

            <Box sx={{ mt: 4 }}>
              <EmailFolders
                onFolderSelect={(folderId: string, folderName: string) => {
                  console.log(`Selected folder: ${folderName} (${folderId})`);

                  // Reset selected folder when going back to "All Folders"
                  if (folderName === "All Folders" || folderId === "") {
                    setSelectedFolder(null);
                  } else {
                    setSelectedFolder({ id: folderId, name: folderName });
                  }
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
}
