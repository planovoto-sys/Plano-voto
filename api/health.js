export default {
  async fetch(request) {
    const deepCheck = new URL(request.url).searchParams.get('deep') === '1';
    let business_module = 'not_checked';
    let database_admin = 'not_checked';
    let ok = true;
    const configurationState = (error) => {
      if (error?.diagnosticCode === 'firebase-admin-credentials-missing') {
        return 'configuration-missing';
      }
      if (String(error?.diagnosticCode || '').startsWith('firebase-admin-credentials-')) {
        return 'configuration-invalid';
      }
      return null;
    };

    if (deepCheck) {
      let module;
      try {
        module = await import('../functions/index.js');
        business_module = typeof module.syncUserProfile?.run === 'function' ? 'ok' : 'invalid';
        if (business_module !== 'ok' || typeof module.verifyBackendReadiness !== 'function') {
          throw Object.assign(new Error('Modulo de backend invalido.'), { code: 'invalid-module' });
        }
      } catch (error) {
        business_module = `error:${String(error?.code || error?.name || 'unknown')}`;
        database_admin = configurationState(error) || 'unavailable';
        ok = false;
      }

      if (module && business_module === 'ok') {
        try {
          await module.verifyBackendReadiness();
          database_admin = 'metadata-ok';
        } catch (error) {
          database_admin = configurationState(error)
            || `error:${String(error?.code || error?.name || 'unknown')}`;
          ok = false;
        }
      }
    }

    return Response.json({
      ok,
      service: 'plano-voto-api',
      version: '1.11.4',
      runtime_adapter: 'native-no-cloud-functions',
      business_module,
      database_admin,
    }, {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
