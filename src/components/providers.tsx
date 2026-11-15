'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { createContext, useContext, useState, useCallback } from 'react';
type Toast = { text:string; kind:'success'|'error' } | null;
const ToastContext = createContext<(text:string,kind?:'success'|'error')=>void>(()=>{});
export function Providers({children}:{children:React.ReactNode}) {
  const [client] = useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:20000,retry:1,refetchOnWindowFocus:true},mutations:{retry:0}}}));
  const [toast,setToast]=useState<Toast>(null);
  const notify=useCallback((text:string,kind:'success'|'error'='success')=>{setToast({text,kind});},[]);
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="studyos-theme"><QueryClientProvider client={client}><ToastContext.Provider value={notify}>{children}{toast&&<div className={`toast ${toast.kind}`} role={toast.kind==='error'?'alert':'status'}><span>{toast.text}</span><button onClick={()=>setToast(null)} aria-label="Dismiss notification">×</button></div>}</ToastContext.Provider></QueryClientProvider></ThemeProvider>;
}
export const useToast=()=>useContext(ToastContext);
