
import { Toast, ToastActionElement, ToastProps } from "@/components/ui/toast"
import { toast as toastFunction, useToast as useToastHook } from "@/components/ui/use-toast"

type ToastOptions = Omit<ToastProps, "id"> & {
  id?: string
  action?: ToastActionElement
}

export const toast = (props: ToastOptions) => {
  return toastFunction(props)
}

export const useToast = useToastHook
export type { ToastOptions }
