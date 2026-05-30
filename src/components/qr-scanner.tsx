"use client"

import { useEffect, useRef, useState, useId } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, CameraOff, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QrScannerProps {
  onScan: (decodedText: string) => void
  isActive: boolean
  onToggle: () => void
}

export function QrScanner({ onScan, isActive, onToggle }: QrScannerProps) {
  const uniqueId = useId()
  // useId generates ids with colons which may not work as DOM ids, sanitize
  const scannerDivId = `qr-reader-${uniqueId.replace(/:/g, "")}`

  const scannerRef = useRef<Html5Qrcode | null>(null)
 const isStartingRef = useRef(false)
const scannedCodesRef = useRef<Set<string>>(new Set()) // track ALL scanned codes to prevent duplicates
const [status, setStatus] = useState<"idle" | "starting" | "running" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Start the scanner
  const startScanner = async () => {
    if (isStartingRef.current) return
    isStartingRef.current = true
    setStatus("starting")
    setErrorMsg(null)

    try {
      // Create scanner instance if not yet created
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerDivId)
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
  // Never fire onScan for a QR code that has already been scanned in this session
  if (scannedCodesRef.current.has(decodedText)) {
    return
  }
  scannedCodesRef.current.add(decodedText)
  onScan(decodedText)
},
        () => {
          // QR code scan error (no code found in frame) — ignore, this fires constantly
        }
      )
      setStatus("running")
    } catch (err) {
      console.error("Failed to start QR scanner:", err)
      let message = "Failed to start camera"
      if (err instanceof Error) {
        if (err.message.includes("NotAllowedError") || err.message.includes("Permission")) {
          message = "Camera permission denied. Please allow camera access and try again."
        } else if (err.message.includes("NotFoundError") || err.message.includes("Requested device not found")) {
          message = "No camera found on this device."
        } else if (err.message.includes("NotReadableError") || err.message.includes("Could not start video source")) {
          message = "Camera is already in use by another application."
        } else {
          message = err.message
        }
      }
      setErrorMsg(message)
      setStatus("error")
      // Clean up the scanner instance on error so we can retry
      try {
        scannerRef.current?.clear()
      } catch {
        // ignore
      }
      scannerRef.current = null
    } finally {
      isStartingRef.current = false
    }
  }

  // Stop the scanner
  const stopScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop()
      }
    } catch (err) {
      console.error("Error stopping scanner:", err)
    }
  setStatus("idle")
setErrorMsg(null)
scannedCodesRef.current.clear() // reset when scanner stops
}
  // React to isActive changes
  useEffect(() => {
    if (isActive && status !== "running" && status !== "starting") {
      startScanner()
    } else if (!isActive && (status === "running" || status === "starting")) {
      stopScanner()
    }
  }, [isActive])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {})
          }
          scannerRef.current.clear()
        } catch {
          // ignore
        }
        scannerRef.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      {/* Scanner viewport */}
      <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/30">
        {/* The div where html5-qrcode renders the camera preview */}
        <div id={scannerDivId} className="w-full" />

        {/* Overlay states */}
        {status === "idle" && !isActive && (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <Camera className="h-12 w-12 text-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">
              QR Scanner
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click &quot;Start Camera&quot; to begin scanning
            </p>
          </div>
        )}

        {status === "starting" && (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <Loader2 className="h-10 w-10 text-foreground animate-spin mb-2" />
            <p className="text-sm font-medium text-foreground">
              Starting camera...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Please allow camera access if prompted
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <AlertTriangle className="h-10 w-10 text-foreground mb-2" />
            <p className="text-sm font-medium text-destructive">
              Camera Error
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
              {errorMsg}
            </p>
          </div>
        )}

        {status === "running" && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Scanning
            </span>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <Button
        type="button"
        className={`w-full ${
          isActive
            ? "bg-destructive hover:bg-destructive/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
        disabled={status === "starting"}
        onClick={() => {
          if (isActive) {
            onToggle() // will set isActive = false, which triggers stop via effect
          } else {
            onToggle() // will set isActive = true, which triggers start via effect
          }
        }}
      >
        {status === "starting" ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Starting Camera...
          </>
        ) : isActive ? (
          <>
            <CameraOff className="h-4 w-4 mr-2" />
            Stop Camera
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </>
        )}
      </Button>
    </div>
  )
}
