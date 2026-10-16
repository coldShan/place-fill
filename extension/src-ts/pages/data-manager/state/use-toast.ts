import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export type ToastTone = "info" | "success" | "warning" | "danger";
export type ToastState = { id: number; message: string; tone: ToastTone } | null;
export type ShowToast = (message: string, tone?: ToastTone) => void;

const TOAST_DURATION_MS = 2400;

export function useToast(): { toast: ToastState; showToast: ShowToast } {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback<ShowToast>(function (message, tone = "info") {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast({ id: Date.now(), message, tone });
    timerRef.current = window.setTimeout(function () {
      setToast(null);
      timerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(function () {
    return function () {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { toast, showToast };
}
