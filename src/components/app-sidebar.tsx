"use client"

import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  BookMarked,
  ClipboardCheck,
  BarChart3,
  User,
  ScanLine,
  LogOut,
  Shield,
} from "lucide-react"
import { signOut } from "next-auth/react"
import Image from "next/image"
import { useAppStore, type Page, type UserRole } from "@/lib/store"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Define which pages each role can access
const roleNavItems: Record<
  UserRole,
  { page: Page; label: string; icon: React.ElementType; group?: string }[]
> = {
  ADMIN: [
    { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { page: "students", label: "Students", icon: GraduationCap },
    { page: "lecturers", label: "Lecturers", icon: BookOpen },
    { page: "courses", label: "Courses", icon: BookMarked },
    { page: "attendance", label: "Attendance", icon: ClipboardCheck },
    { page: "reports", label: "Reports", icon: BarChart3 },
    { page: "student-portal", label: "Student Portal", icon: User },
  ],
  LECTURER: [
    { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { page: "courses", label: "My Courses", icon: BookMarked },
    { page: "attendance", label: "Take Attendance", icon: ClipboardCheck },
    { page: "reports", label: "Reports", icon: BarChart3 },
  ],
  STUDENT: [
    { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { page: "courses", label: "My Courses", icon: BookMarked },
    { page: "student-portal", label: "My QR Code", icon: ScanLine },
    { page: "reports", label: "My Attendance", icon: BarChart3 },
  ],
}

export function AppSidebar() {
  const { currentPage, setCurrentPage, user } = useAppStore()
  const role = user?.role || "STUDENT"
  const navItems = roleNavItems[role]

  const handleLogout = async () => {
    await signOut({ redirect: false })
    useAppStore.getState().logout()
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U"

  return (
    <Sidebar
      className="border-r-0"
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-mobile": "18rem",
        } as React.CSSProperties
      }
    >
      {/* Brand Header */}
      <SidebarHeader className="bg-sidebar px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl overflow-hidden bg-white p-1 shadow-md">
            <Image
              src="/images/school-logo.png"
              alt="School Logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">
              AttendQ
            </h1>
            <p className="text-[11px] text-sidebar-foreground/40 leading-none mt-0.5">
              School Management
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-3 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/30 text-xs font-semibold uppercase tracking-wider mb-1 px-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive = currentPage === item.page
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.page}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setCurrentPage(item.page)}
                      className={cn(
                        "h-10 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/25"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] transition-colors",
                          isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/40"
                        )}
                      />
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/60 animate-pulse" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="bg-sidebar-border mx-3" />

      {/* User Info & Actions */}
      <SidebarFooter className="bg-sidebar px-3 py-3 space-y-3">
        {/* User profile */}
        {user && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent border border-sidebar-border">
            <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/30">
              <AvatarImage src={`/images/avatar-${role.toLowerCase()}.png`} alt={user?.name || "User"} className="object-cover" />
              <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.name}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30">
                {role === "ADMIN" && <Shield className="h-2.5 w-2.5" />}
                {role}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-9 w-9 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>

      <SidebarRail className="bg-sidebar-accent" />
    </Sidebar>
  )
}
