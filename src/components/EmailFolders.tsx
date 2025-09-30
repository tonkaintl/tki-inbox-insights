"use client";

import { GraphService } from "@/lib/graphService";
import { useMsal } from "@azure/msal-react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  Typography,
} from "@mui/joy";
import { useEffect, useState } from "react";

interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

interface Message {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  webLink: string;
}

interface EmailFoldersProps {
  onFolderSelect?: (folderId: string, folderName: string) => void;
}

export default function EmailFolders({ onFolderSelect }: EmailFoldersProps) {
  const { instance, accounts } = useMsal();
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<MailFolder | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphService, setGraphService] = useState<GraphService | null>(null);

  // Initialize Graph Service
  useEffect(() => {
    const initializeGraphService = async () => {
      if (accounts.length > 0) {
        try {
          const accessToken = await GraphService.getAccessToken(
            instance,
            accounts[0]
          );
          const service = new GraphService(accessToken);
          setGraphService(service);
        } catch (error) {
          console.error("Failed to initialize Graph service:", error);
          setError("Failed to authenticate with Microsoft Graph");
        }
      }
    };

    initializeGraphService();
  }, [instance, accounts]);

  // Load root folders
  useEffect(() => {
    const loadFolders = async () => {
      if (!graphService) return;

      setLoading(true);
      setError(null);

      try {
        const rootFolders = await graphService.getMailFolders();
        setFolders(rootFolders);
      } catch (error) {
        console.error("Failed to load folders:", error);
        setError("Failed to load email folders");
      } finally {
        setLoading(false);
      }
    };

    loadFolders();
  }, [graphService]);

  const handleFolderClick = async (folder: MailFolder) => {
    if (!graphService) return;

    setLoading(true);
    setError(null);
    setCurrentFolder(folder);

    try {
      // Load messages from the selected folder
      const folderMessages = await graphService.getMessages(folder.id, 10);
      setMessages(folderMessages);

      // Notify parent component if callback provided
      if (onFolderSelect) {
        onFolderSelect(folder.id, folder.displayName);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      setError("Failed to load messages from folder");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToFolders = () => {
    setCurrentFolder(null);
    setMessages([]);
  };

  const handleSaveEmail = async (message: Message) => {
    try {
      const emailData = {
        ...message,
        folderName: currentFolder?.displayName,
        folderId: currentFolder?.id,
      };

      const response = await fetch("/api/save-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Email "${message.subject}" saved to MongoDB successfully!`);
      } else {
        alert(`Failed to save email: ${result.message}`);
      }
    } catch (error) {
      console.error("Error saving email:", error);
      alert("Error saving email to MongoDB");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!graphService) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size="sm" />
            <Typography>Connecting to your email account...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography level="h3" sx={{ mb: 1 }}>
            📧 Email Folders
          </Typography>

          {currentFolder && (
            <Breadcrumbs separator="›" sx={{ mb: 2 }}>
              <Link
                component="button"
                onClick={handleBackToFolders}
                sx={{ cursor: "pointer" }}
              >
                All Folders
              </Link>
              <Typography>{currentFolder.displayName}</Typography>
            </Breadcrumbs>
          )}
        </Box>

        {error && (
          <Alert color="danger" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : currentFolder ? (
          // Show messages from selected folder
          <Box>
            <Typography level="h4" sx={{ mb: 2 }}>
              Messages in {currentFolder.displayName} ({messages.length})
            </Typography>

            {messages.length === 0 ? (
              <Typography
                sx={{ textAlign: "center", py: 4, color: "text.secondary" }}
              >
                No messages found in this folder
              </Typography>
            ) : (
              <List>
                {messages.map((message) => (
                  <ListItem key={message.id}>
                    <Card variant="outlined" sx={{ width: "100%" }}>
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            mb: 1,
                          }}
                        >
                          <Typography
                            level="title-sm"
                            sx={{
                              fontWeight: message.isRead ? "normal" : "bold",
                            }}
                          >
                            {message.subject || "(No Subject)"}
                          </Typography>
                          <Typography
                            level="body-xs"
                            sx={{ color: "text.secondary" }}
                          >
                            {formatDate(message.receivedDateTime)}
                          </Typography>
                        </Box>

                        <Typography
                          level="body-sm"
                          sx={{ mb: 1, color: "text.secondary" }}
                        >
                          From:{" "}
                          {message.from?.emailAddress?.name ||
                            message.from?.emailAddress?.address}
                        </Typography>

                        <Typography
                          level="body-sm"
                          sx={{ color: "text.secondary", mb: 1 }}
                        >
                          {message.bodyPreview}
                        </Typography>

                        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                          {!message.isRead && (
                            <Chip size="sm" color="primary">
                              Unread
                            </Chip>
                          )}
                          <Button
                            size="sm"
                            variant="soft"
                            onClick={() =>
                              window.open(message.webLink, "_blank")
                            }
                          >
                            Open in Outlook
                          </Button>
                          <Button
                            size="sm"
                            variant="outlined"
                            color="success"
                            onClick={() => handleSaveEmail(message)}
                          >
                            Save to MongoDB
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        ) : (
          // Show folder list
          <List>
            {folders.map((folder) => (
              <ListItem key={folder.id}>
                <ListItemButton onClick={() => handleFolderClick(folder)}>
                  <ListItemContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography level="title-sm">
                        {folder.displayName}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {folder.unreadItemCount > 0 && (
                          <Chip size="sm" color="primary">
                            {folder.unreadItemCount} unread
                          </Chip>
                        )}
                        <Chip size="sm" variant="soft">
                          {folder.totalItemCount} total
                        </Chip>
                      </Box>
                    </Box>
                  </ListItemContent>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
