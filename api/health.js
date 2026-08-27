export default {
  async fetch(request) {
    const deepCheck = new URL(request.url).searchParams.get('deep') === '1';
    let business_module = 'not_checked';

    if (deepCheck) {
      try {
        const module = await import('../functions/index.js');
        business_module = typeof module.syncUserProfile?.run === 'function' ? 'ok' : 'invalid';
      } catch (error) {
        business_module = `error:${String(error?.code || error?.name || 'unknown')}`;
      }
    }

    return Response.json({
      ok: true,
      service: 'plano-voto-api',
      version: '1.11.3',
      runtime_adapter: 'native-no-cloud-functions',
      business_module,
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
