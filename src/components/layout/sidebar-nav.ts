import {
  Bot,
  Code2,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Shield,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Portal items get the accent treatment and a larger hit area. */
  portal?: boolean;
  accent?: "forge" | "ai" | "success";
  adminOnly?: boolean;
  description?: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export const PORTAL_NAV: NavItem[] = [
  {
    href: "/practice",
    label: "Practice Arena",
    icon: Code2,
    portal: true,
    accent: "forge",
    description: "300 structured problems",
  },
  {
    href: "/interview-prep",
    label: "AI Interview Prep",
    icon: Bot,
    portal: true,
    accent: "ai",
    description: "Company-focused preparation",
  },
  {
    href: "/university",
    label: "University Assessment",
    icon: GraduationCap,
    portal: true,
    accent: "success",
    description: "Tests, marking and analytics",
  },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

/** Longest-prefix match so nested routes keep their portal highlighted. */
export function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
