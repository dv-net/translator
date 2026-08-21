export class ProgressTracker {
  constructor() {
    this.totalStrings = 0;
    this.localeProgress = new Map();
    this.activeLocales = new Set();
  }

  setTotalStrings(count) {
    this.totalStrings = count;
  }

  setLocale(locale) {
    this.localeProgress.set(locale, 0);
    this.activeLocales.add(locale);
  }

  incrementProgress(locale) {
    const current = this.localeProgress.get(locale) || 0;
    this.localeProgress.set(locale, current + 1);
    this.updateProgressBar();
  }

  updateProgressBar() {
    process.stdout.write('\r');

    for (const locale of this.activeLocales) {
      const progress = this.localeProgress.get(locale) || 0;
      const percentage = this.totalStrings > 0 ? Math.round((progress / this.totalStrings) * 100) : 0;
      const filled = Math.round((percentage / 100) * 20);
      const empty = 20 - filled;
      const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
      process.stdout.write(`[${locale}] ${progressBar} ${progress}/${this.totalStrings} (${percentage}%)\n`);
    }

    const allCompleted = Array.from(this.activeLocales).every(
      (locale) => (this.localeProgress.get(locale) || 0) >= this.totalStrings,
    );

    if (allCompleted) {
      process.stdout.write('\n');
    }
  }

  getLocaleProgress(locale) {
    return this.localeProgress.get(locale) || 0;
  }

  getTotalProgress() {
    let sum = 0;
    for (const locale of this.activeLocales) {
      sum += this.getLocaleProgress(locale);
    }
    return sum;
  }

  reset() {
    this.localeProgress.clear();
    this.activeLocales.clear();
  }
}
