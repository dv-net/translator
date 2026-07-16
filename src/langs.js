const LANGUAGES = [
  { id: 3, name: 'Arabic', isoCode: 'ar', originalName: 'العربية' },
  { id: 4, name: 'Bengali', isoCode: 'bn', originalName: 'বাংলা' },
  { id: 5, name: 'Bulgarian', isoCode: 'bg', originalName: 'Български' },
  { id: 7, name: 'Chinese', isoCode: 'zh', originalName: '中文' },
  { id: 15, name: 'Czech', isoCode: 'cs', originalName: 'Čeština' },
  { id: 16, name: 'Danish', isoCode: 'da', originalName: 'Dansk' },
  { id: 27, name: 'Dutch', isoCode: 'nl', originalName: 'Nederlands' },
  { id: 2, name: 'English', isoCode: 'en', originalName: 'English' },
  { id: 18, name: 'Estonian', isoCode: 'et', originalName: 'Eesti' },
  { id: 19, name: 'Finnish', isoCode: 'fi', originalName: 'Suomi' },
  { id: 13, name: 'French', isoCode: 'fr', originalName: 'Français' },
  { id: 8, name: 'German', isoCode: 'de', originalName: 'Deutsch' },
  { id: 17, name: 'Greek', isoCode: 'el', originalName: 'Ελληνικά' },
  { id: 33, name: 'Hindi', isoCode: 'hi', originalName: 'हिन्दी' },
  { id: 20, name: 'Hungarian', isoCode: 'hu', originalName: 'Magyar' },
  { id: 21, name: 'Indonesian', isoCode: 'id', originalName: 'Bahasa Indonesia' },
  { id: 22, name: 'Italian', isoCode: 'it', originalName: 'Italiano' },
  { id: 14, name: 'Japanese', isoCode: 'ja', originalName: '日本語' },
  { id: 23, name: 'Korean', isoCode: 'ko', originalName: '한국어' },
  { id: 25, name: 'Latvian', isoCode: 'lv', originalName: 'Latviešu' },
  { id: 24, name: 'Lithuanian', isoCode: 'lt', originalName: 'Lietuvių' },
  { id: 26, name: 'Norwegian', isoCode: 'nb', originalName: 'Norsk' },
  { id: 9, name: 'Polish', isoCode: 'pl', originalName: 'Polski' },
  { id: 10, name: 'Portuguese', isoCode: 'pt', originalName: 'Português' },
  { id: 28, name: 'Romanian', isoCode: 'ro', originalName: 'Română' },
  { id: 29, name: 'Slovak', isoCode: 'sk', originalName: 'Slovenčina' },
  { id: 30, name: 'Slovenian', isoCode: 'sl', originalName: 'Slovenščina' },
  { id: 1, name: 'Russian', isoCode: 'ru', originalName: 'Русский' },
  { id: 6, name: 'Spanish', isoCode: 'es', originalName: 'Español' },
  { id: 11, name: 'Swahili', isoCode: 'sw', originalName: 'Kiswahili' },
  { id: 31, name: 'Swedish', isoCode: 'sv', originalName: 'Svenska' },
  { id: 32, name: 'Turkish', isoCode: 'tr', originalName: 'Türkçe' },
  { id: 12, name: 'Ukrainian', isoCode: 'uk', originalName: 'Українська' },
  { id: 34, name: 'Vietnam', isoCode: 'vi', originalName: 'Tiếng Việt' },
  { id: 35, name: 'Belarusian', isoCode: 'be', originalName: 'Беларуская' },
];

export { LANGUAGES };

export function loadLocales() {
  return LANGUAGES.map((lang) => lang.isoCode);
}
