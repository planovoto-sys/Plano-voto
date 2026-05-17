import {
  applyCors,
  assertPost,
  createPlanHandoffToken,
  getBearerToken,
  readJsonBody,
  sendError,
  sendJson
} from '../server/planHandoff.js';

export default async function handler(request, response) {
  if (applyCors(request, response)) return;

  try {
    assertPost(request);
    const payload = await readJsonBody(request);
    const data = await createPlanHandoffToken({
      idToken: getBearerToken(request),
      payload
    });

    sendJson(response, 200, data);
  } catch (error) {
    sendError(response, error);
  }
}
