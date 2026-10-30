"use client";

import { Chip } from "@mui/material";

export default function MembershipStatusChip({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  return (
    <Chip
      label={isActive ? "啟用" : "停用"}
      size="small"
      sx={{
        borderRadius: "999px",
        fontWeight: 700,
        color: isActive ? "#166534" : "#991b1b",
        backgroundColor: isActive ? "#dcfce7" : "#fee2e2",
      }}
    />
  );
}
