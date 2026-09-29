# 🌍 @dv.net/translator

CLI and library by **DV Net** for translating JSON and Markdown into multiple locales with OpenAI GPT. Supports incremental JSON updates (hash tracking) and parallel threads.

## ⚡️ Quick start

```bash
yarn add -D @dv.net/translator
```

```json
{
  "devDependencies": {
    "@dv.net/translator": "^2.0.1"
  },
  "scripts": {
    "i18n": "dv-translator translate --dir i18n/locales --all --exclude ru",
    "i18n:md": "dv-translator translate-md --dir blog/translates --all --exclude ru",
    "i18n:status": "dv-translator status --dir i18n/locales"
  }
}
```

```
my-app/
├── i18n/locales/
│   ├── en.json
│   ├── ru.json
│   └── .translation-hashes.json
└── blog/translates/
    ├── en.md
    └── ru.md
```

## 📘 Commands

`--dir` — folder with `en.json` / `en.md`. Translations are written next to the source.

```bash
# JSON
dv-translator translate --dir i18n/locales --all              # all locales except en
dv-translator translate --dir i18n/locales -l ru,es -m gpt-5.5 # pick locales + model
dv-translator translate --dir i18n/locales --all -f           # force re-translate everything
dv-translator translate --dir i18n/locales -l ru --context "Dental clinic" # domain context

# Markdown
dv-translator translate-md --dir blog/translates --all        # all locales except en
dv-translator translate-md --dir blog/translates -l ru -m gpt-5.5 # one locale + model
dv-translator translate-md --dir blog/translates -l ru --context "Dental clinic" # domain context

# Utils
dv-translator status --dir i18n/locales   # new/changed strings vs hashes
dv-translator prune --dir i18n/locales    # drop keys missing from en.json
dv-translator clean --dir i18n/locales    # delete locale files + hashes
dv-translator locales                    # list supported locales
```

## ⚙️ Defaults

Out of the box:

| Setting | Default |
|---------|---------|
| Provider | OpenAI GPT only |
| Model | `gpt-5.5` |
| Locales | default `ru,es,fr,de` (4); `--all` → 38 supported (see `locales`) |
| Threads | `10` (max `20`) |
| JSON request timeout | `100s` |
| Markdown request timeout | `180s` |
| API key | `OPENAI_API_KEY` (env or `.env`) |
| Context | off (`--context` optional) |
| JSON mode | incremental (hash-based); use `-f` to force |
| On API/timeout error | stop all locales, save partial, exit `1` |
| Source files | `en.json` / `en.md` in `--dir` |

## 🔑 API key

Set `OPENAI_API_KEY` in the environment, or in a `.env` file in the project root:

```bash
cp .env.example .env
# edit .env and set OPENAI_API_KEY=sk-...
```

## 🚩 Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--dir` | Directory with `en.json` / `en.md` | **required** |
| `-l, --locales` | Comma-separated locales | `ru,es,fr,de` |
| `--all` | All locales except `en` | — |
| `--exclude` | Locales to skip | — |
| `-f, --force` | Re-translate / overwrite | — |
| `-t, --threads` | Parallel threads | `10` |
| `-m, --model` | OpenAI model | `gpt-5.5` |
| `--context` | Domain context for ambiguous terms | — |


`translate-md` also has `--temperature` (0–2, default `1`).

## 🧩 Programmatic API

```javascript
import Translator from '@dv.net/translator';

const translator = new Translator({
  openAiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5.5',
  maxConcurrent: 10,
  context: 'Dental clinic website',
});
await translator.translateJsonFile('i18n/locales/en.json', ['ru', 'es'], 'i18n/locales');
```

## 🧑‍💻 Development

Sample sources for manual tests live in `examples/`:

- `examples/locales/en.json` — JSON (placeholders, HTML, brands, edge cases)
- `examples/md/en.md` — Markdown (front matter, tables, code, ICU-like copy)

Only `en.*` are tracked; generated `ru.*` / hashes stay local (gitignored).

```bash
yarn install
cp .env.example .env   # set OPENAI_API_KEY

yarn start locales                                       # list supported locales
yarn start translate --dir examples/locales -l ru        # translate JSON → ru
yarn start translate --dir examples/locales -l ru -f     # force re-translate JSON
yarn start translate --dir examples/locales -l ru --context "Dental clinic"  # with domain context
yarn start translate-md --dir examples/md -l ru          # translate Markdown → ru
yarn start translate-md --dir examples/md -l ru -f       # force overwrite Markdown
yarn start status --dir examples/locales                 # new/changed strings vs hashes
yarn start prune --dir examples/locales                  # drop keys missing from en.json
yarn start clean --dir examples/locales                  # delete locale files + hashes
yarn pack:check                                          # preview npm pack contents
```

## 📄 License

MIT — see [LICENSE](LICENSE).
