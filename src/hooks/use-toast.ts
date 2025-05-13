
import { Toast, ToastActionElement, ToastProps } from "@/components/ui/toast";
import { useToast as useToastInternal } from "@/components/ui/use-toast";

type ToastOptions = Omit<ToastProps, "id"> & {
  id?: string;
  action?: ToastActionElement;
};

export const toast = ({ ...props }: ToastOptions) => {
  const { toast: internalToast } = useToastInternal();
  return internalToast(props);
};

export const useToast = useToastInternal;
export type { ToastOptions };
