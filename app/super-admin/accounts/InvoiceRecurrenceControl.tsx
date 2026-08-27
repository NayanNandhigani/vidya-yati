"use client";

import { useState, useTransition } from "react";
import { setInvoiceRecurrence, generateNextInvoice } from "./actions";
import type { Recurrence } from "@prisma/client";

export default function InvoiceRecurrenceControl({ invoiceId, recurrence }: { invoiceId: string; recurrence: Recurrence }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(recurrence);
  const [generated, setGenerated] = useState(false);

  function onChange(next: Recurrence) {
    setValue(next);
    startTransition(async () => {
      await setInvoiceRecurrence(invoiceId, next);
    });
  }

  function onGenerate() {
    startTransition(async () => {
      await generateNextInvoice(invoiceId);
      setGenerated(true);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <select
        className="in"
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as Recurrence)}
        style={{ padding: "4px 8px", fontSize: 12, width: 110 }}
      >
        <option value="NONE">One-time</option>
        <option value="MONTHLY">Monthly</option>
        <option value="QUARTERLY">Quarterly</option>
        <option value="YEARLY">Yearly</option>
      </select>
      {value !== "NONE" &&
        (generated ? (
          <span style={{ fontSize: 11.5, color: "var(--good)", fontWeight: 600 }}>Next invoice created ✓</span>
        ) : (
          <span onClick={onGenerate} style={{ cursor: pending ? "default" : "pointer", color: "var(--marigold-deep)", fontWeight: 600, fontSize: 11.5 }}>
            Generate next
          </span>
        ))}
    </div>
  );
}
