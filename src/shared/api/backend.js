import { getAuthAccessToken } from '@/shared/auth/authService';

const MAX_RESPONSE_BYTES = 128 * 1024;

export class BackendError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BackendError';
    this.code = code || 'internal';
  }
}

export const callBackend = async (action, data = {}) => {
  const idToken = await getAuthAccessToken();
  const response = await fetch('/api/rpc', {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ action, data }),
  });

  const rawResponse = await response.text();
  if (rawResponse.length > MAX_RESPONSE_BYTES) {
    throw new BackendError('response-too-large', 'Resposta do servidor excedeu o limite permitido.');
  }

  if (response.status === 404 && !rawResponse.trim()) {
    throw new BackendError(
      'backend-unavailable',
      'A API do aplicativo nao esta disponivel neste ambiente.'
    );
  }

  let payload;
  try {
    payload = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    throw new BackendError('invalid-response', 'O servidor retornou uma resposta invalida.');
  }

  if (!response.ok) {
    throw new BackendError(payload?.error?.code, payload?.error?.message || 'Falha ao processar a solicitacao.');
  }

  return { data: payload?.data ?? null };
};
