"use client"

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner"

export const toast = sonnerToast

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      expand
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border bg-background text-foreground shadow-lg",
          description: "text-muted-foreground",
          actionButton:
            "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-600/40",
        },
        actionButtonStyle: {
          backgroundColor: '#059669',
          color: '#fff',
        },
      }}
    />
  )
}
