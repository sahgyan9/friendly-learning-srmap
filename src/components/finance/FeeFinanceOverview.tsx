import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  History,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export type StudentFeeDue = Database["public"]["Tables"]["student_fee_dues"]["Row"];
export type StudentFeePaidHistory = Database["public"]["Tables"]["student_fee_paid_history"]["Row"];

interface FeeFinanceOverviewProps {
  dues: StudentFeeDue[];
  paidHistory: StudentFeePaidHistory[];
  isLoading: boolean;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const formatINR = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function FeeFinanceOverview({
  dues,
  paidHistory,
  isLoading,
}: FeeFinanceOverviewProps) {
  const [showHistory, setShowHistory] = useState(true);

  // Aggregate stats
  const totalToBePaid = dues.reduce((sum, d) => sum + (Number(d.to_be_paid_amount) || 0), 0);
  const hasFine = dues.some((d) => d.is_fine === true);

  const totalLifetimePaid = paidHistory.reduce(
    (sum, h) => sum + (Number(h.paid_amount) || 0),
    0
  );

  const portalPaymentUrl = "https://student.srmap.edu.in/srmapstudentcorner";

  if (isLoading && dues.length === 0 && paidHistory.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 rounded-xl bg-muted/50 border border-border/60" />
          <div className="h-44 rounded-xl bg-muted/50 border border-border/60" />
        </div>
        <div className="h-64 rounded-xl bg-muted/50 border border-border/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outstanding Total Card */}
        <div className="bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Outstanding Balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                  {formatINR(totalToBePaid)}
                </span>
              </div>
            </div>

            <div
              className={cn(
                "p-2.5 rounded-xl border",
                totalToBePaid > 0
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              )}
            >
              <CreditCard className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {totalToBePaid > 0 ? (
                <>
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 text-xs font-medium"
                  >
                    Payment Pending
                  </Badge>
                  {hasFine && (
                    <Badge
                      variant="destructive"
                      className="text-xs font-medium gap-1"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      Fine Included
                    </Badge>
                  )}
                </>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-xs font-medium gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  All Dues Cleared
                </Badge>
              )}
            </div>

            <Button
              asChild
              size="sm"
              className="h-8 text-xs font-medium gap-1.5 shadow-xs"
            >
              <a
                href={portalPaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Pay on SRM Portal</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Advisory / Fine Penalty Notice Card */}
        <div
          className={cn(
            "rounded-xl p-5 sm:p-6 border shadow-xs flex flex-col justify-between",
            totalToBePaid > 0
              ? hasFine
                ? "bg-destructive/5 border-destructive/30 text-destructive-foreground"
                : "bg-amber-500/5 border-amber-500/30 text-foreground"
              : "bg-muted/30 border-border/60 text-foreground"
          )}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              {totalToBePaid > 0 ? (
                hasFine ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-destructive font-bold">
                      Penalty of Fine Imposed
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-amber-800 dark:text-amber-300 font-semibold">
                      Payment Notice
                    </span>
                  </>
                )
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-foreground font-semibold">
                    Fee Status Clear
                  </span>
                </>
              )}
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {totalToBePaid > 0 ? (
                hasFine ? (
                  "A fine has been levied on your account. Please clear your dues immediately on the SRM portal to avoid further administrative penalties."
                ) : (
                  "Please pay on time to avoid Penalty of Fine. SRM University-AP levies penalty fines on overdue tuition, exam, and hostel charges once the payment deadline passes."
                )
              ) : (
                "No outstanding fees or fines are pending on your SRM portal account. You will automatically receive in-app and web push notifications whenever a new fee or fine is raised."
              )}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Historical total paid:</span>
            <span className="font-mono font-medium text-foreground">
              {formatINR(totalLifetimePaid)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Dues Section */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Active Fee Dues ({dues.length})
            </h2>
          </div>
          {dues.length > 0 && (
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              Total: {formatINR(totalToBePaid)}
            </span>
          )}
        </div>

        {dues.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No Pending Fee Dues
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your account has no unpaid heads listed in the SRM student portal transaction ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Fee Category
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Fee Head
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                    Due Amount
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                    Collected
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                    To Be Paid
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dues.map((due) => (
                  <TableRow
                    key={due.id}
                    className="border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium text-xs text-foreground">
                      {due.fee_category}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{due.fee_head}</span>
                        {due.is_fine && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0 font-medium"
                          >
                            Fine
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right text-muted-foreground">
                      {formatINR(Number(due.due_amount) || 0)}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right text-muted-foreground">
                      {formatINR(Number(due.collected_amount) || 0)}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-right text-foreground">
                      {formatINR(Number(due.to_be_paid_amount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5 font-medium",
                          due.is_fine
                            ? "border-destructive/40 text-destructive bg-destructive/5"
                            : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                        )}
                      >
                        {due.is_fine ? "Fine Levied" : "Due"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Historical Payments Section */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="w-full px-5 py-4 border-b border-border/60 flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">
              Payment History & Receipts ({paidHistory.length})
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {showHistory ? "Collapse" : "Expand"}
            </span>
            {showHistory ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {paidHistory.length === 0 ? (
                <div className="py-10 px-4 text-center text-xs text-muted-foreground">
                  No historical payment records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-border/60 hover:bg-transparent">
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Academic Year
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Fee Head
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Receipt No.
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Receipt Date
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Payment Mode
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                          Amount Paid
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                          Balance Due
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidHistory.map((item) => (
                        <TableRow
                          key={item.id}
                          className="border-border/60 hover:bg-muted/30 transition-colors text-xs"
                        >
                          <TableCell className="font-medium text-foreground whitespace-nowrap">
                            {item.term}
                          </TableCell>
                          <TableCell className="text-foreground max-w-xs truncate" title={item.fee_type}>
                            {item.fee_type}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground max-w-[140px] truncate" title={item.receipt_number}>
                            {item.receipt_number || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {item.receipt_date || item.due_date || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[120px] truncate" title={item.payment_mode || ""}>
                            {item.payment_mode || "—"}
                          </TableCell>
                          <TableCell className="font-mono font-medium text-right text-foreground whitespace-nowrap">
                            {formatINR(Number(item.paid_amount) || 0)}
                          </TableCell>
                          <TableCell className="font-mono text-right text-muted-foreground whitespace-nowrap">
                            {Number(item.balance_due) > 0 ? (
                              <span className="text-destructive font-semibold">
                                {formatINR(Number(item.balance_due))}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ₹0
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
