/**
 * Format raw Supabase auth errors into clear, friendly human sentences
 */
export const formatAuthError = (err: any): string => {
  if (!err) return 'An error occurred. Please try again.';
  const msg = typeof err === 'string' ? err : err.message || '';
  const lower = msg.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid username or password')
  ) {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email has not been confirmed yet. Please check your inbox for the confirmation link.';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  return msg || 'Authentication error. Please check your network and credentials.';
};
