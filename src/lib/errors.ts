export function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    if (error.message.includes('one_running_session')) return 'Pause your current focus session before starting another one.';
    if (error.message.includes('foreign key')) return 'This item is still in use. Remove its links before deleting it.';
    if (error.message.includes('Failed to fetch') || error.message.includes('fetch failed')) return 'Connection interrupted. Check your internet connection and try again.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
