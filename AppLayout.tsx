import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Archive,
  CheckCircle,
  ClipboardList,
  FileUp,
  FileWarning,
  Key,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  MailCheck,
  PanelLeft,
  Phone,
  Scissors,
  Settings,
  Shield,
  Timer,
  Trash2,
  Users,
  Users2,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import GlobalSearch from "./GlobalSearch";
import StaffLogin from "@/pages/StaffLogin";
import { toast } from "sonner";

const SIDEBAR_WIDTH_KEY = "taxace-sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

const navItems = [
  {
    group: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: Users, label: "Clients", path: "/clients" },
    ],
  },
  {
    group: "Tax Records",
    items: [
      { icon: ClipboardList, label: "All Records", path: "/records" },
      { icon: Archive, label: "In Vault", path: "/records/in-vault" },
      { icon: Phone, label: "Contacted", path: "/records/contacted" },
      { icon: Timer, label: "Scheduled", path: "/records/scheduled" },
      { icon: Layers, label: "Prepped for Pickup", path: "/records/prepped" },
      { icon: CheckCircle, label: "Picked Up", path: "/records/picked-up" },
      { icon: Mail, label: "Prepped for Mail", path: "/records/prepped-mail" },
      { icon: MailCheck, label: "Mailed", path: "/records/mailed" },
      { icon: Scissors, label: "Prep to Shred", path: "/records/prep-to-shred" },
      { icon: Trash2, label: "Shredded", path: "/records/shredded" },
      { icon: FileWarning, label: "Hold", path: "/records/hold" },
    ],
  },
  {
    group: "Tools",
    items: [
      { icon: AlertTriangle, label: "Duplicate Review", path: "/duplicates" },
      { icon: FileUp, label: "CSV Import", path: "/import" },
    ],
  },
];

const adminNavItems = [
  { icon: Users2, label: "Team Management", path: "/admin/team" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  const { data: staffUser, isLoading } = trpc.staffAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  const utils = trpc.useUtils();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (isLoading) return <DashboardLayoutSkeleton />;

  // Not logged in — show the staff login page
  if (!staffUser) {
    return (
      <StaffLogin
        onLogin={() => {
          utils.staffAuth.me.invalidate();
        }}
      />
    );
  }

  // Logged in but must change password — StaffLogin handles this internally
  // (the login mutation sets mustChangePassword and shows the change screen)

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <AppLayoutContent
        staffUser={staffUser}
        setSidebarWidth={setSidebarWidth}
        onLogout={() => utils.staffAuth.me.invalidate()}
      >
        {children}
      </AppLayoutContent>
    </SidebarProvider>
  );
}

function AppLayoutContent({
  children,
  staffUser,
  setSidebarWidth,
  onLogout,
}: {
  children: React.ReactNode;
  staffUser: { id: number; name: string; email: string; role: string; mustChangePassword: boolean };
  setSidebarWidth: (w: number) => void;
  onLogout: () => void;
}) {
  const logoutMutation = trpc.staffAuth.logout.useMutation({
    onSuccess: () => {
      onLogout();
    },
    onError: () => {
      toast.error("Failed to sign out. Please try again.");
    },
  });

  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isAdmin = staffUser.role === "admin";

  // Duplicate count badge
  const { data: dupData } = trpc.duplicates.candidates.useQuery(undefined, {
    staleTime: 60_000,
  });
  const dupCount = dupData?.length ?? 0;

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const allNavItems = [...navItems, ...(isAdmin ? [{ group: "Admin", items: adminNavItems }] : [])];

  const currentLabel =
    allNavItems
      .flatMap((g) => g.items)
      .find((i) => i.path === location)?.label ?? "TaxAce";

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 gap-0.5">
                  <div className="flex items-center gap-2">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                      <circle cx="12" cy="12" r="8" stroke="#00C9B1" strokeWidth="2.2"/>
                      <ellipse cx="12" cy="12" rx="3" ry="4.2" fill="#4CAF7D" transform="rotate(-30 12 12)" opacity="0.9"/>
                      <line x1="18" y1="18" x2="24" y2="24" stroke="#00C9B1" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    <span className="text-[17px] font-bold leading-none tracking-tight">
                      <span className="text-white">Tax</span><span style={{color:'#00C9B1'}}>Ace</span>
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/35 leading-none pl-[36px]">
                    Pickup Log
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="gap-0 py-2">
            {allNavItems.map((group) => (
              <SidebarGroup key={group.group} className="px-2 py-0">
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-2 py-1.5">
                    {group.group}
                  </SidebarGroupLabel>
                )}
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = location === item.path;
                    const isDuplicates = item.path === "/duplicates";
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 transition-all font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                              : ""
                          }`}
                        >
                          <item.icon
                            className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                          />
                          <span className="truncate">{item.label}</span>
                          {isDuplicates && dupCount > 0 && (
                            <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                              {dupCount}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                      {staffUser.name?.charAt(0).toUpperCase() ?? "S"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-sidebar-foreground leading-none">
                        {staffUser.name}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                        {staffUser.email}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setLocation("/account/change-password")}
                  className="cursor-pointer"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => setLocation("/admin/team")}
                    className="cursor-pointer"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Team Management
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors"
            style={{ zIndex: 50 }}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset>
        {/* Top bar */}
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {isMobile && (
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
            )}
            <h1 className="text-base font-semibold text-foreground">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
          </div>
        </div>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
