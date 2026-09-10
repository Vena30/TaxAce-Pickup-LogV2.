import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ALL_STATUSES, StatusBadge, StatusOption, type TaxStatus } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { Search, SortAsc, SortDesc, CheckSquare, X, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);

interface RecordsListProps {
  title: string;
  description: string;
  filterStatus?: TaxStatus;
}

type SortField = "clientName" | "taxYear" | "statusDate" | "status";
type SortDir = "asc" | "desc";

const ALL_RECORDS_FILTER_STORAGE_KEY = "taxace:all-records-working-filters";

type SavedRecordsFilters = {
  search: string;
  statuses: TaxStatus[];
  years: number[];
  showArchived: boolean;
  showInactive: boolean;
};

function loadSavedAllRecordsFilters(): SavedRecordsFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ALL_RECORDS_FILTER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedRecordsFilters;
  } catch {
    return null;
  }
}

// Color map matching StatusBadge CSS classes for filter chips
const STATUS_CHIP_CLASSES: Record<TaxStatus, string> = {
  "In Vault":      "bg-teal-100 text-teal-800 border-teal-300",
  "Contacted":     "bg-blue-100 text-blue-800 border-blue-300",
  "Scheduled":     "bg-purple-100 text-purple-800 border-purple-300",
  "Prepped for Pickup":  "bg-amber-100 text-amber-800 border-amber-300",
  "Picked Up":          "bg-green-100 text-green-800 border-green-300",
  "Prepped for Mail":   "bg-amber-100 text-amber-800 border-amber-300",
  "Mailed":             "bg-green-100 text-green-800 border-green-300",
  "Prep to Shred":      "bg-orange-100 text-orange-800 border-orange-300",
  "Shredded":      "bg-red-100 text-red-800 border-red-300",
  "Hold":          "bg-slate-100 text-slate-700 border-slate-300",
};

