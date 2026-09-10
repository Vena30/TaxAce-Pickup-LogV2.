import { cn } from "@/lib/utils";

export type TaxStatus =
  | "In Vault"
  | "Contacted"
  | "Scheduled"
  | "Prepped for Pickup"
  | "Picked Up"
  | "Prepped for Mail"
  | "Mailed"
  | "Prep to Shred"
  | "Shredded"
  | "Hold";

// CSS class map — matches index.css status classes
const STATUS_CLASSES: Record<TaxStatus, string> = {
  "In Vault":             "status-in-vault",
  "Contacted":            "status-contacted",
  "Scheduled":            "status-scheduled",
  "Prepped for Pickup":   "status-prepped",
  "Picked Up":            "status-picked-up",
  "Prepped for Mail":     "status-prepped-mail",
  "Mailed":               "status-mailed",
  "Prep to Shred":        "status-prep-to-shred",
  "Shredded":             "status-shredded",
  "Hold":                 "status-hold",
};

// Dot colors for the status option pills in dropdowns (inline Tailwind bg)
export const STATUS_DOT_COLORS: Record<TaxStatus, string> = {
  "In Vault":             "bg-[oklch(0.45_0.14_185)]",  /* dark teal */
  "Contacted":            "bg-[oklch(0.55_0.18_220)]",  /* sky blue */
  "Scheduled":            "bg-[oklch(0.50_0.20_300)]",  /* purple */
  "Prepped for Pickup":   "bg-[oklch(0.62_0.16_65)]",   /* amber/gold */
  "Picked Up":            "bg-[oklch(0.48_0.18_145)]",  /* rich emerald */
  "Prepped for Mail":     "bg-[oklch(0.62_0.16_65)]",   /* amber/gold — same as Prepped for Pickup */
  "Mailed":               "bg-[oklch(0.48_0.18_145)]",  /* rich emerald — same as Picked Up */
  "Prep to Shred":        "bg-[oklch(0.60_0.18_45)]",   /* orange */
  "Shredded":             "bg-[oklch(0.50_0.20_25)]",   /* red */
  "Hold":                 "bg-[oklch(0.50_0.01_260)]",  /* slate gray */
};

interface StatusBadgeProps {
  status: TaxStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cls = STATUS_CLASSES[status as TaxStatus] ?? "status-hold";
  return (
    <span className={cn("status-badge", cls, className)}>
      {status}
    </span>
  );
}

/** A colored dot + label for use inside Select dropdowns */
export function StatusOption({ status }: { status: TaxStatus }) {
  const dotColor = STATUS_DOT_COLORS[status] ?? "bg-gray-400";
  const badgeClass = STATUS_CLASSES[status] ?? "status-hold";
  return (
    <span className={cn("status-badge", badgeClass, "gap-1.5")}>
      <span className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
      {status}
    </span>
  );
}

export const ALL_STATUSES: TaxStatus[] = [
  "In Vault",
  "Contacted",
  "Scheduled",
  "Prepped for Pickup",
  "Picked Up",
  "Prepped for Mail",
  "Mailed",
  "Prep to Shred",
  "Shredded",
  "Hold",
];

export type CommStatus =
  | "Not Contacted"
  | "Left Voicemail"
  | "Called No Answer"
  | "Spoke to Client"
  | "Email Sent";

/** @deprecated Use CommStatus */
export type ContactStatus = CommStatus;

export const ALL_COMM_STATUSES: CommStatus[] = [
  "Not Contacted",
  "Left Voicemail",
  "Called No Answer",
  "Spoke to Client",
  "Email Sent",
];

/** @deprecated Use ALL_COMM_STATUSES */
export const ALL_CONTACT_STATUSES = ALL_COMM_STATUSES;

// Communication status dot colors
export const COMM_STATUS_DOT_COLORS: Record<CommStatus, string> = {
  "Not Contacted":    "bg-gray-400",
  "Left Voicemail":   "bg-yellow-500",
  "Called No Answer": "bg-orange-500",
  "Spoke to Client":  "bg-green-500",
  "Email Sent":       "bg-blue-500",
};

/** @deprecated Use COMM_STATUS_DOT_COLORS */
export const CONTACT_STATUS_DOT_COLORS = COMM_STATUS_DOT_COLORS;
