"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastApi = { show: (text: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

// The prototype's #toast: one message at a time, shown for 2.8 s.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    setText(next);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 2800);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={open ? "toast show" : "toast"} id="toast" role="status">
        <i></i>
        <span>{text}</span>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
