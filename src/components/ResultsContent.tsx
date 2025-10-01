"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
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

export function ResultsContent() {
  const [newsletters, setNewsletters] = useState<ParsedNewsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/results");
      if (!response.ok) {
        throw new Error("Failed to fetch results");
      }
      const data = await response.json();
      setNewsletters(data.newsletters || []);
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
        <Typography sx={{ ml: 2 }}>Loading results...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert color="danger" sx={{ mb: 3 }}>
        <Typography>Error: {error}</Typography>
        <Button size="sm" onClick={fetchResults} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const totalLinks = newsletters.reduce(
    (sum, newsletter) => sum + newsletter.links.length,
    0
  );
  const categoryStats = newsletters.reduce((stats, newsletter) => {
    newsletter.links.forEach((link) => {
      stats[link.category] = (stats[link.category] || 0) + 1;
    });
    return stats;
  }, {} as Record<string, number>);

  return (
    <Box>
      {/* Summary Stats */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Typography level="h3" sx={{ mb: 2 }}>
          📈 Summary
        </Typography>
        <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <Box>
            <Typography level="title-lg">{newsletters.length}</Typography>
            <Typography level="body-sm">Newsletters Processed</Typography>
          </Box>
          <Box>
            <Typography level="title-lg">{totalLinks}</Typography>
            <Typography level="body-sm">Total Links Extracted</Typography>
          </Box>
          <Box>
            <Typography level="title-lg">
              {Object.keys(categoryStats).length}
            </Typography>
            <Typography level="body-sm">Link Categories</Typography>
          </Box>
        </Box>
      </Card>

      {/* Category Breakdown */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Typography level="h3" sx={{ mb: 2 }}>
          🏷️ Link Categories
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {Object.entries(categoryStats).map(([category, count]) => (
            <Chip key={category} variant="soft" size="lg">
              {category}: {count}
            </Chip>
          ))}
        </Box>
      </Card>

      {/* Newsletters List */}
      <Card sx={{ p: 3 }}>
        <Typography level="h3" sx={{ mb: 2 }}>
          📧 Processed Newsletters
        </Typography>

        {newsletters.length === 0 ? (
          <Typography level="body-lg" sx={{ textAlign: "center", p: 4 }}>
            No newsletters found. Try processing some emails first.
          </Typography>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Sender</th>
                <th>Date</th>
                <th>Parser</th>
                <th>Links</th>
                <th>Processed</th>
              </tr>
            </thead>
            <tbody>
              {newsletters.map((newsletter) => (
                <tr key={newsletter._id}>
                  <td>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      {newsletter.subject}
                    </Typography>
                  </td>
                  <td>
                    <Typography level="body-sm">{newsletter.sender}</Typography>
                  </td>
                  <td>
                    <Typography level="body-sm">
                      {new Date(newsletter.date).toLocaleDateString()}
                    </Typography>
                  </td>
                  <td>
                    <Chip size="sm" variant="soft">
                      {newsletter.parser_used}
                    </Chip>
                  </td>
                  <td>
                    <Typography level="body-sm">
                      {newsletter.links.length}
                    </Typography>
                  </td>
                  <td>
                    <Typography level="body-sm">
                      {new Date(newsletter.parsed_at).toLocaleString()}
                    </Typography>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </Box>
  );
}
