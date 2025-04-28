import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import Notifications from "@/components/Notifications";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Menu,
  PieChart,
  Users,
  X,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@db/schema";

interface NavigationProps {
  currentEmployeeId: string;
}

function CurrentEmployee({ employeeId }: { employeeId: string }) {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees']
  });

  if (isLoading) {
    return (
      <div className="text-sm text-sidebar-foreground/80 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Lade Mitarbeiterdaten...</span>
      </div>
    );
  }

  if (!employees) {
    return (
      <div className="text-sm text-sidebar-foreground/80 flex items-center gap-2">
        <Users className="h-4 w-4" />
        <span>Keine Mitarbeiterdaten verfügbar</span>
      </div>
    );
  }

  const employee = employees.find(e => e.id.toString() === employeeId);

  if (!employee) {
    return (
      <div className="text-sm text-sidebar-foreground/80 flex items-center gap-2">
        <Users className="h-4 w-4" />
        <span>Mitarbeiter nicht gefunden</span>
      </div>
    );
  }

  return (
    <div className="text-sm text-sidebar-foreground/80 flex items-center gap-2">
      <Users className="h-4 w-4" />
      <span>Angemeldet als: {employee.name}</span>
    </div>
  );
}

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard
  },
  {
    title: "Mitarbeiter",
    href: "/employees",
    icon: Users
  },
  {
    title: "Zeiterfassung",
    href: "/time-tracking",
    icon: ClipboardList
  },
  {
    title: "Urlaubsverwaltung",
    href: "/leave-management",
    icon: Calendar
  },
  {
    title: "Berichte",
    href: "/reports",
    icon: PieChart
  }
];

export default function Navigation({ currentEmployeeId }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/" && location !== "/") return false;
    return location.startsWith(href);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <ScrollArea className="h-full py-6">
          {/* Company Name and Current Employee */}
          <div className="px-6 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-sidebar-foreground">
                Schwarzenberg Tech
              </h2>
              <Notifications />
            </div>
            {currentEmployeeId && (
              <CurrentEmployee employeeId={currentEmployeeId} />
            )}
          </div>

          <Separator className="my-4" />

          {/* Navigation Links */}
          <nav className="space-y-2 px-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
