"use client"

import { useState } from "react"
import { Menu, LogOut, Shield, GraduationCap, BookOpen, KeyRound } from "lucide-react"
import { useAppStore, rolePageTitles } from "@/lib/store"
import Image from "next/image"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const roleIcons: Record<string, React.ElementType> = {
  ADMIN: Shield,
  LECTURER: BookOpen,
  STUDENT: GraduationCap,
}

export function AppHeader() {
  const { currentPage, user } = useAppStore()
  const role = user?.role || "STUDENT"
  const RoleIcon = roleIcons[role] || Shield

  // Change password dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const titles = rolePageTitles[role]
  const pageTitle = titles?.[currentPage] || "Dashboard"

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U"

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // ignore errors
    }
    useAppStore.getState().logout()
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields")
      return
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to change password")
        return
      }

      toast.success("Password changed successfully!")
      setPasswordDialogOpen(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <>
      <header className="flex h-14 items-center gap-3 border-b bg-white/80 backdrop-blur-xl px-4 md:px-6 sticky top-0 z-30">
        {/* Mobile menu trigger */}
        <div className="md:hidden">
          <SidebarTrigger className="-ml-1">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
        </div>

        {/* Desktop sidebar trigger */}
        <div className="hidden md:block">
          <SidebarTrigger className="-ml-1" />
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Page title with role icon */}
        <div className="flex-1 flex items-center gap-3">
          <div className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RoleIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight leading-none">
              {pageTitle}
            </h2>
            <p className="hidden sm:block text-[11px] text-muted-foreground leading-none mt-0.5">
              AttendQ — {role} Panel
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2 h-9 px-2 hover:bg-muted"
              >
                <Avatar className="h-8 w-8 ring-1 ring-primary/20">
                  <AvatarImage src={`/images/avatar-${role.toLowerCase()}.png`} alt={user?.name || "User"} className="object-cover" />
                  <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                  {user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 relative rounded-xl overflow-hidden shrink-0">
                    <Image
                      src={`/images/avatar-${role.toLowerCase()}.png`}
                      alt={user?.name || "User"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <Badge role={role} />
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setPasswordDialogOpen(true)}
                className="cursor-pointer"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Update your login password. You must provide your current password to set a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleChangePassword()
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false)
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
              }}
              disabled={changingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Badge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold w-fit bg-primary/10 text-primary border border-primary/20">
      {role}
    </span>
  )
}
