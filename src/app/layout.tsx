import type { Metadata,Viewport } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
export const metadata:Metadata={title:{default:'StudyOS — A calmer way to learn',template:'%s · StudyOS'},description:'Your private workspace for learning, planning and everyday progress.',icons:{icon:'/icon.svg'},appleWebApp:{capable:true,statusBarStyle:'default',title:'StudyOS'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:[{media:'(prefers-color-scheme: light)',color:'#f5f5f2'},{media:'(prefers-color-scheme: dark)',color:'#111317'}]};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;}
