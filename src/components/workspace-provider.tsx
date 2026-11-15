'use client';
import { createContext,useContext,useEffect } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { browserDb } from '@/lib/supabase/client';
import type { Profile,TableName } from '@/lib/types';
import type { Tables } from '@/lib/supabase/database.types';
const WorkspaceContext=createContext<{userId:string;email:string;profile:Profile}|null>(null);
export function WorkspaceProvider({children,userId,email,profile}:{children:React.ReactNode;userId:string;email:string;profile:Profile}){
  const router=useRouter();const qc=useQueryClient();
  useEffect(()=>{const {data:{subscription}}=browserDb().auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){qc.clear();router.replace('/login');router.refresh();}});return()=>subscription.unsubscribe();},[qc,router]);
  return <WorkspaceContext.Provider value={{userId,email,profile}}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace(){const value=useContext(WorkspaceContext);if(!value)throw new Error('Workspace context is missing.');return value;}
export async function fetchRows<T extends TableName>(table:T,filter?:{column:string;value:string}):Promise<Tables<T>[]> {
  const all:Tables<T>[]=[];
  for(let start=0;start<50000;start+=500){
    let q=browserDb().from(table).select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).range(start,start+499);
    if(filter)q=q.filter(filter.column,'eq',filter.value);
    const {data,error}=await q;if(error)throw error;
    const rows=data as unknown as Tables<T>[];all.push(...rows);
    if(rows.length<500)return all;
  }
  throw new Error('This collection is too large to load safely. Please export or archive older items.');
}
export function useRows<T extends TableName>(table:T,filter?:{column:string;value:string}){
  const {userId}=useWorkspace();
  return useQuery({queryKey:['table',userId,table,filter?.column,filter?.value],queryFn:()=>fetchRows(table,filter)});
}
export function useRefresh(){const qc=useQueryClient();const {userId}=useWorkspace();return (...tables:TableName[])=>Promise.all(tables.map(table=>qc.invalidateQueries({queryKey:['table',userId,table]})));}
