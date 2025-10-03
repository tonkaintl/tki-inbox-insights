"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  FormLabel,
  IconButton,
  Link,
  Option,
  Select,
  Sheet,
  Table,
  Typography,
} from "@mui/joy";
import Cookies from "js-cookie";
import { useCallback, useEffect, useMemo, useState } from "react";
import NotesModal from "./NotesModal";

interface CuratedLink {
  id: string;
  text: string;
  url: string;
  domain: string;
  resolved_url?: string;
  category: string;
  section: string;
  count: number;
  newsletters: string[];
  reviewed: boolean;
  flagged: boolean;
  notes?: string;
  first_seen: string;
  last_seen: string;
}

interface CuratedLinksData {
  links: CuratedLink[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
  stats: {
    totalLinks: number;
    totalOccurrences: number;
    reviewedCount: number;
    flaggedCount: number;
    uniqueDomainsCount: number;
  };
}

export default function CuratedLinksContent() {
  const [data, setData] = useState<CuratedLinksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [showReviewed, setShowReviewed] = useState<string>("all");
  const [showFlagged, setShowFlagged] = useState<string>("all");
  const [domains, setDomains] = useState<string[]>([]);

  // Accordion state management with cookie persistence
  const [expandedDomain, setExpandedDomain] = useState<string | null>(() => {
    return Cookies.get("expanded-domain") || null;
  });

  // Notes modal state - simplified
  const [notesModal, setNotesModal] = useState<{
    open: boolean;
    linkId: string;
    initialNotes: string;
  }>({
    open: false,
    linkId: "",
    initialNotes: "",
  });

  // Loading states for individual actions
  const [loadingActions, setLoadingActions] = useState<{
    [linkId: string]: {
      reviewed?: boolean;
      flagged?: boolean;
      notes?: boolean;
    };
  }>({});

  // Handle notes modal close
  const handleNotesModalClose = useCallback(() => {
    setNotesModal({ open: false, linkId: "", initialNotes: "" });
  }, []);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const domainParam = urlParams.get("domain");
    const reviewedParam = urlParams.get("reviewed");
    const flaggedParam = urlParams.get("flagged");

    if (domainParam && domainParam !== "all") {
      setSelectedDomain(domainParam);
    }
    if (reviewedParam) {
      setShowReviewed(reviewedParam);
    }
    if (flaggedParam) {
      setShowFlagged(flaggedParam);
    }
  }, []);

  // Update URL when filters change - memoized to prevent re-renders
  const updateUrlParams = useCallback(
    (domain: string, reviewed: string, flagged: string) => {
      const url = new URL(window.location.href);

      if (domain === "all") {
        url.searchParams.delete("domain");
      } else {
        url.searchParams.set("domain", domain);
      }

      if (reviewed === "all") {
        url.searchParams.delete("reviewed");
      } else {
        url.searchParams.set("reviewed", reviewed);
      }

      if (flagged === "all") {
        url.searchParams.delete("flagged");
      } else {
        url.searchParams.set("flagged", flagged);
      }

      window.history.replaceState({}, "", url.toString());
    },
    []
  );

  // Create a stable fetch function that doesn't change on every render
  const fetchCuratedLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedDomain !== "all") {
        params.set("domain", selectedDomain);
      }
      if (showReviewed !== "all") {
        params.set("reviewed", showReviewed);
      }
      if (showFlagged !== "all") {
        params.set("flagged", showFlagged);
      }

      params.set("limit", "200"); // Get more links for now
      params.set("sortBy", "last_seen");
      params.set("sortOrder", "desc");

      const response = await fetch(`/api/curated-links?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);

        // Extract unique domains for filter dropdown
        const uniqueDomains = [
          ...new Set(result.data.links.map((link: CuratedLink) => link.domain)),
        ].sort() as string[];
        setDomains(uniqueDomains);

        setError(null);
      } else {
        setError(result.error || "Failed to fetch curated links");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedDomain, showReviewed, showFlagged]);

  // Handle initial load and filter changes
  useEffect(() => {
    fetchCuratedLinks();
  }, [selectedDomain, showReviewed, showFlagged, fetchCuratedLinks]);

  // Update URL params separately to avoid conflicts
  useEffect(() => {
    updateUrlParams(selectedDomain, showReviewed, showFlagged);
  }, [selectedDomain, showReviewed, showFlagged, updateUrlParams]);

  // Scroll to expanded accordion panel after data loads
  useEffect(() => {
    if (!loading && data && expandedDomain) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        const accordionElement = document.querySelector(
          `[data-domain="${expandedDomain}"]`
        );
        if (accordionElement) {
          accordionElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [loading, data, expandedDomain]);

  const handleRefresh = () => {
    fetchCuratedLinks();
  };

  // Toggle functions with optimistic updates
  const toggleReviewed = async (linkId: string, currentStatus: boolean) => {
    // Set loading state
    setLoadingActions((prev) => ({
      ...prev,
      [linkId]: { ...prev[linkId], reviewed: true },
    }));

    // Optimistic update
    if (data) {
      setData((prevData) => ({
        ...prevData!,
        links: prevData!.links.map((link) =>
          link.id === linkId ? { ...link, reviewed: !currentStatus } : link
        ),
        stats: {
          ...prevData!.stats,
          reviewedCount:
            prevData!.stats.reviewedCount + (currentStatus ? -1 : 1),
        },
      }));
    }

    try {
      const response = await fetch(`/api/curated-links/${linkId}/reviewed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed: !currentStatus }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        if (data) {
          setData((prevData) => ({
            ...prevData!,
            links: prevData!.links.map((link) =>
              link.id === linkId ? { ...link, reviewed: currentStatus } : link
            ),
            stats: {
              ...prevData!.stats,
              reviewedCount:
                prevData!.stats.reviewedCount + (currentStatus ? 1 : -1),
            },
          }));
        }
        throw new Error("Failed to update reviewed status");
      }
    } catch (error) {
      console.error("Error toggling reviewed status:", error);
    } finally {
      // Clear loading state
      setLoadingActions((prev) => {
        const newState = { ...prev };
        if (newState[linkId]) {
          delete newState[linkId].reviewed;
          if (Object.keys(newState[linkId]).length === 0) {
            delete newState[linkId];
          }
        }
        return newState;
      });
    }
  };

  const toggleFlagged = async (linkId: string, currentStatus: boolean) => {
    // Set loading state
    setLoadingActions((prev) => ({
      ...prev,
      [linkId]: { ...prev[linkId], flagged: true },
    }));

    // Optimistic update
    if (data) {
      setData((prevData) => ({
        ...prevData!,
        links: prevData!.links.map((link) =>
          link.id === linkId ? { ...link, flagged: !currentStatus } : link
        ),
        stats: {
          ...prevData!.stats,
          flaggedCount: prevData!.stats.flaggedCount + (currentStatus ? -1 : 1),
        },
      }));
    }

    try {
      const response = await fetch(`/api/curated-links/${linkId}/flagged`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: !currentStatus }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        if (data) {
          setData((prevData) => ({
            ...prevData!,
            links: prevData!.links.map((link) =>
              link.id === linkId ? { ...link, flagged: currentStatus } : link
            ),
            stats: {
              ...prevData!.stats,
              flaggedCount:
                prevData!.stats.flaggedCount + (currentStatus ? 1 : -1),
            },
          }));
        }
        throw new Error("Failed to update flagged status");
      }
    } catch (error) {
      console.error("Error toggling flagged status:", error);
    } finally {
      // Clear loading state
      setLoadingActions((prev) => {
        const newState = { ...prev };
        if (newState[linkId]) {
          delete newState[linkId].flagged;
          if (Object.keys(newState[linkId]).length === 0) {
            delete newState[linkId];
          }
        }
        return newState;
      });
    }
  };

  const saveNotes = useCallback(
    async (linkId: string, notes: string) => {
      // Set loading state
      setLoadingActions((prev) => ({
        ...prev,
        [linkId]: { ...prev[linkId], notes: true },
      }));

      // Get original notes from current data at time of execution
      let originalNotes: string | undefined;
      setData((prevData) => {
        if (prevData) {
          originalNotes = prevData.links.find(
            (link) => link.id === linkId
          )?.notes;
          // Optimistic update
          return {
            ...prevData,
            links: prevData.links.map((link) =>
              link.id === linkId ? { ...link, notes: notes || undefined } : link
            ),
          };
        }
        return prevData;
      });

      try {
        const response = await fetch(`/api/curated-links/${linkId}/notes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notes || undefined }),
        });

        if (response.ok) {
          setNotesModal({ open: false, linkId: "", initialNotes: "" });
        } else {
          // Revert optimistic update on error
          setData((prevData) => {
            if (prevData) {
              return {
                ...prevData,
                links: prevData.links.map((link) =>
                  link.id === linkId ? { ...link, notes: originalNotes } : link
                ),
              };
            }
            return prevData;
          });
          throw new Error("Failed to save notes");
        }
      } catch (error) {
        console.error("Error saving notes:", error);
      } finally {
        // Clear loading state
        setLoadingActions((prev) => {
          const newState = { ...prev };
          if (newState[linkId]) {
            delete newState[linkId].notes;
            if (Object.keys(newState[linkId]).length === 0) {
              delete newState[linkId];
            }
          }
          return newState;
        });
      }
    },
    [] // No dependencies to prevent recreation
  );

  // Handle accordion expand/collapse with cookie persistence
  const handleAccordionToggle = useCallback(
    (domain: string) => {
      const newExpandedDomain = expandedDomain === domain ? null : domain;
      setExpandedDomain(newExpandedDomain);

      if (newExpandedDomain) {
        Cookies.set("expanded-domain", newExpandedDomain, { expires: 30 }); // 30 days
      } else {
        Cookies.remove("expanded-domain");
      }
    },
    [expandedDomain]
  );

  // Group links by domain - memoized for performance
  const linksByDomain = useMemo(() => {
    return (
      data?.links.reduce((acc, link) => {
        if (!acc[link.domain]) {
          acc[link.domain] = [];
        }
        acc[link.domain].push(link);
        return acc;
      }, {} as Record<string, CuratedLink[]>) || {}
    );
  }, [data?.links]);

  return (
    <Box>
      {/* Controls - Always visible */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Box
          sx={{ display: "flex", gap: 3, alignItems: "end", flexWrap: "wrap" }}
        >
          <FormControl sx={{ minWidth: 200 }}>
            <FormLabel>Domain</FormLabel>
            <Select
              value={selectedDomain}
              onChange={(_, newDomain) => {
                const domain = newDomain as string;
                setSelectedDomain(domain);
              }}
              disabled={loading}
            >
              <Option value="all">All Domains ({domains.length})</Option>
              {domains.map((domain) => (
                <Option key={domain} value={domain}>
                  {domain}
                </Option>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <FormLabel>Review Status</FormLabel>
            <Select
              value={showReviewed}
              onChange={(_, value) => setShowReviewed(value as string)}
              disabled={loading}
            >
              <Option value="all">All</Option>
              <Option value="true">Reviewed</Option>
              <Option value="false">Unreviewed</Option>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <FormLabel>Flagged</FormLabel>
            <Select
              value={showFlagged}
              onChange={(_, value) => setShowFlagged(value as string)}
              disabled={loading}
            >
              <Option value="all">All</Option>
              <Option value="true">Flagged</Option>
              <Option value="false">Not Flagged</Option>
            </Select>
          </FormControl>

          <Button
            onClick={handleRefresh}
            variant="outlined"
            size="md"
            disabled={loading}
            startDecorator={loading ? <CircularProgress size="sm" /> : "🔄"}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </Box>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card sx={{ mb: 3, p: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CircularProgress size="lg" />
            <Typography level="body-lg">Loading curated links...</Typography>
          </Box>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert color="danger" sx={{ mb: 3 }}>
          <Typography level="title-md" sx={{ mb: 1 }}>
            Error Loading Curated Links
          </Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="sm" onClick={handleRefresh}>
              Retry
            </Button>
            <Button size="sm" variant="soft" component="a" href="/results">
              ← Back to Results
            </Button>
          </Box>
        </Alert>
      )}

      {/* Content - Show when not loading and has data */}
      {!loading && data && (
        <>
          {/* Summary Stats */}
          <Card sx={{ mb: 3, p: 3 }}>
            <Typography level="h4" sx={{ mb: 2 }}>
              📊 Summary
            </Typography>
            <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Box>
                <Typography level="title-lg">
                  {data.stats.totalLinks}
                </Typography>
                <Typography level="body-sm">Total Links</Typography>
              </Box>
              <Box>
                <Typography level="title-lg">
                  {data.stats.totalOccurrences}
                </Typography>
                <Typography level="body-sm">Total Occurrences</Typography>
              </Box>
              <Box>
                <Typography level="title-lg">
                  {data.stats.uniqueDomainsCount}
                </Typography>
                <Typography level="body-sm">Unique Domains</Typography>
              </Box>
              <Box>
                <Typography level="title-lg" color="success">
                  {data.stats.reviewedCount}
                </Typography>
                <Typography level="body-sm">Reviewed</Typography>
              </Box>
              <Box>
                <Typography level="title-lg" color="warning">
                  {data.stats.flaggedCount}
                </Typography>
                <Typography level="body-sm">Flagged</Typography>
              </Box>
            </Box>
          </Card>

          {/* Links by Domain */}
          <AccordionGroup>
            {Object.entries(linksByDomain)
              .sort(([domainA], [domainB]) => domainA.localeCompare(domainB))
              .map(([domain, links]) => (
                <Accordion
                  key={domain}
                  data-domain={domain}
                  expanded={expandedDomain === domain}
                  onChange={() => handleAccordionToggle(domain)}
                >
                  <AccordionSummary>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        width: "100%",
                        maxWidth: "100%",
                      }}
                    >
                      <Typography
                        level="h4"
                        sx={{
                          maxWidth: { xs: "150px", sm: "300px", md: "400px" },
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {domain}
                      </Typography>
                      <Chip size="sm" variant="outlined" sx={{ flexShrink: 0 }}>
                        {links.length} links
                      </Chip>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {/* Desktop Table View */}
                    <Sheet
                      sx={{
                        overflow: "auto",
                        display: { xs: "none", md: "block" },
                      }}
                    >
                      <Table>
                        <thead>
                          <tr>
                            <th>Actions</th>
                            <th>Link Text</th>
                            <th>Count</th>
                            <th>URL</th>
                            <th>Resolved URL</th>
                            <th>Notes</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {links.map((link) => (
                            <tr key={link.id}>
                              <td>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                  <IconButton
                                    size="sm"
                                    variant={
                                      link.reviewed ? "solid" : "outlined"
                                    }
                                    color={
                                      link.reviewed ? "success" : "neutral"
                                    }
                                    disabled={loadingActions[link.id]?.reviewed}
                                    onClick={() =>
                                      toggleReviewed(link.id, link.reviewed)
                                    }
                                  >
                                    {loadingActions[link.id]?.reviewed ? (
                                      <CircularProgress size="sm" />
                                    ) : link.reviewed ? (
                                      "✅"
                                    ) : (
                                      "⭕"
                                    )}
                                  </IconButton>
                                  <IconButton
                                    size="sm"
                                    variant={
                                      link.flagged ? "solid" : "outlined"
                                    }
                                    color={link.flagged ? "warning" : "neutral"}
                                    disabled={loadingActions[link.id]?.flagged}
                                    onClick={() =>
                                      toggleFlagged(link.id, link.flagged)
                                    }
                                  >
                                    {loadingActions[link.id]?.flagged ? (
                                      <CircularProgress size="sm" />
                                    ) : link.flagged ? (
                                      "⭐"
                                    ) : (
                                      "☆"
                                    )}
                                  </IconButton>
                                  <IconButton
                                    size="sm"
                                    variant={link.notes ? "solid" : "outlined"}
                                    color={link.notes ? "primary" : "neutral"}
                                    disabled={loadingActions[link.id]?.notes}
                                    onClick={() => {
                                      setNotesModal({
                                        open: true,
                                        linkId: link.id,
                                        initialNotes: link.notes || "",
                                      });
                                    }}
                                  >
                                    {loadingActions[link.id]?.notes ? (
                                      <CircularProgress size="sm" />
                                    ) : link.notes ? (
                                      "✏️"
                                    ) : (
                                      "📝"
                                    )}
                                  </IconButton>
                                </Box>
                              </td>
                              <td>
                                <Typography
                                  level="body-sm"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {link.text.length > 60
                                    ? `${link.text.substring(0, 60)}...`
                                    : link.text}
                                </Typography>
                                {link.count > 1 && (
                                  <Typography
                                    level="body-xs"
                                    sx={{ color: "text.secondary", mt: 0.5 }}
                                  >
                                    Found in {link.newsletters.length}{" "}
                                    newsletters
                                  </Typography>
                                )}
                              </td>
                              <td>
                                <Chip
                                  size="sm"
                                  variant={link.count > 1 ? "solid" : "soft"}
                                  color={link.count > 1 ? "primary" : "neutral"}
                                >
                                  {link.count}x
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
                                    maxWidth: "200px",
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
                              <td>
                                {link.resolved_url &&
                                link.resolved_url !== link.url ? (
                                  <Link
                                    href={link.resolved_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                      maxWidth: "200px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <Typography level="body-sm">
                                      {new URL(link.resolved_url).hostname}
                                    </Typography>
                                    <Typography level="body-sm">↗</Typography>
                                  </Link>
                                ) : link.resolved_url === link.url ? (
                                  <Typography level="body-xs" color="neutral">
                                    Same as original
                                  </Typography>
                                ) : (
                                  <Typography level="body-xs" color="warning">
                                    Not resolved
                                  </Typography>
                                )}
                              </td>
                              <td>
                                {link.notes ? (
                                  <Typography
                                    level="body-xs"
                                    sx={{
                                      maxWidth: "150px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {link.notes}
                                  </Typography>
                                ) : (
                                  <Typography level="body-xs" color="neutral">
                                    No notes
                                  </Typography>
                                )}
                              </td>
                              <td>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {link.reviewed && (
                                    <Chip
                                      size="sm"
                                      color="success"
                                      variant="soft"
                                    >
                                      Reviewed
                                    </Chip>
                                  )}
                                  {link.flagged && (
                                    <Chip
                                      size="sm"
                                      color="warning"
                                      variant="soft"
                                    >
                                      Flagged
                                    </Chip>
                                  )}
                                  <Chip
                                    size="sm"
                                    color="neutral"
                                    variant="outlined"
                                  >
                                    {link.category}
                                  </Chip>
                                </Box>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Sheet>

                    {/* Mobile Card View */}
                    <Box
                      sx={{
                        display: { xs: "block", md: "none" },
                        gap: 2,
                      }}
                    >
                      {links.map((link) => (
                        <Card
                          key={link.id}
                          variant="outlined"
                          sx={{ mb: 2, p: 2 }}
                        >
                          {/* Header with text and count */}
                          <Box sx={{ mb: 2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                mb: 1,
                              }}
                            >
                              <Typography
                                level="body-sm"
                                sx={{
                                  fontWeight: "bold",
                                  flex: 1,
                                  mr: 1,
                                  lineHeight: 1.3,
                                }}
                              >
                                {link.text}
                              </Typography>
                              <Chip
                                size="sm"
                                variant={link.count > 1 ? "solid" : "soft"}
                                color={link.count > 1 ? "primary" : "neutral"}
                              >
                                {link.count}x
                              </Chip>
                            </Box>
                            {link.count > 1 && (
                              <Typography
                                level="body-xs"
                                sx={{ color: "text.secondary" }}
                              >
                                Found in {link.newsletters.length} newsletters
                              </Typography>
                            )}
                          </Box>

                          {/* URLs */}
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              level="body-xs"
                              sx={{ fontWeight: "bold", mb: 0.5 }}
                            >
                              Original URL:
                            </Typography>
                            <Link
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mb: 1,
                                wordBreak: "break-all",
                              }}
                            >
                              <Typography level="body-xs">
                                {new URL(link.url).hostname}
                              </Typography>
                              <Typography level="body-xs">↗</Typography>
                            </Link>

                            {link.resolved_url &&
                              link.resolved_url !== link.url && (
                                <>
                                  <Typography
                                    level="body-xs"
                                    sx={{ fontWeight: "bold", mb: 0.5 }}
                                  >
                                    Resolved URL:
                                  </Typography>
                                  <Link
                                    href={link.resolved_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    <Typography level="body-xs">
                                      {new URL(link.resolved_url).hostname}
                                    </Typography>
                                    <Typography level="body-xs">↗</Typography>
                                  </Link>
                                </>
                              )}
                          </Box>

                          {/* Notes */}
                          {link.notes && (
                            <Box sx={{ mb: 2 }}>
                              <Typography
                                level="body-xs"
                                sx={{ fontWeight: "bold", mb: 0.5 }}
                              >
                                Notes:
                              </Typography>
                              <Typography level="body-xs">
                                {link.notes}
                              </Typography>
                            </Box>
                          )}

                          {/* Status chips */}
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              flexWrap: "wrap",
                              mb: 2,
                            }}
                          >
                            {link.reviewed && (
                              <Chip size="sm" color="success" variant="soft">
                                Reviewed
                              </Chip>
                            )}
                            {link.flagged && (
                              <Chip size="sm" color="warning" variant="soft">
                                Flagged
                              </Chip>
                            )}
                            <Chip size="sm" color="neutral" variant="outlined">
                              {link.category}
                            </Chip>
                          </Box>

                          {/* Action buttons */}
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "flex-end",
                            }}
                          >
                            <IconButton
                              size="sm"
                              variant={link.reviewed ? "solid" : "outlined"}
                              color={link.reviewed ? "success" : "neutral"}
                              disabled={loadingActions[link.id]?.reviewed}
                              onClick={() =>
                                toggleReviewed(link.id, link.reviewed)
                              }
                            >
                              {loadingActions[link.id]?.reviewed ? (
                                <CircularProgress size="sm" />
                              ) : link.reviewed ? (
                                "✅"
                              ) : (
                                "⭕"
                              )}
                            </IconButton>
                            <IconButton
                              size="sm"
                              variant={link.flagged ? "solid" : "outlined"}
                              color={link.flagged ? "warning" : "neutral"}
                              disabled={loadingActions[link.id]?.flagged}
                              onClick={() =>
                                toggleFlagged(link.id, link.flagged)
                              }
                            >
                              {loadingActions[link.id]?.flagged ? (
                                <CircularProgress size="sm" />
                              ) : link.flagged ? (
                                "⭐"
                              ) : (
                                "☆"
                              )}
                            </IconButton>
                            <IconButton
                              size="sm"
                              variant={link.notes ? "solid" : "outlined"}
                              color={link.notes ? "primary" : "neutral"}
                              disabled={loadingActions[link.id]?.notes}
                              onClick={() => {
                                setNotesModal({
                                  open: true,
                                  linkId: link.id,
                                  initialNotes: link.notes || "",
                                });
                              }}
                            >
                              {loadingActions[link.id]?.notes ? (
                                <CircularProgress size="sm" />
                              ) : link.notes ? (
                                "✏️"
                              ) : (
                                "📝"
                              )}
                            </IconButton>
                          </Box>
                        </Card>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
          </AccordionGroup>
        </>
      )}

      {/* Notes Modal */}
      <NotesModal
        open={notesModal.open}
        linkId={notesModal.linkId}
        initialNotes={notesModal.initialNotes}
        onClose={handleNotesModalClose}
        onSave={saveNotes}
      />
    </Box>
  );
}
