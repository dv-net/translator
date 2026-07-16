import axios from 'axios';

export async function translateWithGoogle(text, targetLocale, sourceLocale = 'en') {
  const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
    params: {
      client: 'gtx',
      sl: sourceLocale,
      tl: targetLocale,
      dt: 't',
      q: text,
    },
    timeout: 30_000,
    maxRedirects: 0,
  });

  const translated = response.data?.[0]?.[0]?.[0];
  if (typeof translated !== 'string') {
    throw new Error('Unexpected response from Google Translate');
  }

  return translated;
}
