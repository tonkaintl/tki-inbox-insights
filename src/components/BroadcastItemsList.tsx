"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  IconButton,
  Sheet,
  Tooltip,
  Typography,
} from "@mui/joy";
import Cookies from "js-cookie";
import Image from "next/image";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

interface BroadcastItem {
  _id: string;
  message_id: string;
  subject: string;
  sender: string;
  received_date: string;
  full_text: string;
  stock_number: string | null;
  machine_info: string[];
  machine_url: string | null;
  price: string | null;
  location: string | null;
  images: string[];
  completed: boolean;
  parsed_at: string;
}

export interface BroadcastItemsListRef {
  refresh: () => void;
}

const BroadcastItemsList = forwardRef<BroadcastItemsListRef>((props, ref) => {
  const [items, setItems] = useState<BroadcastItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copiedImage, setCopiedImage] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Expose refresh function to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: fetchItems,
  }));

  useEffect(() => {
    fetchItems();
    // Load saved accordion state from cookie
    const savedItem = Cookies.get("broadcastExpandedItem");
    if (savedItem) {
      setExpandedItem(savedItem);
    }
  }, []);

  const handleAccordionChange = (itemId: string | null) => {
    setExpandedItem(itemId);
    if (itemId) {
      Cookies.set("broadcastExpandedItem", itemId, { expires: 7 }); // Save for 7 days
    } else {
      Cookies.remove("broadcastExpandedItem");
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/broadcast-items");
      const data = await response.json();

      if (data.success) {
        setItems(data.data);
        setTotalCount(data.totalCount || data.data.length);
      } else {
        setError(data.error || "Failed to fetch items");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const toggleCompleted = async (itemId: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/broadcast-items/${itemId}/completed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentValue }),
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setItems((prevItems) =>
          prevItems.map((item) =>
            item._id === itemId ? { ...item, completed: !currentValue } : item
          )
        );
      }
    } catch (err) {
      console.error("Failed to update completed status:", err);
    }
  };

  const copyToClipboard = async (
    text: string,
    id: string,
    type: "text" | "image"
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "text") {
        setCopiedText(id);
        setTimeout(() => setCopiedText(null), 2000);
      } else {
        setCopiedImage(id);
        setTimeout(() => setCopiedImage(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download image:", err);
    }
  };

  const formatTextInfo = (item: BroadcastItem) => {
    const lines = [];

    // Title
    lines.push(item.subject);

    // Stock number
    if (item.stock_number) {
      lines.push(`STK#: ${item.stock_number}`);
    }

    // Machine info (specs)
    if (item.machine_info && item.machine_info.length > 0) {
      item.machine_info.forEach((spec) => lines.push(spec));
    }

    // Location and price
    if (item.location && item.price) {
      lines.push(`EXW: ${item.location} @ ${item.price}`);
    } else {
      if (item.location) lines.push(`Location: ${item.location}`);
      if (item.price) lines.push(`Price: ${item.price}`);
    }

    return lines.join("\n");
  };

  const groupByDate = (items: BroadcastItem[]) => {
    const groups: { [key: string]: BroadcastItem[] } = {};

    items.forEach((item) => {
      const date = new Date(item.received_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });

    return groups;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading broadcast items...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert color="danger" sx={{ m: 3 }}>
        Error: {error}
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Alert color="neutral" sx={{ m: 3 }}>
        No broadcast items found. Process some emails first!
      </Alert>
    );
  }

  const groupedItems = groupByDate(items);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography level="h3" sx={{ mb: 2 }}>
        📦 Processed Broadcast Items (Last {items.length} of {totalCount})
      </Typography>

      <AccordionGroup>
        {Object.entries(groupedItems).map(([date, dateItems]) => (
          <Box key={date} sx={{ mb: 2 }}>
            <Typography
              level="title-sm"
              sx={{ mb: 1, color: "text.secondary" }}
            >
              {date} ({dateItems.length}{" "}
              {dateItems.length === 1 ? "item" : "items"})
            </Typography>
            {dateItems.map((item) => (
              <Accordion
                key={item._id}
                expanded={expandedItem === item._id}
                onChange={(_, expanded) =>
                  handleAccordionChange(expanded ? item._id : null)
                }
              >
                <AccordionSummary>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Checkbox
                        checked={item.completed}
                        onChange={() =>
                          toggleCompleted(item._id, item.completed)
                        }
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                      />
                      <Typography level="title-md">{item.subject}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      {item.stock_number && (
                        <Typography
                          level="body-sm"
                          sx={{ color: "primary.plainColor" }}
                        >
                          STK# {item.stock_number}
                        </Typography>
                      )}
                      {item.price && (
                        <Typography
                          level="body-sm"
                          sx={{ color: "success.plainColor" }}
                        >
                          {item.price}
                        </Typography>
                      )}
                      {item.location && (
                        <Typography
                          level="body-sm"
                          sx={{ color: "text.secondary" }}
                        >
                          📍 {item.location}
                        </Typography>
                      )}
                      <Typography
                        level="body-sm"
                        sx={{ color: "text.tertiary" }}
                      >
                        🖼️ {item.images.length}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ p: 2 }}>
                    {/* Copy Text Info Button */}
                    <Box
                      sx={{
                        mb: 3,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() =>
                          copyToClipboard(
                            formatTextInfo(item),
                            item._id,
                            "text"
                          )
                        }
                      >
                        {copiedText === item._id
                          ? "✓ Copied!"
                          : "📋 Copy Text Info"}
                      </Button>
                    </Box>

                    {/* Info Grid */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      {item.stock_number && (
                        <>
                          <Typography level="body-sm" fontWeight="bold">
                            Stock #:
                          </Typography>
                          <Typography level="body-sm">
                            {item.stock_number}
                          </Typography>
                        </>
                      )}

                      <Typography level="body-sm" fontWeight="bold">
                        Price:
                      </Typography>
                      <Typography level="body-sm">
                        {item.price || "Not found"}
                      </Typography>

                      <Typography level="body-sm" fontWeight="bold">
                        Location:
                      </Typography>
                      <Typography level="body-sm">
                        {item.location || "Not found"}
                      </Typography>

                      {item.machine_url && (
                        <>
                          <Typography level="body-sm" fontWeight="bold">
                            Listing:
                          </Typography>
                          <Typography level="body-sm">
                            <a
                              href={item.machine_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "inherit",
                                textDecoration: "underline",
                              }}
                            >
                              View on tonkaintl.com
                            </a>
                          </Typography>
                        </>
                      )}

                      <Typography level="body-sm" fontWeight="bold">
                        Images:
                      </Typography>
                      <Typography level="body-sm">
                        {item.images.length}
                      </Typography>

                      <Typography level="body-sm" fontWeight="bold">
                        Received:
                      </Typography>
                      <Typography level="body-sm">
                        {new Date(item.received_date).toLocaleString()}
                      </Typography>
                    </Box>

                    {/* Machine Specs */}
                    {item.machine_info && item.machine_info.length > 0 && (
                      <Sheet
                        variant="soft"
                        sx={{
                          p: 2,
                          mb: 2,
                          borderRadius: "sm",
                        }}
                      >
                        <Typography level="title-sm" sx={{ mb: 1 }}>
                          Machine Specifications:
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          {item.machine_info.map((spec, idx) => (
                            <Typography key={idx} level="body-sm">
                              • {spec}
                            </Typography>
                          ))}
                        </Box>
                      </Sheet>
                    )}

                    {/* Images */}
                    {item.images.length > 0 && (
                      <Box>
                        <Typography level="title-sm" sx={{ mb: 1 }}>
                          Vehicle Photos:
                        </Typography>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(150px, 1fr))",
                            gap: 2,
                          }}
                        >
                          {item.images.map((imageUrl, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                position: "relative",
                                aspectRatio: "4/3",
                                borderRadius: "sm",
                                overflow: "hidden",
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "neutral.softBg",
                              }}
                            >
                              <Image
                                src={imageUrl}
                                alt={`Vehicle ${idx + 1}`}
                                fill
                                sizes="(max-width: 768px) 50vw, 150px"
                                style={{ objectFit: "cover" }}
                                loading="lazy"
                              />
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  display: "flex",
                                  gap: 0.5,
                                }}
                              >
                                <Tooltip
                                  title={
                                    copiedImage === `${item._id}-${idx}`
                                      ? "Copied!"
                                      : "Copy link"
                                  }
                                >
                                  <IconButton
                                    size="sm"
                                    variant="solid"
                                    sx={{
                                      minWidth: 24,
                                      minHeight: 24,
                                    }}
                                    onClick={() =>
                                      copyToClipboard(
                                        imageUrl,
                                        `${item._id}-${idx}`,
                                        "image"
                                      )
                                    }
                                  >
                                    {copiedImage === `${item._id}-${idx}`
                                      ? "✓"
                                      : "📋"}
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download image">
                                  <IconButton
                                    size="sm"
                                    variant="solid"
                                    sx={{
                                      minWidth: 24,
                                      minHeight: 24,
                                    }}
                                    onClick={() =>
                                      downloadImage(
                                        imageUrl,
                                        `vehicle-${item._id}-${idx + 1}.jpg`
                                      )
                                    }
                                  >
                                    ⬇
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ))}
      </AccordionGroup>
    </Box>
  );
});

BroadcastItemsList.displayName = "BroadcastItemsList";

export default BroadcastItemsList;
