import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WHATSAPP_INVITE_MESSAGE, WHATSAPP_INVITE_URL } from '../src/features/sharing/whatsappInvite.js';

test('convite do WhatsApp contém apenas o texto aprovado e o link completo', () => {
  assert.equal(WHATSAPP_INVITE_MESSAGE, 'Você é bom de voto?\n\nTem certeza?\n\nhttps://bomdevoto.com.br');
  assert.doesNotMatch(WHATSAPP_INVITE_MESSAGE, /\p{Extended_Pictographic}|&#x20;|\uFFFD/u);
});

test('link do WhatsApp preserva acentos e quebras sem codificação duplicada', () => {
  const url = new URL(WHATSAPP_INVITE_URL);
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/');
  assert.deepEqual([...url.searchParams.keys()], ['text']);
  assert.equal(url.searchParams.get('text'), WHATSAPP_INVITE_MESSAGE);
  assert.match(WHATSAPP_INVITE_URL, /Voc%C3%AA%20%C3%A9/);
  assert.match(WHATSAPP_INVITE_URL, /%0A%0A/);
});
