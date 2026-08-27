import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import NewLedgerAccountForm from "./NewLedgerAccountForm";
import NewVendorForm from "./NewVendorForm";
import NewBillForm from "./NewBillForm";
import BillRow, { type BillRowData } from "./BillRow";
import { InboundPaymentForm, OutboundPaymentForm } from "./LedgerEntryForms";
import InvoiceRecurrenceControl from "./InvoiceRecurrenceControl";
import ExpenseBreakdownChart from "./ExpenseBreakdownChart";

const TABS = ["overview", "ledger", "bills", "invoices", "vendors", "chart-of-accounts"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Overview",
  ledger: "Ledger",
  bills: "Bills",
  invoices: "Invoices",
  vendors: "Vendors",
  "chart-of-accounts": "Chart of accounts",
};

type Account = { id: string; name: string; type: string; code: string | null };
type VendorOption = { id: string; name: string };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(params.tab ?? "") ? (params.tab as Tab) : "overview";

  const [ledgerAccounts, vendors] = await Promise.all([
    db.ledgerAccount.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    db.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const incomeAccounts = ledgerAccounts.filter((a) => a.type === "INCOME");
  const expenseAccounts = ledgerAccounts.filter((a) => a.type === "EXPENSE");

  return (
    <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: 18, height: "100dvh", boxSizing: "border-box" }}>
      <div>
        <div className="disp" style={{ fontSize: 22 }}>
          Accounts
        </div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 2 }}>Vidya Yati&apos;s own ledger — bills, invoices, and cash flow</div>
      </div>

      <div style={{ display: "flex", gap: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: 4, flex: "none" }}>
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/super-admin/accounts?tab=${t}`}
            style={{
              padding: "7px 14px",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "var(--ink)" : "var(--muted)",
              background: tab === t ? "var(--paper)" : "transparent",
              textDecoration: "none",
            }}
          >
            {TAB_LABEL[t]}
          </Link>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {tab === "overview" && <OverviewTab ledgerAccounts={ledgerAccounts} />}
        {tab === "ledger" && <LedgerTab incomeAccounts={incomeAccounts} expenseAccounts={expenseAccounts} vendors={vendors} />}
        {tab === "bills" && <BillsTab vendors={vendors} expenseAccounts={expenseAccounts} />}
        {tab === "invoices" && <InvoicesTab />}
        {tab === "vendors" && <VendorsTab vendors={vendors} />}
        {tab === "chart-of-accounts" && <ChartOfAccountsTab ledgerAccounts={ledgerAccounts} />}
      </div>
    </div>
  );
}

async function OverviewTab({ ledgerAccounts }: { ledgerAccounts: Account[] }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const in14Days = new Date(now);
  in14Days.setDate(in14Days.getDate() + 14);

  const [inboundAgg, outboundAgg, openBills, openInvoices, recentEntries, expenseByAccount] = await Promise.all([
    db.ledgerEntry.aggregate({ where: { entryType: "INCOME", date: { gte: monthStart, lt: monthEnd } }, _sum: { amount: true } }),
    db.ledgerEntry.aggregate({ where: { entryType: "EXPENSE", date: { gte: monthStart, lt: monthEnd } }, _sum: { amount: true } }),
    db.bill.findMany({ where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } }, include: { vendor: true, payments: true } }),
    db.subscriptionInvoice.findMany({ where: { status: { not: "PAID" } }, include: { payments: true } }),
    db.ledgerEntry.findMany({ orderBy: { date: "desc" }, take: 8, include: { ledgerAccount: true, vendor: true } }),
    db.ledgerEntry.groupBy({ by: ["ledgerAccountId"], where: { entryType: "EXPENSE", date: { gte: monthStart, lt: monthEnd } }, _sum: { amount: true } }),
  ]);

  const inbound = Number(inboundAgg._sum.amount ?? 0);
  const outbound = Number(outboundAgg._sum.amount ?? 0);
  const net = inbound - outbound;
  const outstandingPayables = openBills.reduce((s, b) => s + Math.max(0, Number(b.amount) - b.payments.reduce((p, x) => p + Number(x.amount), 0)), 0);
  const outstandingReceivables = openInvoices.reduce((s, inv) => s + Math.max(0, Number(inv.amount) - inv.payments.reduce((p, x) => p + Number(x.amount), 0)), 0);
  const upcomingBills = openBills
    .filter((b) => b.dueDate <= in14Days)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);

  const accountNameMap = new Map(ledgerAccounts.map((a) => [a.id, a.name]));
  const expenseSlices = expenseByAccount
    .map((g) => ({ label: accountNameMap.get(g.ledgerAccountId) ?? "Unknown", amount: Number(g._sum.amount ?? 0) }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const CHART_COLORS = ["var(--marigold)", "var(--teal)", "var(--clay)"];
  const pieSlices = expenseSlices.slice(0, 3).map((s, i) => ({ ...s, color: CHART_COLORS[i] }));
  const otherAmount = expenseSlices.slice(3).reduce((s, x) => s + x.amount, 0);
  if (otherAmount > 0) pieSlices.push({ label: "Other", amount: otherAmount, color: "var(--muted)" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
        <Stat label="Inbound — this month" value={formatINR(inbound)} color="var(--good)" />
        <Stat label="Outbound — this month" value={formatINR(outbound)} color="var(--critical)" />
        <Stat label="Net — this month" value={formatINR(net)} color={net >= 0 ? "var(--good)" : "var(--critical)"} />
        <Stat label="Outstanding payables" value={formatINR(outstandingPayables)} color="var(--warn)" />
        <Stat label="Outstanding receivables" value={formatINR(outstandingReceivables)} color="var(--info)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Expense breakdown</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>This month, top categories</div>
          <ExpenseBreakdownChart slices={pieSlices} totalLabel="total spend" formatAmount={formatINR} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Bills due in the next 14 days</div>
          {upcomingBills.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Nothing due soon.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcomingBills.map((b) => {
                const balance = Number(b.amount) - b.payments.reduce((s, p) => s + Number(p.amount), 0);
                const overdue = b.dueDate < now;
                return (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{b.vendor.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: overdue ? "var(--critical)" : "var(--muted)" }}>
                        Due {b.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {overdue ? " · overdue" : ""}
                      </div>
                    </div>
                    <div className="mono" style={{ fontWeight: 600 }}>
                      {formatINR(balance)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Recent activity</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 0.8fr", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
          <div>Description</div>
          <div>Category</div>
          <div>Date</div>
          <div style={{ textAlign: "right" }}>Amount</div>
        </div>
        {recentEntries.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "10px 0" }}>No ledger activity yet.</div>
        ) : (
          recentEntries.map((e) => (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 0.8fr", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
              <div>{e.description}</div>
              <div style={{ color: "var(--muted)" }}>{e.ledgerAccount.name}</div>
              <div className="mono" style={{ color: "var(--muted)" }}>
                {e.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              <div className="mono" style={{ textAlign: "right", fontWeight: 600, color: e.entryType === "INCOME" ? "var(--good)" : "var(--critical)" }}>
                {e.entryType === "INCOME" ? "+" : "−"}
                {formatINR(Number(e.amount))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

async function LedgerTab({ incomeAccounts, expenseAccounts, vendors }: { incomeAccounts: Account[]; expenseAccounts: Account[]; vendors: VendorOption[] }) {
  const entries = await db.ledgerEntry.findMany({ orderBy: { date: "desc" }, take: 100, include: { ledgerAccount: true, vendor: true } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <InboundPaymentForm incomeAccounts={incomeAccounts} />
        <OutboundPaymentForm expenseAccounts={expenseAccounts} vendors={vendors} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 1fr 0.9fr 0.9fr", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
          <div>Date</div>
          <div>Description</div>
          <div>Category</div>
          <div>Vendor</div>
          <div>Source</div>
          <div style={{ textAlign: "right" }}>Amount</div>
        </div>
        {entries.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "14px 0" }}>No ledger entries yet.</div>
        ) : (
          entries.map((e) => (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 1fr 0.9fr 0.9fr", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
              <div className="mono" style={{ color: "var(--muted)" }}>
                {e.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              <div>{e.description}</div>
              <div style={{ color: "var(--muted)" }}>{e.ledgerAccount.name}</div>
              <div style={{ color: "var(--muted)" }}>{e.vendor?.name ?? "—"}</div>
              <div>
                <span className="pill" style={{ background: e.source === "AUTO_SUBSCRIPTION" ? "var(--info-tint)" : "var(--line)", color: e.source === "AUTO_SUBSCRIPTION" ? "var(--info)" : "var(--muted)", fontSize: 10.5 }}>
                  {e.source === "AUTO_SUBSCRIPTION" ? "Auto" : "Manual"}
                </span>
              </div>
              <div className="mono" style={{ textAlign: "right", fontWeight: 600, color: e.entryType === "INCOME" ? "var(--good)" : "var(--critical)" }}>
                {e.entryType === "INCOME" ? "+" : "−"}
                {formatINR(Number(e.amount))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

async function BillsTab({ vendors, expenseAccounts }: { vendors: VendorOption[]; expenseAccounts: Account[] }) {
  const now = new Date();
  const bills = await db.bill.findMany({ orderBy: { dueDate: "asc" }, include: { vendor: true, ledgerAccount: true, payments: true } });

  const rows: BillRowData[] = bills.map((b) => {
    const paidAmount = b.payments.reduce((s, p) => s + Number(p.amount), 0);
    return {
      id: b.id,
      billNumber: b.billNumber,
      vendorName: b.vendor.name,
      categoryName: b.ledgerAccount.name,
      amount: Number(b.amount),
      paidAmount,
      dueDate: b.dueDate.toISOString(),
      status: b.status,
      recurrence: b.recurrence,
      isOverdue: b.dueDate < now && (b.status === "PENDING" || b.status === "PARTIALLY_PAID"),
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <NewBillForm vendors={vendors} expenseAccounts={expenseAccounts} />

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 1fr 1fr 1fr 0.9fr", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
          <div>Vendor / Bill #</div>
          <div>Category</div>
          <div>Amount</div>
          <div>Due</div>
          <div>Status</div>
          <div style={{ textAlign: "right" }}>Action</div>
        </div>
        {rows.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "14px 0" }}>No bills scheduled yet.</div>
        ) : (
          rows.map((b) => <BillRow key={b.id} bill={b} />)
        )}
      </div>
    </div>
  );
}

async function InvoicesTab() {
  const invoices = await db.subscriptionInvoice.findMany({ orderBy: { dueDate: "asc" }, include: { school: true, payments: true } });

  const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
    PENDING: { bg: "var(--info-tint)", fg: "var(--info)", label: "Pending" },
    PAID: { bg: "var(--good-tint)", fg: "var(--good)", label: "Paid" },
    OVERDUE: { bg: "var(--critical-tint)", fg: "var(--critical)", label: "Overdue" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Scheduled invoices to schools — set a cadence and generate the next one when due.</div>
        <Link href="/super-admin/subscriptions" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--marigold-deep)", textDecoration: "none" }}>
          Manage in Subscriptions & Billing →
        </Link>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.9fr 1.2fr", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
          <div>School</div>
          <div>Period</div>
          <div>Amount</div>
          <div>Due</div>
          <div>Status</div>
          <div>Recurrence</div>
        </div>
        {invoices.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "14px 0" }}>No invoices yet.</div>
        ) : (
          invoices.map((inv) => {
            const style = STATUS_STYLE[inv.status] ?? STATUS_STYLE.PENDING;
            return (
              <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.9fr 1.2fr", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                <div style={{ fontWeight: 600 }}>{inv.school.name}</div>
                <div style={{ color: "var(--muted)" }}>{inv.billingPeriod}</div>
                <div className="mono">{formatINR(Number(inv.amount))}</div>
                <div className="mono" style={{ color: "var(--muted)" }}>
                  {inv.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                <div>
                  <span className="pill" style={{ background: style.bg, color: style.fg }}>
                    {style.label}
                  </span>
                </div>
                <div>
                  <InvoiceRecurrenceControl invoiceId={inv.id} recurrence={inv.recurrence} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

async function VendorsTab({ vendors }: { vendors: (VendorOption & { category: string | null; contactName: string | null; phone: string | null; email: string | null })[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <NewVendorForm />

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.4fr", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
          <div>Vendor</div>
          <div>Category</div>
          <div>Contact</div>
          <div>Phone</div>
          <div>Email</div>
        </div>
        {vendors.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "14px 0" }}>No vendors added yet.</div>
        ) : (
          vendors.map((v) => (
            <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.4fr", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
              <div style={{ fontWeight: 600 }}>{v.name}</div>
              <div style={{ color: "var(--muted)" }}>{v.category ?? "—"}</div>
              <div style={{ color: "var(--muted)" }}>{v.contactName ?? "—"}</div>
              <div className="mono" style={{ color: "var(--muted)" }}>
                {v.phone ?? "—"}
              </div>
              <div className="mono" style={{ color: "var(--muted)" }}>
                {v.email ?? "—"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

async function ChartOfAccountsTab({ ledgerAccounts }: { ledgerAccounts: Account[] }) {
  const TYPE_LABEL: Record<string, string> = { INCOME: "Income", EXPENSE: "Expense", ASSET: "Asset", LIABILITY: "Liability" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <NewLedgerAccountForm />

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "0.7fr 2fr 1fr", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
          <div>Code</div>
          <div>Name</div>
          <div>Type</div>
        </div>
        {ledgerAccounts.map((a) => (
          <div key={a.id} style={{ display: "grid", gridTemplateColumns: "0.7fr 2fr 1fr", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
            <div className="mono" style={{ color: "var(--faint)" }}>
              {a.code ?? "—"}
            </div>
            <div style={{ fontWeight: 600 }}>{a.name}</div>
            <div style={{ color: "var(--muted)" }}>{TYPE_LABEL[a.type]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 21, fontWeight: 600, color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}
