/**
 * Быстрая проверка текста без внешних сервисов (работает и в браузере, и на сервере).
 * Открытка попадает в блокчейн навсегда, поэтому грубые слова и ссылки ловим ДО отправки.
 *
 * Ссылки запрещены специально: в крипте частый скам — «заберите airdrop на сайте …» в memo.
 * Список намеренно короткий и проверяется по словам (а не по склеенной строке), чтобы не ловить
 * «колебался» или «a bit chilly». Точную проверку делает AI-модерация на сервере, если она включена.
 */

export type ModerationReason = 'profanity' | 'link';

// Корни, которые ищем в любом месте слова.
const RU_ANYWHERE = ['хуй', 'хуе', 'хуё', 'хуя', 'пизд', 'бляд', 'блят', 'мудак', 'мудил', 'пидор', 'пидар', 'гандон', 'шлюх', 'залуп'];
// Корень «еб-» — только в начале слова или после типичной приставки («заебал», но не «колебался»).
const RU_EB = /^(за|на|по|у|от|вы|до|раз|при|про|об|под|с|въ|съ|из|долбо)?[её]б(а|л|н|у|и|ё|ь)/;
const RU_START = /^сук[аи]/;
const EN_ANYWHERE = ['fuck', 'shit', 'bitch', 'whore', 'nigger', 'nigga', 'faggot'];
const EN_START = /^cunt/; // не «Scunthorpe»

// Похожие латинские буквы и цифры → кириллица, чтобы «xyй» и «п1зд» не проходили.
const TO_CYR: Record<string, string> = {
  '0': 'о', '3': 'з', '1': 'и', '6': 'б', '@': 'а',
  a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', y: 'у', x: 'х', k: 'к', m: 'м', t: 'т', b: 'б', h: 'н', u: 'и',
};

function words(text: string): string[] {
  const raw = text.toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}@$]/gu, '')).filter(Boolean);
  // «х у й» и «f u c k» — склеиваем подряд идущие одиночные буквы.
  const out: string[] = [];
  let run = '';
  for (const w of raw) {
    if (w.length === 1) run += w;
    else {
      if (run.length > 1) out.push(run);
      run = '';
      out.push(w);
    }
  }
  if (run.length > 1) out.push(run);
  return out;
}

function badWord(w: string): boolean {
  // Транслитерацию применяем только к словам, где уже есть кириллица («xyй»), иначе «eBay» станет «ебау».
  const cyr = /\p{Script=Cyrillic}/u.test(w) ? [...w].map((ch) => TO_CYR[ch] ?? ch).join('') : w;
  for (const v of [w, cyr]) {
    if (RU_ANYWHERE.some((r) => v.includes(r)) || RU_EB.test(v) || RU_START.test(v)) return true;
  }
  const en = w.replace(/[@$0!1]/g, (c) => ({ '@': 'a', $: 's', '0': 'o', '!': 'i', '1': 'i' })[c] as string);
  return EN_ANYWHERE.some((r) => en.includes(r)) || EN_START.test(en);
}

const LINK =
  /(https?:\/\/|www\.|t\.me\/|\b[a-z0-9-]{2,}\.(com|io|xyz|net|org|app|site|online|top|live|link|ru|kz|me|gg|fun|pro|info|club|dev|vip)\b)/i;

export function checkText(text: string | null | undefined): { ok: true } | { ok: false; reason: ModerationReason } {
  if (!text) return { ok: true };
  if (LINK.test(text)) return { ok: false, reason: 'link' };
  if (words(text).some(badWord)) return { ok: false, reason: 'profanity' };
  return { ok: true };
}

export function isClean(...texts: (string | null | undefined)[]) {
  return texts.every((t) => checkText(t).ok);
}
