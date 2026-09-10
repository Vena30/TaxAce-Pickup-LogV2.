import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = trpc.search.global.useQuery(
    { query },
    { enabled: query.trim().length >= 2, staleTime: 5000 }
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults =
    (data?.clients?.length ?? 0) > 0 || (data?.businesses?.length ?? 0) > 0;

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search clients, businesses…"
          className="pl-9 pr-8 h-9 text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {isFetching && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          )}
          {!isFetching && !hasResults && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No results found.</div>
          )}
          {!isFetching && hasResults && (
            <>
              {(data?.clients?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
                    Clients
                  </div>
                  {data!.clients.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm"
                      onClick={() => {
                        setLocation(`/clients/${c.id}`);
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      {c.spouseName && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          & {c.spouseName}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {(data?.businesses?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-t">
                    Businesses
                  </div>
                  {data!.businesses.map((b) => (
                    <button
                      key={b.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm"
                      onClick={() => {
                        setLocation(`/clients/${b.clientId}`);
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <span className="font-medium">{b.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">Business</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
