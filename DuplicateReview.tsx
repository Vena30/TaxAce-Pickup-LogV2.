import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitMerge,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DupCandidate {
  type: string;
  reason: string;
  client1Id: number;
  client1Name: string;
  client2Id: number;
  client2Name: string;
}

// ─── Merge Dialog ─────────────────────────────────────────────────────────────

function MergeDialog({
  pair,
  onClose,
  onMerged,
}: {
  pair: DupCandidate;
  onClose: () => void;
  onMerged: () => void;
}) {
  const [primaryId, setPrimaryId] = useState<number>(pair.client1Id);
  const duplicateId = primaryId === pair.client1Id ? pair.client2Id : pair.client1Id;
  const primaryName = primaryId === pair.client1Id ? pair.client1Name : pair.client2Name;
  const duplicateName = primaryId === pair.client1Id ? pair.client2Name : pair.client1Name;

  const { data: primaryRecords } = trpc.duplicates.getClientRecords.useQuery({ clientId: primaryId });
  const { data: duplicateRecords } = trpc.duplicates.getClientRecords.useQuery({ clientId: duplicateId });

  // Build maps by tax year
  const primaryByYear = new Map<number, any>(
    (primaryRecords ?? []).map((r) => [r.taxYear, r])
  );
  const duplicateByYear = new Map<number, any>(
    (duplicateRecords ?? []).map((r) => [r.taxYear, r])
  );

  const allYears = Array.from(
    new Set([...Array.from(primaryByYear.keys()), ...Array.from(duplicateByYear.keys())])
  ).sort((a, b) => b - a);

  const conflictYears = allYears.filter(
    (y) => primaryByYear.has(y) && duplicateByYear.has(y)
  );

  const [resolutions, setResolutions] = useState<Record<number, "primary" | "duplicate">>(() => {
    const init: Record<number, "primary" | "duplicate"> = {};
    conflictYears.forEach((y) => { init[y] = "primary"; });
    return init;
  });

  const utils = trpc.useUtils();
  const mergeMutation = trpc.duplicates.merge.useMutation({
    onSuccess: () => {
      toast.success(`Merged: ${duplicateName} → ${primaryName}`);
      utils.duplicates.candidates.invalidate();
      utils.clients.list.invalidate();
      utils.clients.listWithSummary.invalidate();
      utils.dashboard.stats.invalidate();
      onMerged();
    },
    onError: (e) => toast.error(`Merge failed: ${e.message}`),
  });

  const handleMerge = () => {
    const conflictResolutions = conflictYears.map((y) => ({
      primaryRecordId: primaryByYear.get(y)?.id ?? null,
      duplicateRecordId: duplicateByYear.get(y)?.id ?? null,
      keepWhich: resolutions[y] ?? "primary",
    }));
    mergeMutation.mutate({
      primaryClientId: primaryId,
      duplicateClientId: duplicateId,
      conflictResolutions,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Merge Clients
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose primary */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Step 1 — Choose which client to keep as the primary record:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[pair.client1Id, pair.client2Id].map((cid) => {
              const name = cid === pair.client1Id ? pair.client1Name : pair.client2Name;
              const isPrimary = primaryId === cid;
              const recs = cid === primaryId ? primaryRecords : duplicateRecords;
              return (
                <button
                  key={cid}
                  onClick={() => {
                    setPrimaryId(cid);
                    const init: Record<number, "primary" | "duplicate"> = {};
                    conflictYears.forEach((y) => { init[y] = "primary"; });
                    setResolutions(init);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isPrimary
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{name}</span>
                    {isPrimary && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                        Keep
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {recs?.length ?? 0} tax year record{recs?.length !== 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Step 2 — Review all tax year records:
          </p>

          {allYears.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tax year records on either client.</p>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[80px_1fr_1fr] bg-muted/40 border-b">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Year</div>
                <div className="px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide border-l">
                  {primaryName} (Keep)
                </div>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l">
                  {duplicateName} (Merge from)
                </div>
              </div>

              {allYears.map((year) => {
                const pRec = primaryByYear.get(year);
                const dRec = duplicateByYear.get(year);
                const isConflict = !!pRec && !!dRec;
                const chosen = resolutions[year];

                return (
                  <div
                    key={year}
                    className={`grid grid-cols-[80px_1fr_1fr] border-b last:border-0 ${
                      isConflict ? "bg-amber-50/50" : ""
                    }`}
                  >
                    <div className="px-3 py-3 flex items-start gap-1">
                      <span className="font-bold text-sm text-foreground">{year}</span>
                      {isConflict && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      )}
                    </div>

                    {/* Primary record */}
                    <div className={`px-3 py-3 border-l ${isConflict && chosen === "primary" ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}>
                      {pRec ? (
                        <div className="space-y-1">
                          <StatusBadge status={pRec.status} />
                          {pRec.notes && (
                            <p className="text-xs text-muted-foreground italic truncate">{pRec.notes}</p>
                          )}
                          {isConflict && (
                            <button
                              onClick={() => setResolutions({ ...resolutions, [year]: "primary" })}
                              className={`mt-1 text-xs px-2 py-0.5 rounded border transition-all ${
                                chosen === "primary"
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                              }`}
                            >
                              {chosen === "primary" ? "✓ Keep this" : "Keep this"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">No record</span>
                      )}
                    </div>

                    {/* Duplicate record */}
                    <div className={`px-3 py-3 border-l ${isConflict && chosen === "duplicate" ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}>
                      {dRec ? (
                        <div className="space-y-1">
                          <StatusBadge status={dRec.status} />
                          {dRec.notes && (
                            <p className="text-xs text-muted-foreground italic truncate">{dRec.notes}</p>
                          )}
                          {isConflict && (
                            <button
                              onClick={() => setResolutions({ ...resolutions, [year]: "duplicate" })}
                              className={`mt-1 text-xs px-2 py-0.5 rounded border transition-all ${
                                chosen === "duplicate"
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                              }`}
                            >
                              {chosen === "duplicate" ? "✓ Keep this" : "Keep this"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">No record</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {conflictYears.length > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {conflictYears.length} year{conflictYears.length !== 1 ? "s" : ""} have records on both clients — choose which to keep for each.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={mergeMutation.isPending}
            onClick={handleMerge}
            className="gap-1.5"
          >
            <GitMerge className="h-4 w-4" />
            {mergeMutation.isPending ? "Merging…" : `Merge into ${primaryName}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Duplicate Group ──────────────────────────────────────────────────────────

function DupGroup({
  title,
  description,
  items,
  onDismiss,
  onMerge,
  isDismissing,
}: {
  title: string;
  description: string;
  items: DupCandidate[];
  onDismiss: (pair: DupCandidate) => void;
  onMerge: (pair: DupCandidate) => void;
  isDismissing: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [, setLocation] = useLocation();

  if (items.length === 0) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            {items.length} pair{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div>
          <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border bg-muted/20">{description}</p>
          <div className="divide-y divide-border">
            {items.map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
                    <button
                      className="font-medium text-sm text-primary hover:underline truncate text-left"
                      onClick={() => setLocation(`/clients/${item.client1Id}`)}
                    >
                      {item.client1Name}
                    </button>
                    <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />
                    <button
                      className="font-medium text-sm text-primary hover:underline truncate text-left"
                      onClick={() => setLocation(`/clients/${item.client2Id}`)}
                    >
                      {item.client2Name}
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground hidden md:inline shrink-0 max-w-[200px] truncate">
                    {item.reason}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => onMerge(item)}
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    Merge
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                    disabled={isDismissing}
                    onClick={() => onDismiss(item)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Not a Duplicate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DuplicateReview() {
  const [mergingPair, setMergingPair] = useState<DupCandidate | null>(null);
  const utils = trpc.useUtils();

  const { data: candidates, isLoading } = trpc.duplicates.candidates.useQuery();

  const dismissMutation = trpc.duplicates.dismiss.useMutation({
    onSuccess: () => {
      toast.success("Pair dismissed — marked as not a duplicate.");
      utils.duplicates.candidates.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDismiss = (pair: DupCandidate) => {
    dismissMutation.mutate({
      client1Id: pair.client1Id,
      client2Id: pair.client2Id,
      dismissedBy: "Staff",
    });
  };

  const grouped = {
    name: (candidates ?? []).filter((c) => c.type === "name"),
    spouse: (candidates ?? []).filter((c) => c.type === "spouse"),
    business: (candidates ?? []).filter((c) => c.type === "business"),
  };
  const total = candidates?.length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-semibold">Duplicate Review</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review clients that may be duplicates. Merge them to consolidate records, or dismiss pairs that are not duplicates.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
          <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
          <p className="font-semibold text-foreground">No duplicates found</p>
          <p className="text-sm text-muted-foreground mt-1">
            All clients appear to be unique. Check back after adding more records.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{total}</span> potential duplicate pair{total !== 1 ? "s" : ""} found. Click <strong>Merge</strong> to consolidate, or <strong>Not a Duplicate</strong> to dismiss.
            </p>
          </div>

          <DupGroup
            title="Similar Names"
            description="Clients with the same last name and similar first names."
            items={grouped.name}
            onDismiss={handleDismiss}
            onMerge={setMergingPair}
            isDismissing={dismissMutation.isPending}
          />
          <DupGroup
            title="Shared Spouse Name"
            description="Two different clients share the same spouse or partner name."
            items={grouped.spouse}
            onDismiss={handleDismiss}
            onMerge={setMergingPair}
            isDismissing={dismissMutation.isPending}
          />
          <DupGroup
            title="Shared Business Name"
            description="Two different clients are linked to a business with the same name."
            items={grouped.business}
            onDismiss={handleDismiss}
            onMerge={setMergingPair}
            isDismissing={dismissMutation.isPending}
          />
        </div>
      )}

      {mergingPair && (
        <MergeDialog
          pair={mergingPair}
          onClose={() => setMergingPair(null)}
          onMerged={() => setMergingPair(null)}
        />
      )}
    </div>
  );
}
