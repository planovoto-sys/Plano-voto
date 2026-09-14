// Texto sem emojis para não depender da renderização de ícones no aparelho.
export const WHATSAPP_INVITE_MESSAGE = 'Você é bom de voto?\n\nTem certeza?\n\nhttps://bomdevoto.com.br';

export const WHATSAPP_INVITE_URL = `https://wa.me/?text=${encodeURIComponent(WHATSAPP_INVITE_MESSAGE)}`;
