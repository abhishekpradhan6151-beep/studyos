'use client';
import { useState } from 'react';
import { messageOf } from '@/lib/errors';
import type { TableName } from '@/lib/types';
import { useRefresh } from './workspace-provider';
import { useToast } from './providers';

export function useOperation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useRefresh();
  const notify = useToast();
  async function run(action: () => Promise<void>, tables: TableName[], success?: string) {
    setBusy(true); setError('');
    try {
      await action(); await refresh(...tables);
      if (success) notify(success);
      return true;
    } catch (err) { setError(messageOf(err)); return false; }
    finally { setBusy(false); }
  }
  return { busy, error, setError, run };
}
