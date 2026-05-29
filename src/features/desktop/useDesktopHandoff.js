import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { useUser } from '@/shared/hooks/useUser';
import {
  createLocalPlanHandoffUrl,
  createPlanHandoffToken,
  getBallotProgress,
  normalizeDraft
} from '@/features/ballot';

const buildQrCode = (url) => QRCode.toDataURL(url, {
  margin: 1,
  width: 320,
  color: {
    dark: '#171717',
    light: '#ffffff'
  }
});

const ENABLE_SECURE_HANDOFF = import.meta.env.VITE_ENABLE_SECURE_HANDOFF === 'true';

const getOrigin = () => (
  typeof window === 'undefined' ? 'https://nossovoto.org' : window.location.origin
);

const isLocalOrigin = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const getFallbackRoute = (progress) => {
  if (!progress?.hasEstado) return BALLOT_ROUTES.estado;
  return progress.nextRoute || BALLOT_ROUTES.meuPlano;
};

const isAuthError = (error) => {
  const code = String(error?.code || error?.message || '').toLowerCase();
  return code.includes('auth') || code.includes('unauthenticated') || code.includes('permission');
};

export function useDesktopHandoff(draft) {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedDraft = useMemo(() => normalizeDraft(draft), [draft]);
  const progress = useMemo(() => getBallotProgress(normalizedDraft), [normalizedDraft]);
  const fallbackUrl = useMemo(() => {
    if (!progress.hasEstado) return `${getOrigin()}${getFallbackRoute(progress)}`;

    try {
      return createLocalPlanHandoffUrl(normalizedDraft, getOrigin());
    } catch {
      return `${getOrigin()}${getFallbackRoute(progress)}`;
    }
  }, [normalizedDraft, progress]);
  const [state, setState] = useState({
    status: 'idle',
    url: fallbackUrl,
    qr: '',
    message: ''
  });

  useEffect(() => {
    let cancelled = false;

    buildQrCode(fallbackUrl)
      .then((qr) => {
        if (!cancelled) {
          setState((currentState) => ({
            ...currentState,
            url: currentState.status === 'ready' ? currentState.url : fallbackUrl,
            qr: currentState.status === 'ready' ? currentState.qr : qr
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState((currentState) => ({ ...currentState, qr: '' }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackUrl]);

  const generateLocalHandoff = async (message) => {
    const localUrl = createLocalPlanHandoffUrl(normalizedDraft, getOrigin());
    const qr = await buildQrCode(localUrl);

    setState({
      status: 'local-ready',
      url: localUrl,
      qr,
      message
    });
    return true;
  };

  const generate = async () => {
    if (!progress.hasEstado) {
      setState((currentState) => ({
        ...currentState,
        status: 'incomplete',
        message: 'Escolha seu estado para gerar o QR Code do rascunho.'
      }));
      return false;
    }

    if (!user?.uid || isLocalOrigin() || !ENABLE_SECURE_HANDOFF) {
      return generateLocalHandoff('QR local gerado. Ele leva este rascunho para o celular sem usar servidor.');
    }

    setState((currentState) => ({
      ...currentState,
      status: 'loading',
      message: ''
    }));

    try {
      const result = await createPlanHandoffToken(normalizedDraft);
      const token = result?.token || result?.handoffToken || result?.id;
      if (!token) throw new Error('Token não retornado.');

      const nextUrl = `${getOrigin()}${BALLOT_ROUTES.continuarPlano}/${encodeURIComponent(token)}`;
      const qr = await buildQrCode(nextUrl);
      setState({
        status: 'ready',
        url: nextUrl,
        qr,
        message: 'QR Code pronto para abrir este rascunho no celular.'
      });
      return true;
    } catch (error) {
      const auth = isAuthError(error);
      if (auth) {
        setState((currentState) => ({
          ...currentState,
          status: 'login-required',
          message: 'Entre novamente para gerar um QR Code seguro do seu rascunho.'
        }));
        navigate('/login', {
          state: {
            from: `${location.pathname}${location.search}`
          }
        });
        return false;
      }

      try {
        return await generateLocalHandoff('A função segura não respondeu agora. Use este QR local para continuar no celular.');
      } catch (localError) {
        setState((currentState) => ({
          ...currentState,
          status: 'error',
          message: localError?.message || error?.message || 'Não foi possível gerar o QR Code agora.'
        }));
        return false;
      }
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.url || fallbackUrl);
      setState((currentState) => ({
        ...currentState,
        message: currentState.status === 'ready'
          ? 'Link do rascunho copiado.'
          : 'Link copiado para abrir no celular.'
      }));
      return true;
    } catch {
      setState((currentState) => ({
        ...currentState,
        message: 'Não foi possível copiar automaticamente. Use o QR Code.'
      }));
      return false;
    }
  };

  return {
    ...state,
    progress,
    hasEstado: progress.hasEstado,
    isComplete: progress.isComplete,
    isLoggedIn: Boolean(user?.uid),
    generate,
    copy
  };
}
