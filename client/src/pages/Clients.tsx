import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ALL_STATUSES, type TaxStatus } from "@/components/StatusBadge";
import { FileText, Filter, Plus, Search, UserCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── Status color map ─────────────────────────────────────────────────────────
export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "In Vault":      { bg: "bg-teal-100",   text: "text-teal-800",   dot: "bg-teal-500" },
  "Contacted":     { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500" },
  "Scheduled":     { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  "Prepped for Pickup": { bg: "bg-amber-100",  text: "text-amber-800",  dot: "bg-amber-500" },
  "Picked Up":          { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500" },
  "Prepped for Mail":   { bg: "bg-amber-100",  text: "text-amber-800",  dot: "bg-amber-400" },
  "Mailed":             { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-emerald-400" },
  "Prep to Shred":      { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  "Shredded":      { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500" },
  "Hold":          { bg: "bg-slate-100",  text: "text-slate-700",  dot: "bg-slate-400" },
};

// ─── Quick status change badge with popover ───────────────────────────────────
function YearBadge({
  recordId,
  taxYear,
  status,
  onStatusChange,
}: {
  recordId: number;
  taxYear: number;
  status: string;
  onStatusChange: (id: number, newStatus: TaxStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const colors = STATUS_COLORS[status] ?? { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all hover:ring-2 hover:ring-offset-1 hover:ring-current ${colors.bg} ${colors.text}`}
          title={`${taxYear} — ${status}. Click to change status.`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
          {taxYear}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-44 p-1.5"
        side="bottom"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-0.5">
          {taxYear} — Change Status
        </p>
        {ALL_STATUSES.map((s) => {
          const c = STATUS_COLORS[s] ?? { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" };
          return (
            <button
              key={s}
              onClick={() => {
                onStatusChange(recordId, s);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium text-left transition-colors hover:bg-accent ${
                s === status ? `${c.bg} ${c.text}` : "text-foreground"
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
              {s}
              {s === status && <span className="ml-auto text-[10px] opacity-60">current</span>}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 p-3 bg-muted/40 rounded-lg border border-border text-xs">
      {Object.entries(STATUS_COLORS).map(([status, colors]) => (
        <span key={status} className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
          <span className="text-muted-foreground">{status}</span>
        </span>
      ))}
    </div>
  );
}

interface ClientFormData {
  firstName: string;
  lastName: string;
  spouseFirstName: string;
  spouseLastName: string;
  notes: string;
  isActive: boolean;
}

const defaultForm: ClientFormData = {
  firstName: "",
  lastName: "",
  spouseFirstName: "",
  spouseLastName: "",
  notes: "",
  isActive: true,
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);
const CLIENTS_FILTER_STORAGE_KEY = "taxace:clients-working-filters";

type SavedClientFilters = {
  search: string;
  statuses: TaxStatus[];
  years: number[];
  showInactive: boolean;
};

function loadSavedClientFilters(): SavedClientFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CLIENTS_FILTER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedClientFilters;
  } catch {
    return null;
  }
}

export default function Clients() {
  const initialFilters = useMemo(() => loadSavedClientFilters(), []);
  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<TaxStatus>>(new Set(initialFilters?.statuses ?? []));
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set(initialFilters?.years ?? []));
  const [showFilters, setShowFilters] = useState(false);
  const [showInactive, setShowInactive] = useState(initialFilters?.showInactive ?? false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientFormData>(defaultForm);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      CLIENTS_FILTER_STORAGE_KEY,
      JSON.stringify({
        search,
        statuses: Array.from(selectedStatuses),
        years: Array.from(selectedYears),
        showInactive,
      } satisfies SavedClientFilters)
    );
  }, [search, selectedStatuses, selectedYears, showInactive]);

  const { data: clients, isLoading: clientsLoading } = trpc.clients.listWithSummary.useQuery(
    { search: search.trim() || undefined, showInactive },
    { staleTime: 5000 }
  );

  const { data: records, isLoading: recordsLoading } = trpc.taxYearRecords.listAll.useQuery(
    { showInactive },
    { staleTime: 5000 }
  );

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (selectedStatuses.size === 0 && selectedYears.size === 0) return clients;
    if (!records) return [];

    return clients.filter((client) =>
      records.some((record) =>
        record.primaryClientId === client.id &&
        (selectedStatuses.size === 0 || selectedStatuses.has(record.status as TaxStatus)) &&
        (selectedYears.size === 0 || selectedYears.has(record.taxYear))
      )
    );
  }, [clients, records, selectedStatuses, selectedYears]);

  const isLoading = clientsLoading || ((selectedStatuses.size > 0 || selectedYears.size > 0) && recordsLoading);

  const toggleStatus = (status: TaxStatus) => {
    const next = new Set(selectedStatuses);
    if (next.has(status)) next.delete(status); else next.add(status);
    setSelectedStatuses(next);
  };

  const toggleYear = (year: number) => {
    const next = new Set(selectedYears);
    if (next.has(year)) next.delete(year); else next.add(year);
    setSelectedYears(next);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedStatuses(new Set());
    setSelectedYears(new Set());
    setShowInactive(false);
    if (typeof window !== "undefined") sessionStorage.removeItem(CLIENTS_FILTER_STORAGE_KEY);
  };

  const activeFilterCount = (selectedStatuses.size > 0 ? 1 : 0) + (selectedYears.size > 0 ? 1 : 0) + (search ? 1 : 0);

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.listWithSummary.invalidate();
      utils.clients.list.invalidate();
      utils.dashboard.stats.invalidate();
      setShowForm(false);
      setForm(defaultForm);
      toast.success("Client added successfully.");
    },
    onError: (e) => toast.error(`Failed to add client: ${e.message}`),
  });

  const quickStatusMutation = trpc.taxYearRecords.update.useMutation({
    onSuccess: () => {
      utils.clients.listWithSummary.invalidate();
      toast.success("Status updated.");
    },
    onError: (e) => toast.error(`Failed to update status: ${e.message}`),
  });

  const handleQuickStatusChange = (recordId: number, newStatus: TaxStatus) => {
    quickStatusMutation.mutate({ id: recordId, status: newStatus });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First name and last name are required.");
      return;
    }
    createMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      spouseFirstName: form.spouseFirstName.trim() || undefined,
      spouseLastName: form.spouseLastName.trim() || undefined,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {!isLoading ? `${filteredClients.length} client${filteredClients.length !== 1 ? "s" : ""}` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="clients-show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="clients-show-inactive" className="text-sm cursor-pointer">Show Inactive</Label>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Search + working filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or spouse…"
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
            <span className="ml-1 bg-white/20 text-xs rounded-full px-1.5 py-0.5 font-bold">{activeFilterCount}</span>
          )}
        </Button>
        {(activeFilterCount > 0 || showInactive) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((status) => {
                const active = selectedStatuses.has(status);
                const colors = STATUS_COLORS[status];
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? `${colors.bg} ${colors.text} ring-2 ring-offset-1 ring-current`
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tax Year</p>
            <div className="flex flex-wrap gap-2">
              {YEAR_OPTIONS.map((year) => {
                const active = selectedYears.has(year);
                return (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary ring-2 ring-offset-1 ring-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(selectedStatuses.size > 0 || selectedYears.size > 0) && (
        <div className="flex flex-wrap gap-2">
          {Array.from(selectedStatuses).map((status) => {
            const colors = STATUS_COLORS[status];
            return (
              <span key={status} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                {status}
                <button onClick={() => toggleStatus(status)} className="hover:opacity-70"><X className="h-3 w-3" /></button>
              </span>
            );
          })}
          {Array.from(selectedYears).sort((a, b) => b - a).map((year) => (
            <span key={year} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/30">
              {year}
              <button onClick={() => toggleYear(year)} className="hover:opacity-70"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Color Legend */}
      <StatusLegend />

      {/* Client list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UserCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No clients found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Try a different search term." : "Add your first client to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Client Name</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Spouse / Partner</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Tax Years
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/60">(click badge to change status)</span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client, idx) => {
                const hasNotes = !!(client as any).notes?.trim();
                const taxYears: any[] = (client as any).taxYearSummary?.filter((r: any) => !r.isArchived) ?? [];
                return (
                  <tr
                    key={client.id}
                    className={`border-b last:border-0 hover:bg-accent/50 cursor-pointer transition-colors ${
                      idx % 2 === 0 ? "" : "bg-muted/20"
                    }`}
                    onClick={() => setLocation(`/clients/${client.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {client.lastName}, {client.firstName}
                        </span>
                        {hasNotes && (
                          <span title="This client has notes">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                      {(client as any).businessNames?.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                          {(client as any).businessNames.join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {((client as any).spouseFirstName || (client as any).spouseLastName)
                        ? [(client as any).spouseFirstName, (client as any).spouseLastName].filter(Boolean).join(" ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                        {taxYears.map((r: any) => (
                          <YearBadge
                            key={r.id}
                            recordId={r.id}
                            taxYear={r.taxYear}
                            status={r.status}
                            onStatusChange={handleQuickStatusChange}
                          />
                        ))}
                        {taxYears.length === 0 && (
                          <span className="text-muted-foreground text-xs">No records</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          client.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {client.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Maria"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Lopez"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Spouse / Partner Name</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={form.spouseFirstName}
                  onChange={(e) => setForm({ ...form, spouseFirstName: e.target.value })}
                  placeholder="First name"
                />
                <Input
                  value={form.spouseLastName}
                  onChange={(e) => setForm({ ...form, spouseLastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any general notes about this client…"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="isActive">Active Client</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding…" : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
