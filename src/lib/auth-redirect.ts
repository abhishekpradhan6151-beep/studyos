/** Relative Location preserves the browser origin and its session cookie scope. */
export function authRedirect(path: string): Response {
  const destination = ['/dashboard', '/onboarding', '/reset-password', '/login?error=auth'].includes(path) ? path : '/dashboard';
  return new Response(null, { status: 303, headers: { Location: destination, 'Cache-Control': 'private, no-store' } });
}
