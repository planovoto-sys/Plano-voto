export default {
  fetch() {
    return Response.json({
      ok: true,
      service: 'plano-voto-api',
      version: '1.11.3',
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
