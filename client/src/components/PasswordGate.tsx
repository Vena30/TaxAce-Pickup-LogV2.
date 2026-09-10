import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = trpc.siteAuth.check.useQuery(undefined, {
    retry: false,
  });
  const verify = trpc.siteAuth.verify.useMutation();
  const utils = trpc.useUtils();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await verify.mutateAsync({ password });
      if (result.success) {
        utils.siteAuth.check.invalidate();
      } else {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setPassword("");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data?.unlocked) {
    // Persist unlock state so the global error handler knows not to redirect to OAuth
    try { localStorage.setItem("taxace-site-unlocked", "true"); } catch {}
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <svg width="38" height="38" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" stroke="#00A896" strokeWidth="2.2"/>
              <ellipse cx="12" cy="12" rx="3" ry="4.2" fill="#4CAF7D" transform="rotate(-30 12 12)" opacity="0.9"/>
              <line x1="18" y1="18" x2="24" y2="24" stroke="#00A896" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-foreground">Tax</span><span className="text-primary">Ace</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Pickup Log — Internal Tool
          </p>
        </div>

        {/* Password Card */}
        <div className="border border-border rounded-2xl bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Enter Password
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            This tool is for TaxAce team members only.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="site-password">Password</Label>
              <Input
                id="site-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access password"
                autoFocus
                autoComplete="current-password"
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!password || verify.isPending}
            >
              {verify.isPending ? "Checking…" : "Access Tool"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Contact your admin if you need access.
        </p>
      </div>
    </div>
  );
}
