/** User-facing Supabase Auth errors. Never expose raw transport errors or credentials. */
export type AuthIntent = 'login' | 'signup' | 'forgot' | 'resend';

export type SupabaseAuthFailure = {
  code?: string;
  status?: number;
  message?: string;
} | null | undefined;

export const isUnconfirmedEmailError = (error: SupabaseAuthFailure): boolean =>
  error?.code === 'email_not_confirmed' ||
  Boolean(error?.message?.toLowerCase().includes('email not confirmed'));

export const getAuthErrorMessage = (
  error: SupabaseAuthFailure,
  intent: AuthIntent = 'login'
): string => {
  const code = error?.code;
  const message = error?.message?.toLowerCase() || '';

  if (code === 'email_address_not_authorized' ||
    message.includes('email address not authorized')) {
    return 'O envio de e-mails do Kurokage ainda não está habilitado para este endereço. O administrador precisa configurar um SMTP próprio no Supabase.';
  }
  if (code === 'over_email_send_rate_limit' ||
    message.includes('email rate limit exceeded')) {
    return 'Limite de envios de e-mail atingido. Tente mais tarde; o administrador deve configurar SMTP e limites adequados.';
  }
  if (code === 'email_provider_disabled' || code === 'signup_disabled') {
    return 'Cadastro por e-mail indisponível no momento. Entre em contato com o administrador do jogo.';
  }
  if (code === 'email_not_confirmed') {
    return 'E-mail ainda não confirmado. Solicite o reenvio da confirmação.';
  }
  if (intent === 'login' && (code === 'invalid_credentials' ||
    message.includes('invalid login credentials'))) {
    return 'E-mail ou senha incorretos. Se já criou a conta, tente recuperar sua senha.';
  }
  if (code === 'over_request_rate_limit' || error?.status === 429) {
    return 'Muitas tentativas em pouco tempo. Aguarde antes de tentar novamente.';
  }
  if (intent === 'signup' && (code === 'user_already_exists' ||
    message.includes('user already registered'))) {
    return 'Se você já tem uma conta, entre com sua senha ou utilize Esqueci minha senha.';
  }
  return 'Não foi possível concluir a solicitação. Tente novamente ou entre em contato com o administrador.';
};
