"use client";

import { formatDateConsistently } from "@/lib/utils/email-utils";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Link,
  Table,
  Typography,
} from "@mui/joy";
import { useEffect, useState } from "react";

interface ParsedNewsletter {
  _id: string;
  subject: string;
  sender: string;
  date: string;
  parser_used: string;
  links: Array<{
    url: string;
    text: string;
    section: string;
    category: string;
  }>;
  parsed_at: string;
}

interface NewsletterDetailsProps {
  emailId: string;
}

export function NewsletterDetails({ emailId }: NewsletterDetailsProps) {
  const [newsletter, setNewsletter] = useState<ParsedNewsletter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNewsletter = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/results/${emailId}`);
        if (!response.ok) {
          throw new Error("Newsletter not found");
        }
        const data = await response.json();
        setNewsletter(data.newsletter);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchNewsletter();
  }, [emailId]);

  const retryFetch = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/results/${emailId}`);
      if (!response.ok) {
        throw new Error("Newsletter not found");
      }
      const data = await response.json();
      setNewsletter(data.newsletter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress size="lg" />
        <Typography sx={{ ml: 2 }}>Loading newsletter...</Typography>
      </Box>
    );
  }

  if (error || !newsletter) {
    return (
      <Alert color="danger" sx={{ mb: 3 }}>
        <Typography level="title-md" sx={{ mb: 1 }}>
          {error === "Newsletter not found"
            ? "Newsletter Not Found"
            : "Error Loading Newsletter"}
        </Typography>
        <Typography level="body-sm" sx={{ mb: 2 }}>
          {error === "Newsletter not found"
            ? `No newsletter found with ID: ${emailId}. It may not have been processed yet.`
            : error ||
              "An unknown error occurred while loading the newsletter."}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="sm" onClick={retryFetch}>
            Retry
          </Button>
          <Button size="sm" variant="soft" component="a" href="/results">
            ← Back to Results
          </Button>
        </Box>
      </Alert>
    );
  }

  // Group links by category
  const linksByCategory = newsletter.links.reduce((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, typeof newsletter.links>);

  return (
    <Box>
      {/* Newsletter Header */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Typography level="h2" sx={{ mb: 2 }}>
          {newsletter.subject}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <Chip variant="soft" size="sm">
            📧 {newsletter.sender}
          </Chip>
          <Chip variant="soft" size="sm">
            📅 {formatDateConsistently(newsletter.date)}
          </Chip>
          <Chip variant="soft" size="sm">
            🔧 {newsletter.parser_used}
          </Chip>
          <Chip variant="soft" size="sm">
            🔗 {newsletter.links.length} links
          </Chip>
        </Box>
      </Card>

      {/* Links by Category */}
      {Object.entries(linksByCategory).map(([category, links]) => (
        <Card key={category} sx={{ mb: 3, p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography level="h3" sx={{ mr: 2 }}>
              {category.toUpperCase()}
            </Typography>
            <Chip size="sm" variant="outlined">
              {links.length} links
            </Chip>
          </Box>

          <Table>
            <thead>
              <tr>
                <th>Link</th>
                <th>Section</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link, index) => (
                <tr key={index}>
                  <td>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      {link.text}
                    </Typography>
                  </td>
                  <td>
                    <Chip size="sm" variant="soft">
                      {link.section}
                    </Chip>
                  </td>
                  <td>
                    <Link
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        maxWidth: "300px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Typography level="body-sm">
                        {new URL(link.url).hostname}
                      </Typography>
                      <Typography level="body-sm">↗</Typography>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ))}

      {newsletter.links.length === 0 && (
        <Alert color="warning">
          <Typography>No links found in this newsletter.</Typography>
        </Alert>
      )}
    </Box>
  );
}

export default NewsletterDetails;
