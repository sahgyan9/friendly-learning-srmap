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
import { Skeleton } from "@/components/ui/skeleton";
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

  const totalConcessions = paidHistory
    .filter((h) => Number(h.paid_amount) === 0 && Number(h.amount) > 0)
    .reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

  const portalPaymentUrl = "https://student.srmap.edu.in/srmapstudentcorner";

  if (isLoading && dues.length === 0 && paidHistory.length === 0) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading fees">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outstanding Total Card */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                Outstanding balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground tabular">
                  {formatINR(totalToBePaid)}
                </span>
              </div>
            </div>

            <div
              className={cn(
                "p-2.5 rounded-lg bg-secondary",
                totalToBePaid > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-success"
              )}
            >
              <CreditCard className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {totalToBePaid > 0 ? (
                <>
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 text-xs font-medium"
                  >
                    Payment pending
                  </Badge>
                  {hasFine && (
                    <Badge
                      variant="destructive"
                      className="text-xs font-medium gap-1"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      Fine included
                    </Badge>
                  )}
                </>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-success bg-emerald-500/5 text-xs font-medium gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  All dues cleared
                </Badge>
              )}
            </div>

            <Button
              asChild
              size="sm"
              className="h-9 text-xs gap-1.5"
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
            "rounded-xl p-5 sm:p-6 border shadow-card flex flex-col justify-between",
            totalToBePaid > 0
              ? hasFine
                ? "bg-destructive/5 border-destructive/30 text-destructive-foreground"
                : "bg-amber-500/5 border-amber-500/30 text-foreground"
              : "bg-card border-border text-foreground"
          )}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              {totalToBePaid > 0 ? (
                hasFine ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-destructive font-semibold">
                      Fine applied
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-amber-800 dark:text-amber-300 font-semibold">
                      Payment due
                    </span>
                  </>
                )
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <span className="text-foreground font-semibold">
                    No fees due
                  </span>
                </>
              )}
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {totalToBePaid > 0 ? (
                hasFine ? (
                  "A fine has been added to your account. Pay your dues on the SRM portal to stop further fines."
                ) : (
                  "Pay before the deadline to avoid a fine. SRM University-AP adds fines to overdue tuition, exam and hostel charges once the deadline passes."
                )
              ) : (
                "Your SRM portal account has no outstanding fees or fines. You will get a notification when a new fee or fine is raised."
              )}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span>Historical total paid:</span>
              <span className="tabular font-medium text-foreground">
                {formatINR(totalLifetimePaid)}
              </span>
            </div>
            {totalConcessions > 0 && (
              <div className="flex items-center justify-between sm:justify-end gap-1.5 text-[11px]">
                <span className="text-muted-foreground">Scholarship concessions:</span>
                <span className="tabular font-medium text-success">
                  {formatINR(totalConcessions)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Dues Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Fees due <span className="tabular text-muted-foreground">({dues.length})</span>
            </h2>
          </div>
          {dues.length > 0 && (
            <span className="text-xs tabular font-semibold text-muted-foreground">
              Total: {formatINR(totalToBePaid)}
            </span>
          )}
        </div>

        {dues.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No fees due
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              The SRM student portal lists no unpaid fees for your account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border hover:bg-transparent">
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
                    className="border-border hover:bg-muted/30 transition-colors"
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
                    <TableCell className="text-xs tabular text-right text-muted-foreground">
                      {formatINR(Number(due.due_amount) || 0)}
                    </TableCell>
                    <TableCell className="text-xs tabular text-right text-muted-foreground">
                      {formatINR(Number(due.collected_amount) || 0)}
                    </TableCell>
                    <TableCell className="text-xs tabular font-semibold text-right text-foreground">
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
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="w-full px-5 py-4 border-b border-border flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
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
                      <TableRow className="border-border hover:bg-transparent">
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
                      {paidHistory.map((item) => {
                        const isConcession = Number(item.paid_amount) === 0 && Number(item.amount) > 0;
                        return (
                          <TableRow
                            key={item.id}
                            className={cn(
                              "border-border hover:bg-muted/30 transition-colors text-xs",
                              isConcession && "bg-muted/15"
                            )}
                          >
                            <TableCell className="font-medium text-foreground whitespace-nowrap">
                              {item.term}
                            </TableCell>
                            <TableCell className="text-foreground max-w-xs truncate" title={item.fee_type}>
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{item.fee_type}</span>
                                {isConcession && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 border-green-600/30 text-green-700 dark:text-green-500 shrink-0 font-medium"
                                  >
                                    Waiver
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="tabular text-muted-foreground max-w-[140px] truncate" title={item.receipt_number}>
                              {item.receipt_number || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {item.receipt_date || item.due_date || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[120px] truncate" title={item.payment_mode || ""}>
                              {item.payment_mode || "—"}
                            </TableCell>
                            <TableCell className="tabular font-medium text-right whitespace-nowrap">
                              {isConcession ? (
                                <span className="text-success font-semibold" title={`Institutional waiver credit: ${formatINR(Number(item.amount))}`}>
                                  {formatINR(Number(item.amount))}
                                </span>
                              ) : (
                                <span className="text-foreground">
                                  {formatINR(Number(item.paid_amount) || 0)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="tabular text-right text-muted-foreground whitespace-nowrap">
                              {Number(item.balance_due) > 0 ? (
                                <span className="text-destructive font-semibold">
                                  {formatINR(Number(item.balance_due))}
                                </span>
                              ) : (
                                <span className="text-success">
                                  ₹0
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
