"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Shield,
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Fingerprint,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAppStore, type UserRole } from "@/lib/store"
import { toast } from "sonner"

const roles: {
  key: UserRole
  label: string
  icon: React.ElementType
  avatar: string
  description: string
}[] = [
  {
    key: "ADMIN",
    label: "Admin",
    icon: Shield,
    avatar: "/images/avatar-admin.png",
    description: "Full system access & management",
  },
  {
    key: "LECTURER",
    label: "Lecturer",
    icon: BookOpen,
    avatar: "/images/avatar-lecturer.png",
    description: "Manage courses & take attendance",
  },
  {
    key: "STUDENT",
    label: "Student",
    icon: GraduationCap,
    avatar: "/images/avatar-student.png",
    description: "View QR code & attendance history",
  },
]

export function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("STUDENT")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setUser } = useAppStore()

  const currentRole = roles.find((r) => r.key === selectedRole)!

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        toast.error(data.error || "Invalid email or password. Please try again.")
        setLoading(false)
        return
      }

      setUser(data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      router.refresh()
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Logo & Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="mb-6 relative inline-block p-4 rounded-3xl bg-white/40 backdrop-blur-md border border-white/50 shadow-2xl shadow-primary/10">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-3xl blur-lg -z-10" />
            <Image
              src="/images/school-logo.png"
              alt="School Logo"
              width={96}
              height={96}
              className="object-contain relative drop-shadow-md"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Attend<span className="text-primary">Q</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Attendance Management System
          </p>
          <p className="text-muted-foreground/70 text-xs mt-0.5">
            QR Code Attendance System
          </p>
        </motion.div>

        {/* Role Tabs */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative grid grid-cols-3 gap-1.5 p-1.5 sm:gap-2 sm:p-2 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-lg shadow-black/5">
            {/* Glassmorphism shine overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-white/5 pointer-events-none" />
            {roles.map((role) => {
              const Icon = role.icon
              const isActive = selectedRole === role.key
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.key)
                    setEmail("")
                    setPassword("")
                  }}
                  className={`
                    relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300
                    ${
                      isActive
                        ? "bg-white/40 backdrop-blur-md text-foreground shadow-lg shadow-primary/10 border border-white/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/20 border border-transparent"
                    }
                  `}
                >
                  <div className={`h-10 w-10 relative rounded-full overflow-hidden transition-all duration-300 ${
                    isActive ? "ring-2 ring-primary/30 shadow-lg scale-105" : "opacity-60 hover:opacity-80"
                  }`}>
                    <Image
                      src={role.avatar}
                      alt={`${role.label} avatar`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium">{role.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-white/30 shadow-xl shadow-primary/5 overflow-hidden bg-white/25 backdrop-blur-xl">
            {/* Top accent line */}
            <div className="h-[3px] bg-gradient-to-r from-primary via-primary/80 to-accent" />

            <CardContent className="p-4 sm:p-6">
              {/* Role info */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 relative rounded-xl overflow-hidden shadow-md shrink-0">
                  <Image
                    src={currentRole.avatar}
                    alt={`${currentRole.label} avatar`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Sign in as {currentRole.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {currentRole.description}
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11 focus-visible:ring-primary/30"
                      autoComplete="email"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleLogin()
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 h-11 focus-visible:ring-primary/30"
                      autoComplete="current-password"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleLogin()
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={loading}
                  onClick={handleLogin}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium gap-2 shadow-lg shadow-primary/20 transition-all"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>


            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-xs text-muted-foreground/70 mt-6"
        >
          © 2026 School Management — AttendQ
        </motion.p>
      </div>
    </div>
  )
}