// ─── Status popover for inline status change ─────────────────────────────────
function StatusPopover({
  recordId,
  status,
  onStatusChange,
}: {
  recordId: number;
  status: TaxStatus;
  onStatusChange: (id: number, newStatus: TaxStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const colors = STATUS_CHIP_CLASSES[status] ?? "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:ring-2 hover:ring-offset-1 hover:ring-current ${colors}`}
          title={`${status}. Click to change status.`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
          {status}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1.5"
        side="bottom"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-0.5">Change Status</p>
        {ALL_STATUSES.map((s) => {
          const c = STATUS_CHIP_CLASSES[s] ?? "bg-gray-100 text-gray-700 border-gray-300";
          return (
            <button
              key={s}
              onClick={() => { onStatusChange(recordId, s); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium text-left transition-colors hover:bg-accent ${
                s === status ? c : "text-foreground"
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.split(" ")[0].replace("bg-", "bg-").replace("-100", "-400")}`} />
              {s}
              {s === status && <span className="ml-auto text-[10px] opacity-60">current</span>}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export default function RecordsList({ title, description, filterStatus }: RecordsListProps) {
  const initialFilters = useMemo(
    () => (filterStatus ? null : loadSavedAllRecordsFilters()),
    [filterStatus]
  );
  const [search, setSearch] = useState(initialFilters?.search ?? "");
  // Multi-select status filter — empty = all. Status-specific tabs use only their fixed route status.
  const [selectedStatuses, setSelectedStatuses] = useState<Set<TaxStatus>>(
    filterStatus ? new Set([filterStatus]) : new Set(initialFilters?.statuses ?? [])
  );
  // Multi-select year filter — empty = all
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set(initialFilters?.years ?? []));
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(initialFilters?.showArchived ?? false);
  const [showInactive, setShowInactive] = useState(initialFilters?.showInactive ?? false);
  const [sortField, setSortField] = useState<SortField>("clientName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<TaxStatus | "">("");
  const [, setLocation] = useLocation();

  const utils = trpc.useUtils();

  useEffect(() => {
    if (filterStatus || typeof window === "undefined") return;
    sessionStorage.setItem(
      ALL_RECORDS_FILTER_STORAGE_KEY,
      JSON.stringify({
        search,
        statuses: Array.from(selectedStatuses),
        years: Array.from(selectedYears),
        showArchived,
        showInactive,
      } satisfies SavedRecordsFilters)
    );
  }, [filterStatus, search, selectedStatuses, selectedYears, showArchived, showInactive]);

  const { data: records, isLoading } = trpc.taxYearRecords.listAll.useQuery(
    {
      statuses: filterStatus ? [filterStatus as any] : undefined,
      showArchived,
      showInactive,
    },
    { staleTime: 10_000 }
  );

  const bulkUpdateMutation = trpc.bulk.updateStatus.useMutation({
    onSuccess: (result) => {
      const { updated, skipped } = result as { updated: number; skipped: number };
      if (skipped > 0) {
        toast.success(`${updated} updated, ${skipped} skipped (already Picked Up or Shredded)`);
      } else {
        toast.success(`${updated} record${updated !== 1 ? "s" : ""} updated`);
      }
      setSelectedIds(new Set());
      setBulkStatus("");
      utils.taxYearRecords.listAll.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => {
      toast.error(`Bulk update failed: ${err.message}`);
    },
  });

  const singleUpdateMutation = trpc.taxYearRecords.update.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listAll.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Status updated.");
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let result = [...records];

    // Multi-status filter
    if (selectedStatuses.size > 0) {
      result = result.filter((r) => selectedStatuses.has(r.status as TaxStatus));
    }
    // Multi-year filter
    if (selectedYears.size > 0) {
      result = result.filter((r) => selectedYears.has(r.taxYear));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.clientName?.toLowerCase().includes(q) ||
          r.businessName?.toLowerCase().includes(q) ||
          r.primaryClientName?.toLowerCase().includes(q) ||
          String(r.taxYear).includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      if (sortField === "clientName") {
        aVal = (a.clientName ?? a.businessName ?? "").toLowerCase();
        bVal = (b.clientName ?? b.businessName ?? "").toLowerCase();
      } else if (sortField === "taxYear") {
        aVal = a.taxYear; bVal = b.taxYear;
      } else if (sortField === "statusDate") {
        aVal = a.statusDate ? new Date(a.statusDate).getTime() : 0;
        bVal = b.statusDate ? new Date(b.statusDate).getTime() : 0;
      } else if (sortField === "status") {
        aVal = a.status; bVal = b.status;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, search, selectedStatuses, selectedYears, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <SortAsc className="h-3.5 w-3.5 inline ml-1" /> : <SortDesc className="h-3.5 w-3.5 inline ml-1" />;
  };

  const allFilteredIds = filtered.map((r) => r.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = allFilteredIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allFilteredIds));
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkUpdate = () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: bulkStatus as TaxStatus });
  };

  const toggleStatus = (s: TaxStatus) => {
    const next = new Set(selectedStatuses);
    if (next.has(s)) next.delete(s); else next.add(s);
    setSelectedStatuses(next);
  };

  const toggleYear = (y: number) => {
    const next = new Set(selectedYears);
    if (next.has(y)) next.delete(y); else next.add(y);
    setSelectedYears(next);
  };

  const clearFilters = () => {
    setSelectedStatuses(filterStatus ? new Set([filterStatus]) : new Set());
    setSelectedYears(new Set());
    setSearch("");
    setShowArchived(false);
    setShowInactive(false);
    if (!filterStatus && typeof window !== "undefined") {
      sessionStorage.removeItem(ALL_RECORDS_FILTER_STORAGE_KEY);
    }
  };

  const activeFilterCount = (selectedStatuses.size > (filterStatus ? 1 : 0) ? 1 : 0) + (selectedYears.size > 0 ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Switch
              id={`show-archived-${filterStatus ?? "all"}`}
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor={`show-archived-${filterStatus ?? "all"}`} className="text-sm cursor-pointer">Show Archived</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`show-inactive-${filterStatus ?? "all"}`}
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor={`show-inactive-${filterStatus ?? "all"}`} className="text-sm cursor-pointer">Show Inactive</Label>
          </div>
        </div>
      </div>

      {/* Search + Filter Toggle Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client or business…"
            className="pl-9"
          />
        </div>

        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-white/20 text-xs rounded-full px-1.5 py-0.5 font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {(activeFilterCount > 0 || showArchived || showInactive) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          {isLoading ? "Loading…" : `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Expanded Filter Panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          {/* Status filter chips */}
          {!filterStatus && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map((s) => {
                  const active = selectedStatuses.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        active
                          ? STATUS_CHIP_CLASSES[s] + " ring-2 ring-offset-1 ring-current"
                          : "bg-muted text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Year filter chips */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tax Year</p>
            <div className="flex flex-wrap gap-2">
              {YEAR_OPTIONS.map((y) => {
                const active = selectedYears.has(y);
                return (
                  <button
                    key={y}
                    onClick={() => toggleYear(y)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary ring-2 ring-offset-1 ring-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active filter summary chips */}
      {((!filterStatus && selectedStatuses.size > 0) || selectedYears.size > 0) && (
        <div className="flex flex-wrap gap-2">
          {!filterStatus && Array.from(selectedStatuses).map((s) => (
            <span key={s} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CHIP_CLASSES[s]}`}>
              {s}
              <button onClick={() => toggleStatus(s)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {Array.from(selectedYears).sort((a, b) => b - a).map((y) => (
            <span key={y} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/30">
              {y}
              <button onClick={() => toggleYear(y)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as TaxStatus)}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="Change status to…" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}><StatusOption status={s} /></SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!bulkStatus || bulkUpdateMutation.isPending}
              onClick={handleBulkUpdate}
              className="h-8"
            >
              {bulkUpdateMutation.isPending ? "Updating…" : "Apply"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => { setSelectedIds(new Set()); setBulkStatus(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground font-medium">No records found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || selectedStatuses.size > 0 || selectedYears.size > 0
              ? "Try adjusting your filters."
              : "No records match this view yet."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className={someSelected && !allSelected ? "opacity-50" : ""}
                  />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort("clientName")}
                >
                  Client / Business <SortIcon field="clientName" />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none w-28"
                  onClick={() => toggleSort("taxYear")}
                >
                  Tax Year <SortIcon field="taxYear" />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort("status")}
                >
                  Status &amp; Date <SortIcon field="status" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                  Communication Status &amp; Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record, idx) => (
                <tr
                  key={record.id}
                  className={`border-b last:border-0 transition-colors ${
                    record.isArchived ? "opacity-50" :
                    selectedIds.has(record.id)
                      ? "bg-primary/5"
                      : idx % 2 === 0
                      ? "hover:bg-accent/50"
                      : "bg-muted/20 hover:bg-accent/50"
                  }`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(record.id)}
                      onCheckedChange={() => toggleSelect(record.id)}
                      aria-label={`Select record ${record.id}`}
                    />
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => setLocation(`/clients/${record.primaryClientId}`)}
                  >
                    {record.businessName ? (
                      <div>
                        <span className="font-medium text-foreground">{record.businessName}</span>
                        {record.primaryClientName && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({record.primaryClientName})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-medium text-foreground">
                        {record.clientName || <span className="text-muted-foreground italic">Unknown Client</span>}
                      </span>
                    )}
                    {record.isArchived && (
                      <span className="ml-2 text-xs text-muted-foreground italic">(archived)</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 font-semibold text-foreground cursor-pointer"
                    onClick={() => setLocation(`/clients/${record.primaryClientId}`)}
                  >
                    {record.taxYear}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <StatusPopover
                        recordId={record.id}
                        status={record.status as TaxStatus}
                        onStatusChange={(id, newStatus) =>
                          singleUpdateMutation.mutate({ id, status: newStatus })
                        }
                      />
                      {record.statusDate && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(record.statusDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      {record.commStatus && record.commStatus !== "Not Contacted" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground text-xs font-medium">
                          {record.commStatus}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                      {record.commDate && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(record.commDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
