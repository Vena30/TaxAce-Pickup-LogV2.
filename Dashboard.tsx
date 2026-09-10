import { trpc } from "@/lib/trpc";
import {
  Archive,
  CheckCircle,
  ClipboardList,
  FileWarning,
  Layers,
  Mail,
  MailCheck,
  Phone,
  Scissors,
  Timer,
  Trash2,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path: string;
  description?: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor, path, description }: StatCardProps) {
  const [, setLocation] = useLocation();
  return (
    <button
      onClick={() => setLocation(path)}
      className="group bg-card border border-border rounded-xl p-5 text-left hover:shadow-md hover:border-primary/30 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{value.toLocaleString()}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={`${bgColor} p-2.5 rounded-lg shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <div className="mt-3 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        View all →
      </div>
    </button>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-2/3 mb-2" />
          <div className="h-8 bg-muted rounded w-1/3" />
        </div>
        <div className="h-10 w-10 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = trpc.dashboard.stats.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const totalRecords = stats
    ? stats.inVault + stats.contacted + stats.scheduled + stats.prepped +
      stats.preppedMail + stats.prepToShred + stats.hold
    : 0;

  const cards: StatCardProps[] = stats
    ? [
        {
          title: "Total Clients",
          value: stats.totalClients,
          icon: Users,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          path: "/clients",
          description: `${stats.activeClients} active · ${stats.inactiveClients} inactive`,
        },
        {
          title: "In Vault",
          value: stats.inVault,
          icon: Archive,
          color: "text-sky-600",
          bgColor: "bg-sky-50",
          path: "/records/in-vault",
        },
        {
          title: "Contacted",
          value: stats.contacted,
          icon: Phone,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
          path: "/records/contacted",
        },
        {
          title: "Scheduled",
          value: stats.scheduled,
          icon: Timer,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          path: "/records/scheduled",
        },
        {
          title: "Prepped for Pickup",
          value: stats.prepped,
          icon: Layers,
          color: "text-teal-600",
          bgColor: "bg-teal-50",
          path: "/records/prepped",
        },
        {
          title: "Picked Up",
          value: stats.pickedUp,
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50",
          path: "/records/picked-up",
        },
        {
          title: "Prepped for Mail",
          value: stats.preppedMail,
          icon: Mail,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          path: "/records/prepped-mail",
        },
        {
          title: "Mailed",
          value: stats.mailed,
          icon: MailCheck,
          color: "text-green-600",
          bgColor: "bg-green-50",
          path: "/records/mailed",
        },
        {
          title: "Prep to Shred",
          value: stats.prepToShred,
          icon: Scissors,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          path: "/records/prep-to-shred",
        },
        {
          title: "Shredded",
          value: stats.shredded,
          icon: Trash2,
          color: "text-gray-500",
          bgColor: "bg-gray-100",
          path: "/records/shredded",
        },
        {
          title: "Hold",
          value: stats.hold,
          icon: FileWarning,
          color: "text-red-500",
          bgColor: "bg-red-50",
          path: "/records/hold",
        },
        {
          title: "All Records",
          value: totalRecords,
          icon: ClipboardList,
          color: "text-primary",
          bgColor: "bg-primary/10",
          path: "/records",
          description: "Records currently in house",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Live overview of all physical tax document records.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
          Failed to load dashboard stats. Please refresh the page.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((card) => <StatCard key={card.title} {...card} />)}
      </div>

      {stats && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Quick Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Active Clients</p>
              <p className="font-semibold text-foreground">{stats.activeClients}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Inactive Clients</p>
              <p className="font-semibold text-foreground">{stats.inactiveClients}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Currently In Vault</p>
              <p className="font-semibold text-foreground">{stats.inVault}</p>
            </div>
            <div>
              <p className="text-muted-foreground">On Hold</p>
              <p className="font-semibold text-foreground">{stats.hold}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
