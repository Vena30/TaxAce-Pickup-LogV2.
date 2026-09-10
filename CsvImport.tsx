import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Download, FileUp, AlertTriangle } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const TEMPLATE_HEADERS = [
  "clientFirstName",
  "clientLastName",
  "spouseFirstName",
  "spouseLastName",
  "clientNotes",
  "businessName",
  "taxYear",
  "status",
  "printedCopy",
  "statusDate",
  "recordNotes",
];

const TEMPLATE_EXAMPLE = [
  "Maria",
  "Lopez",
  "Jose",
  "Lopez",
  "",
  "",
  "2023",
  "In Vault",
  "Yes",
  "",
  "",
];

const TEMPLATE_EXAMPLE2 = [
  "Maria",
  "Lopez",
  "",
  "",
  "",
  "Maria Consulting LLC",
  "2023",
  "Picked Up",
  "No",
  "2024-03-15",
  "Business return",
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE, TEMPLATE_EXAMPLE2];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "taxace_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export default function CsvImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{
    clientsCreated: number;
    businessesCreated: number;
    recordsCreated: number;
    errors: string[];
  } | null>(null);

  const importMutation = trpc.csvImport.importRecords.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setPreview(null);
      toast.success(`Import complete: ${data.recordsCreated} records imported.`);
    },
    onError: (e) => toast.error(`Import failed: ${e.message}`),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast.error("CSV must have a header row and at least one data row.");
        return;
      }
      setHeaders(rows[0]);
      setPreview(rows.slice(1, 6)); // show first 5 data rows
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!fileRef.current?.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) return;
      const hdrs = rows[0];
      const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim()));

      const idx = (name: string) => hdrs.indexOf(name);

      const mapped = dataRows
        .filter((r) => r[idx("clientFirstName")]?.trim() && r[idx("clientLastName")]?.trim())
        .map((r) => ({
          clientFirstName: r[idx("clientFirstName")]?.trim() ?? "",
          clientLastName: r[idx("clientLastName")]?.trim() ?? "",
          spouseFirstName: r[idx("spouseFirstName")]?.trim() || undefined,
          spouseLastName: r[idx("spouseLastName")]?.trim() || undefined,
          clientNotes: r[idx("clientNotes")]?.trim() || undefined,
          businessName: r[idx("businessName")]?.trim() || undefined,
          taxYear: parseInt(r[idx("taxYear")]?.trim() ?? "0", 10),
          status: r[idx("status")]?.trim() || undefined,
          printedCopy: r[idx("printedCopy")]?.trim() || undefined,
          statusDate: r[idx("statusDate")]?.trim() || undefined,
          recordNotes: r[idx("recordNotes")]?.trim() || undefined,
        }))
        .filter((r) => r.taxYear > 1900 && r.taxYear < 2100);

      importMutation.mutate({ rows: mapped });
    };
    reader.readAsText(fileRef.current.files[0]);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold">CSV Import</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          One-time bulk import from your existing Google Sheets data. Records with ambiguous or
          missing status will default to <strong>Hold</strong>.
        </p>
      </div>

      {/* Template download */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-1">Step 1 — Download the Template</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Export your Google Sheet to CSV and map your columns to the template format below. Save
          as a <code>.csv</code> file before uploading.
        </p>
        <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
          <Download className="h-4 w-4" />
          Download CSV Template
        </Button>

        <div className="mt-4 overflow-x-auto">
          <table className="text-xs border border-border rounded-lg overflow-hidden w-full">
            <thead>
              <tr className="bg-muted/50">
                {TEMPLATE_HEADERS.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap border-r last:border-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                {TEMPLATE_EXAMPLE.map((v, i) => (
                  <td key={i} className="px-3 py-2 text-foreground border-r last:border-0 whitespace-nowrap">
                    {v || <span className="text-muted-foreground italic">empty</span>}
                  </td>
                ))}
              </tr>
              <tr className="border-t bg-muted/20">
                {TEMPLATE_EXAMPLE2.map((v, i) => (
                  <td key={i} className="px-3 py-2 text-foreground border-r last:border-0 whitespace-nowrap">
                    {v || <span className="text-muted-foreground italic">empty</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p><strong>Status values:</strong> In Vault · Contacted · Scheduled · Prepped · Picked Up · Prep to Shred · Shredded · Hold (default for unknown)</p>
          <p><strong>printedCopy:</strong> Yes or No</p>
          <p><strong>Dates:</strong> YYYY-MM-DD format (e.g. 2024-03-15)</p>
          <p><strong>businessName:</strong> Leave empty for personal records. Fill in for business records linked to the client.</p>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-1">Step 2 — Upload Your CSV</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Select your prepared CSV file. A preview of the first 5 rows will appear before you confirm the import.
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-sm font-medium"
          >
            <FileUp className="h-4 w-4" />
            {fileName || "Choose CSV file…"}
          </label>
          {fileName && (
            <span className="text-xs text-muted-foreground">{fileName}</span>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">Step 3 — Preview & Confirm</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Showing first {preview.length} data rows. Review and click Import to proceed.
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="text-xs border border-border rounded-lg overflow-hidden w-full">
              <thead>
                <tr className="bg-muted/50">
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap border-r last:border-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={`border-t ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 border-r last:border-0 whitespace-nowrap">
                        {cell || <span className="text-muted-foreground italic">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            onClick={handleImport}
            disabled={importMutation.isPending}
            className="gap-2"
          >
            <FileUp className="h-4 w-4" />
            {importMutation.isPending ? "Importing…" : "Confirm Import"}
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl p-5 border ${result.errors.length > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.errors.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <h3 className="font-semibold text-sm">Import Complete</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div>
              <p className="text-muted-foreground text-xs">Clients Created</p>
              <p className="font-bold text-lg">{result.clientsCreated}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Businesses Created</p>
              <p className="font-bold text-lg">{result.businessesCreated}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Records Imported</p>
              <p className="font-bold text-lg">{result.recordsCreated}</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-1">
                {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
              </p>
              <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
