"use client";

import {
  Box,
  Button,
  Modal,
  ModalClose,
  ModalDialog,
  Textarea,
  Typography,
} from "@mui/joy";
import { useCallback, useState } from "react";

interface NotesModalProps {
  open: boolean;
  linkId: string;
  initialNotes: string;
  onClose: () => void;
  onSave: (linkId: string, notes: string) => void;
}

export default function NotesModal({
  open,
  linkId,
  initialNotes,
  onClose,
  onSave,
}: NotesModalProps) {
  // Local state completely isolated from parent component
  const [notes, setNotes] = useState(initialNotes);

  // Update local state when modal opens with new data
  useState(() => {
    if (open) {
      setNotes(initialNotes);
    }
  });

  const handleSave = useCallback(() => {
    onSave(linkId, notes);
  }, [linkId, notes, onSave]);

  const handleClose = useCallback(() => {
    setNotes("");
    onClose();
  }, [onClose]);

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog>
        <ModalClose />
        <Typography level="h4" sx={{ mb: 2 }}>
          Edit Notes
        </Typography>
        <Textarea
          placeholder="Add notes about this link..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          minRows={3}
          maxRows={6}
          sx={{ mb: 2 }}
          autoFocus
        />
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Notes</Button>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
