import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Building2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  History,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { ALL_STATUSES, ALL_COMM_STATUSES, StatusBadge, StatusOption, COMM_STATUS_DOT_COLORS, type TaxStatus, type CommStatus } from "@/components/StatusBadge";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

// ─── Tax Year Record Form ─────────────────────────────────────────────────────


interface TaxYearFormData {
  taxYear: number;
  status: TaxStatus;
  commStatus: CommStatus;
  commDate: string;
  statusDate: string;
  printedCopy: "Yes" | "No" | "";
  notes: string;
}

const defaultTaxForm: TaxYearFormData = {
  taxYear: CURRENT_YEAR,
  status: "In Vault",
  commStatus: "Not Contacted",
  commDate: "",
  statusDate: "",
  printedCopy: "",
  notes: "",
};

function TaxYearForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  title,
}: {
  initial?: Partial<TaxYearFormData>;
  onSubmit: (data: TaxYearFormData) => void;
  onCancel: () => void;
  isPending: boolean;
  title: string;
}) {
  const [form, setForm] = useState<TaxYearFormData>({ ...defaultTaxForm, ...initial });

  const handleStatusChange = (status: TaxStatus) => {
    const updates: Partial<TaxYearFormData> = {
      status,
      statusDate: new Date().toISOString().split("T")[0],
    };
    setForm({ ...form, ...updates });
  };

  const handleCommStatusChange = (commStatus: CommStatus) => {
    const updates: Partial<TaxYearFormData> = {
      commStatus,
      commDate: new Date().toISOString().split("T")[0],
    };
    if (commStatus === "Spoke to Client") {
      updates.status = "Contacted";
    }
    setForm({ ...form, ...updates });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tax Year *</Label>
          <Select
            value={String(form.taxYear)}
            onValueChange={(v) => setForm({ ...form, taxYear: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={form.status} onValueChange={(v) => handleStatusChange(v as TaxStatus)}>
            <SelectTrigger>
              <StatusBadge status={form.status} />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <StatusOption status={s} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Communication Status</Label>
          <Select value={form.commStatus} onValueChange={(v) => handleCommStatusChange(v as CommStatus)}>
            <SelectTrigger>
              <span className="flex items-center gap-1.5 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${COMM_STATUS_DOT_COLORS[form.commStatus] ?? 'bg-gray-400'}`} />
                {form.commStatus || "Not Contacted"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {ALL_COMM_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${COMM_STATUS_DOT_COLORS[s] ?? 'bg-gray-400'}`} />
                    {s}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Communication Date</Label>
          <Input
            type="date"
            value={form.commDate}
            onChange={(e) => setForm({ ...form, commDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status Date</Label>
          <Input
            type="date"
            value={form.statusDate}
            onChange={(e) => setForm({ ...form, statusDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Printed Copy</Label>
          <Select
            value={form.printedCopy || "none"}
            onValueChange={(v) =>
              setForm({ ...form, printedCopy: v === "none" ? "" : (v as "Yes" | "No") })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Any notes about this tax year record…"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : title}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Tax Year Row (inline dropdown editing) ──────────────────────────────────

function TaxYearRow({
  record,
  onEdit,
  onDelete,
  onArchive,
  onUpdate,
  isSelected,
  onToggleSelect,
  isAdmin,
}: {
  record: any;
  onEdit: (record: any) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number, archive: boolean) => void;
  onUpdate: (id: number, field: string, value: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  isAdmin?: boolean;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: history } = trpc.history.getByRecord.useQuery(
    { taxYearRecordId: record.id },
    { enabled: historyOpen }
  );
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isArchived = record.isArchived;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      isSelected ? "border-primary/50 bg-primary/5" :
      isArchived ? "opacity-60 border-dashed border-muted" : "border-border"
    }`}>
      <div className="flex items-center justify-between px-3 py-2.5 bg-card hover:bg-accent/20 transition-colors gap-2">
        {/* Archive Confirm Dialog */}
        <Dialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Archive Record?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This will archive the <strong>{record.taxYear}</strong> tax year record. You can restore it later using the <strong>Show Archived</strong> toggle.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowArchiveConfirm(false)}>Cancel</Button>
              <Button onClick={() => { onArchive(record.id, true); setShowArchiveConfirm(false); }}>Archive</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Delete Confirm Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete Record?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This will <strong>permanently delete</strong> the <strong>{record.taxYear}</strong> tax year record. This cannot be undone. Consider archiving instead.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { onDelete(record.id); setShowDeleteConfirm(false); }}>Delete Permanently</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Checkbox */}
        {onToggleSelect && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected ?? false}
              onCheckedChange={() => onToggleSelect(record.id)}
              aria-label={`Select ${record.taxYear}`}
              className="mr-1"
            />
          </div>
        )}
        {/* Year */}
        <span className="font-bold text-foreground w-12 shrink-0 text-sm">{record.taxYear}</span>

        {/* Status + Date grouped cell */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Select
            value={record.status}
            onValueChange={(v) => onUpdate(record.id, "status", v)}
          >
            <SelectTrigger className="h-7 text-xs w-auto shrink-0 border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>span]:flex [&>span]:items-center">
              <StatusBadge status={record.status} />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  <StatusOption status={s} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {record.statusDate && (
            <span className="text-xs text-muted-foreground shrink-0">
              {new Date(record.statusDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Comm Status + Date grouped cell */}
        <div className="flex items-center gap-2 flex-1 min-w-0 hidden md:flex">
          <Select
            value={record.commStatus ?? "Not Contacted"}
            onValueChange={(v) => onUpdate(record.id, "commStatus", v)}
          >
            <SelectTrigger className="h-7 text-xs w-auto shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_COMM_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {record.commDate && (
            <span className="text-xs text-muted-foreground shrink-0">
              {new Date(record.commDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0 ml-auto">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="View history"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="Edit details"
            onClick={() => onEdit(record)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-7 w-7 p-0 ${isArchived ? "text-primary" : "text-muted-foreground"}`}
            title={isArchived ? "Unarchive record" : "Archive record"}
            onClick={() => {
              if (isArchived) { onArchive(record.id, false); }
              else { setShowArchiveConfirm(true); }
            }}
          >
            {isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Delete record (admin only)"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {record.notes && (
        <div className="px-3 py-1.5 bg-muted/30 text-xs text-muted-foreground border-t border-border">
          {record.notes}
        </div>
      )}

      {historyOpen && (
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Change History
          </p>
          {!history || history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No history recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-2 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-foreground">{h.description}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(h.createdAt).toLocaleString()}
                      {h.userName ? ` · ${h.userName}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Business Section ─────────────────────────────────────────────────────────

function BusinessSection({
  business,
  clientId,
  isAdmin,
}: {
  business: any;
  clientId: number;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [selectedBizIds, setSelectedBizIds] = useState<Set<number>>(new Set());
  const [bulkBizStatus, setBulkBizStatus] = useState<TaxStatus | "">("");
  const utils = trpc.useUtils();

  const { data: records } = trpc.taxYearRecords.listByBusiness.useQuery({
    businessId: business.id,
  });

  const createRecord = trpc.taxYearRecords.create.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByBusiness.invalidate({ businessId: business.id });
      setShowAddRecord(false);
      toast.success("Tax year record added.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRecord = trpc.taxYearRecords.update.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByBusiness.invalidate({ businessId: business.id });
      setEditingRecord(null);
      toast.success("Record updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRecord = trpc.taxYearRecords.softDelete.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByBusiness.invalidate({ businessId: business.id });
      toast.success("Record removed.");
    },
  });

  const archiveRecord = trpc.taxYearRecords.archive.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByBusiness.invalidate({ businessId: business.id });
    },
    onError: (e) => toast.error(e.message),
  });

  const inlineUpdateRecord = trpc.taxYearRecords.update.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByBusiness.invalidate({ businessId: business.id });
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkUpdateBizRecords = trpc.bulk.updateStatus.useMutation({
    onSuccess: (result) => {
      const { updated, skipped } = result as { updated: number; skipped: number };
      if (skipped > 0) {
        toast.success(`${updated} updated, ${skipped} skipped (already Picked Up or Shredded)`);
      } else {
        toast.success(`${updated} record${updated !== 1 ? "s" : ""} updated`);
      }
      setSelectedBizIds(new Set());
      setBulkBizStatus("");
      utils.taxYearRecords.listByBusiness.invalidate({ businessId: business.id });
      utils.dashboard.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{business.name}</span>
            <span className="text-xs text-muted-foreground">
              ({records?.length ?? 0} record{records?.length !== 1 ? "s" : ""})
            </span>
          </div>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 py-3 space-y-2">
            {records?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tax year records yet.</p>
            ) : (
              <div className="space-y-2">
                {/* Column Headers */}
                {records && records.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                    <span className="w-4 shrink-0" />
                    <span className="w-12 shrink-0">Year</span>
                    <span className="w-36 shrink-0">Status</span>
                    <span className="w-36 shrink-0 hidden md:block">Contact Status</span>
                    <span className="flex-1 hidden xl:block">Date</span>
                    <span className="ml-auto">Actions</span>
                  </div>
                )}
                {/* Select All + Bulk Action Bar */}
                {records && records.length > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg border border-border">
                    <Checkbox
                      checked={selectedBizIds.size === records.length && records.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedBizIds(new Set(records.map((r) => r.id)));
                        else setSelectedBizIds(new Set());
                      }}
                      aria-label="Select all business records"
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedBizIds.size > 0
                        ? `${selectedBizIds.size} of ${records.length} selected`
                        : "Select all"}
                    </span>
                    {selectedBizIds.size > 0 && (
                      <div className="flex items-center gap-2 ml-auto">
                        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                        <Select value={bulkBizStatus} onValueChange={(v) => setBulkBizStatus(v as TaxStatus)}>
                          <SelectTrigger className="w-44 h-7 text-xs">
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
                          className="h-7 text-xs"
                          disabled={!bulkBizStatus || bulkUpdateBizRecords.isPending}
                          onClick={() => {
                            if (!bulkBizStatus) return;
                            bulkUpdateBizRecords.mutate({
                              ids: Array.from(selectedBizIds),
                              status: bulkBizStatus as TaxStatus,
                            });
                          }}
                        >
                          {bulkUpdateBizRecords.isPending ? "Updating…" : "Apply"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => { setSelectedBizIds(new Set()); setBulkBizStatus(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {records?.map((r) => (
                  <TaxYearRow
                    key={r.id}
                    record={r}
                    onEdit={setEditingRecord}
                    onDelete={(id: number) => deleteRecord.mutate({ id })}
                    onArchive={(id: number, archive: boolean) => archiveRecord.mutate({ id, archive })}
                    onUpdate={(id: number, field: string, value: string) => {
                      if (field === "status") inlineUpdateRecord.mutate({ id, status: value as any });
                      else if (field === "commStatus") inlineUpdateRecord.mutate({ id, commStatus: value as any });
                    }}
                    isSelected={selectedBizIds.has(r.id)}
                    onToggleSelect={(id: number) => {
                      const next = new Set(selectedBizIds);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      setSelectedBizIds(next);
                    }}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 mt-2"
              onClick={() => setShowAddRecord(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Tax Year
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Add Record Dialog */}
      <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Tax Year — {business.name}</DialogTitle>
          </DialogHeader>
          <TaxYearForm
            onSubmit={(data) =>
              createRecord.mutate({
                businessId: business.id,
                taxYear: data.taxYear,
                status: data.status,
                commStatus: data.commStatus || undefined,
                commDate: data.commDate || undefined,
                statusDate: data.statusDate || undefined,
                printedCopy: data.printedCopy || undefined,
                notes: data.notes || undefined,
              })
            }
            onCancel={() => setShowAddRecord(false)}
            isPending={createRecord.isPending}
            title="Add Record"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tax Year {editingRecord?.taxYear} — {business.name}</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <TaxYearForm
              initial={{
                taxYear: editingRecord.taxYear,
                status: editingRecord.status,
                commStatus: (editingRecord.commStatus ?? "Not Contacted") as CommStatus,
                commDate: editingRecord.commDate
                  ? new Date(editingRecord.commDate).toISOString().split("T")[0]
                  : "",
                statusDate: editingRecord.statusDate
                  ? new Date(editingRecord.statusDate).toISOString().split("T")[0]
                  : "",
                printedCopy: editingRecord.printedCopy ?? "",
                notes: editingRecord.notes ?? "",
              }}
              onSubmit={(data) =>
                updateRecord.mutate({
                  id: editingRecord.id,
                  status: data.status,
                  commStatus: data.commStatus || null,
                  commDate: data.commDate || null,
                  statusDate: data.statusDate || null,
                  printedCopy: data.printedCopy || null,
                  notes: data.notes || null,
                  taxYear: data.taxYear,
                })
              }
              onCancel={() => setEditingRecord(null)}
              isPending={updateRecord.isPending}
              title="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Client Profile ──────────────────────────────────────────────────────

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: staffUser } = trpc.staffAuth.me.useQuery(undefined, { retry: false });
  const isAdmin = staffUser?.role === "admin";

  const [showEditClient, setShowEditClient] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    spouseFirstName: "",
    spouseLastName: "",
    notes: "",
    isActive: true,
  });
  const [businessName, setBusinessName] = useState("");
  const [businessNotes, setBusinessNotes] = useState("");

  const { data: client, isLoading } = trpc.clients.getById.useQuery(
    { id: clientId }
  );

  // Sync edit form when client loads
  const prevClientId = useRef<number | null>(null);
  if (client && prevClientId.current !== clientId) {
    prevClientId.current = clientId;
    setEditForm({
      firstName: client.firstName,
      lastName: client.lastName,
      spouseFirstName: (client as any).spouseFirstName ?? "",
      spouseLastName: (client as any).spouseLastName ?? "",
      notes: client.notes ?? "",
      isActive: client.isActive,
    });
  }

  const [showArchivedPersonal, setShowArchivedPersonal] = useState(false);
  const [selectedPersonalIds, setSelectedPersonalIds] = useState<Set<number>>(new Set());
  const [bulkPersonalStatus, setBulkPersonalStatus] = useState<TaxStatus | "">("");
  const { data: businesses } = trpc.businesses.listByClient.useQuery({ clientId });
  const { data: personalRecords } = trpc.taxYearRecords.listByClient.useQuery({ clientId, showArchived: showArchivedPersonal });

  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.getById.invalidate({ id: clientId });
      utils.clients.list.invalidate();
      setShowEditClient(false);
      toast.success("Client updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const softDeleteClient = trpc.clients.softDelete.useMutation({
    onSuccess: () => {
      setLocation("/clients");
      toast.success("Client removed.");
    },
  });

  const createBusiness = trpc.businesses.create.useMutation({
    onSuccess: () => {
      utils.businesses.listByClient.invalidate({ clientId });
      setShowAddBusiness(false);
      setBusinessName("");
      setBusinessNotes("");
      toast.success("Business added.");
    },
    onError: (e) => toast.error(e.message),
  });

  const createRecord = trpc.taxYearRecords.create.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByClient.invalidate({ clientId });
      utils.dashboard.stats.invalidate();
      setShowAddRecord(false);
      toast.success("Tax year record added.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRecord = trpc.taxYearRecords.update.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByClient.invalidate({ clientId });
      setEditingRecord(null);
      toast.success("Record updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRecord = trpc.taxYearRecords.softDelete.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByClient.invalidate({ clientId });
      utils.dashboard.stats.invalidate();
      toast.success("Record removed.");
    },
  });

  const archivePersonalRecord = trpc.taxYearRecords.archive.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByClient.invalidate({ clientId });
    },
    onError: (e) => toast.error(e.message),
  });

  const inlineUpdatePersonalRecord = trpc.taxYearRecords.update.useMutation({
    onSuccess: () => {
      utils.taxYearRecords.listByClient.invalidate({ clientId });
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkUpdatePersonalRecords = trpc.bulk.updateStatus.useMutation({
    onSuccess: (result) => {
      const { updated, skipped } = result as { updated: number; skipped: number };
      if (skipped > 0) {
        toast.success(`${updated} updated, ${skipped} skipped (already Picked Up or Shredded)`);
      } else {
        toast.success(`${updated} record${updated !== 1 ? "s" : ""} updated`);
      }
      setSelectedPersonalIds(new Set());
      setBulkPersonalStatus("");
      utils.taxYearRecords.listByClient.invalidate({ clientId });
      utils.dashboard.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="link" onClick={() => setLocation("/clients")}>
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => setLocation("/clients")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </button>
          <h2 className="text-2xl font-bold text-foreground">
            {client.firstName} {client.lastName}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                client.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {client.isActive ? "Active" : "Inactive"}
            </span>
            {client.spouseName && (
              <span className="text-sm text-muted-foreground">
                & {client.spouseName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setEditForm({
                firstName: client.firstName,
                lastName: client.lastName,
                spouseFirstName: (client as any).spouseFirstName ?? "",
                spouseLastName: (client as any).spouseLastName ?? "",
                notes: client.notes ?? "",
                isActive: client.isActive,
              });
              setShowEditClient(true);
            }}
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Client Info Card */}
      {client.notes && (
        <div className="bg-card border border-border rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Notes
          </p>
          <p className="text-sm text-foreground">{client.notes}</p>
        </div>
      )}

      {/* Personal Tax Year Records */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Personal Tax Year Records
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({personalRecords?.length ?? 0})
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchivedPersonal(!showArchivedPersonal)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                showArchivedPersonal
                  ? "bg-muted text-foreground border-border"
                  : "text-muted-foreground border-transparent hover:border-border"
              }`}
            >
              {showArchivedPersonal ? "Hide Archived" : "Show Archived"}
            </button>
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddRecord(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Tax Year
            </Button>
          </div>
        </div>

        {personalRecords?.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-8 text-center">
            <p className="text-sm text-muted-foreground">No personal tax year records yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Column Headers */}
            {personalRecords && personalRecords.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                <span className="w-4 shrink-0" />{/* checkbox placeholder */}
                <span className="w-12 shrink-0">Year</span>
                <span className="flex-1 shrink-0">Status &amp; Date</span>
                <span className="flex-1 shrink-0 hidden md:block">Communication Status &amp; Date</span>
                <span className="ml-auto">Actions</span>
              </div>
            )}
            {/* Select All + Bulk Action Bar */}
            {personalRecords && personalRecords.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg border border-border">
                <Checkbox
                  checked={selectedPersonalIds.size === personalRecords.length && personalRecords.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedPersonalIds(new Set(personalRecords.map((r) => r.id)));
                    else setSelectedPersonalIds(new Set());
                  }}
                  aria-label="Select all personal records"
                />
                <span className="text-xs text-muted-foreground">
                  {selectedPersonalIds.size > 0
                    ? `${selectedPersonalIds.size} of ${personalRecords.length} selected`
                    : "Select all"}
                </span>
                {selectedPersonalIds.size > 0 && (
                  <div className="flex items-center gap-2 ml-auto">
                    <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                    <Select value={bulkPersonalStatus} onValueChange={(v) => setBulkPersonalStatus(v as TaxStatus)}>
                      <SelectTrigger className="w-44 h-7 text-xs">
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
                      className="h-7 text-xs"
                      disabled={!bulkPersonalStatus || bulkUpdatePersonalRecords.isPending}
                      onClick={() => {
                        if (!bulkPersonalStatus) return;
                        bulkUpdatePersonalRecords.mutate({
                          ids: Array.from(selectedPersonalIds),
                          status: bulkPersonalStatus as TaxStatus,
                        });
                      }}
                    >
                      {bulkUpdatePersonalRecords.isPending ? "Updating…" : "Apply"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => { setSelectedPersonalIds(new Set()); setBulkPersonalStatus(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
            {personalRecords?.map((r) => (
              <TaxYearRow
                key={r.id}
                record={r}
                onEdit={setEditingRecord}
                onDelete={(id: number) => deleteRecord.mutate({ id })}
                onArchive={(id: number, archive: boolean) => archivePersonalRecord.mutate({ id, archive })}
                onUpdate={(id: number, field: string, value: string) => {
                  if (field === "status") inlineUpdatePersonalRecord.mutate({ id, status: value as any });
                  else if (field === "commStatus") inlineUpdatePersonalRecord.mutate({ id, commStatus: value as any });
                }}
                isSelected={selectedPersonalIds.has(r.id)}
                onToggleSelect={(id: number) => {
                  const next = new Set(selectedPersonalIds);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  setSelectedPersonalIds(next);
                }}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Connected Businesses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Connected Businesses
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({businesses?.length ?? 0})
            </span>
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowAddBusiness(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Business
          </Button>
        </div>

        {businesses?.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-8 text-center">
            <p className="text-sm text-muted-foreground">No connected businesses.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses?.map((biz) => (
              <BusinessSection key={biz.id} business={biz} clientId={clientId} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={showEditClient} onOpenChange={setShowEditClient}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateClient.mutate({
                id: clientId,
                firstName: editForm.firstName.trim(),
                lastName: editForm.lastName.trim(),
                spouseFirstName: editForm.spouseFirstName.trim() || null,
                  spouseLastName: editForm.spouseLastName.trim() || null,
                notes: editForm.notes.trim() || null,
                isActive: editForm.isActive,
              });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Spouse / Partner Name</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={editForm.spouseFirstName}
                  onChange={(e) => setEditForm({ ...editForm, spouseFirstName: e.target.value })}
                  placeholder="First name"
                />
                <Input
                  value={editForm.spouseLastName}
                  onChange={(e) => setEditForm({ ...editForm, spouseLastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(v) => setEditForm({ ...editForm, isActive: v })}
              />
              <Label>Active Client</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditClient(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateClient.isPending}>
                {updateClient.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Business Dialog */}
      <Dialog open={showAddBusiness} onOpenChange={setShowAddBusiness}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Connected Business</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!businessName.trim()) return;
              createBusiness.mutate({
                clientId,
                name: businessName.trim(),
                notes: businessNotes.trim() || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Business Name *</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Maria Consulting LLC"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={businessNotes}
                onChange={(e) => setBusinessNotes(e.target.value)}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddBusiness(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBusiness.isPending}>
                {createBusiness.isPending ? "Adding…" : "Add Business"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Personal Tax Year Record Dialog */}
      <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Add Tax Year — {client.firstName} {client.lastName}
            </DialogTitle>
          </DialogHeader>
          <TaxYearForm
            onSubmit={(data) =>
              createRecord.mutate({
                clientId,
                taxYear: data.taxYear,
                status: data.status,
                commStatus: data.commStatus || undefined,
                commDate: data.commDate || undefined,
                statusDate: data.statusDate || undefined,
                printedCopy: data.printedCopy || undefined,
                notes: data.notes || undefined,
              })
            }
            onCancel={() => setShowAddRecord(false)}
            isPending={createRecord.isPending}
            title="Add Record"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Personal Record Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Tax Year {editingRecord?.taxYear} — {client.firstName} {client.lastName}
            </DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <TaxYearForm
              initial={{
                taxYear: editingRecord.taxYear,
                status: editingRecord.status,
                commStatus: (editingRecord.commStatus ?? "Not Contacted") as CommStatus,
                commDate: editingRecord.commDate
                  ? new Date(editingRecord.commDate).toISOString().split("T")[0]
                  : "",
                statusDate: editingRecord.statusDate
                  ? new Date(editingRecord.statusDate).toISOString().split("T")[0]
                  : "",
                printedCopy: editingRecord.printedCopy ?? "",
                notes: editingRecord.notes ?? "",
              }}
              onSubmit={(data) =>
                updateRecord.mutate({
                  id: editingRecord.id,
                  status: data.status,
                  commStatus: data.commStatus || null,
                  commDate: data.commDate || null,
                  statusDate: data.statusDate || null,
                  printedCopy: data.printedCopy || null,
                  notes: data.notes || null,
                  taxYear: data.taxYear,
                })
              }
              onCancel={() => setEditingRecord(null)}
              isPending={updateRecord.isPending}
              title="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Client?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove {client.firstName} {client.lastName}, their connected businesses,
            and all related tax year records from the active system.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={softDeleteClient.isPending}
              onClick={() => softDeleteClient.mutate({ id: clientId })}
            >
              {softDeleteClient.isPending ? "Removing…" : "Remove Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
