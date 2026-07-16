# 🌍 @dv.net/translator

Official translation CLI and library by **DV Net** for JSON and Markdown files into multiple locales. Supports incremental JSON updates with hash tracking, parallel translation threads, Google Translate (JSON) and OpenAI GPT (JSON / Markdown).

## ⚡️ Quick start

- 📦 **Install with yarn**
```bash
yarn add -D @dv.net/translator
```

- 💻 **Use in a consumer project**
```json
{
  "devDependencies": {
    "@dv.net/translator": "^1.0.0"
  },
  "scripts": {
    "i18n": "dv-translator translate --dir i18n/locales --all --exclude ru",
    "i18n:md": "dv-translator translate-md --dir blog/translates --all --exclude ru",
    "i18n:status": "dv-translator status --dir i18n/locales"
  }
}
```

Project layout:

```
my-app/
├── i18n/locales/
│   ├── en.json              # source
│   ├── ru.json              # ← generated
│   ├── es.json              # ← generated
│   └── .translation-hashes.json
└── blog/translates/
    ├── en.md                # source
    ├── ru.md                # ← generated
    └── es.md                # ← generated
```

## 📘 CLI commands

Both translation commands work the same way: `--dir` points to the directory containing the English source file. Translations are written into the same directory.

### JSON

```bash
dv-translator translate --dir i18n/locales --all
dv-translator translate --dir i18n/locales --all --exclude ru
dv-translator translate --dir i18n/locales -l ru,es,fr --exclude ru
dv-translator translate --dir i18n/locales --all -f
```

- Reads `i18n/locales/en.json`
- Writes `i18n/locales/ru.json`, `es.json`, ...
- Hashes: `i18n/locales/.translation-hashes.json`
- Default provider: Google (no API key required)

### Markdown

```bash
dv-translator translate-md --dir blog/translates --all
dv-translator translate-md --dir blog/translates --all --exclude ru
dv-translator translate-md --dir blog/translates -l ru,es --exclude ru
dv-translator translate-md --dir blog/translates --all -f
```

- Reads `blog/translates/en.md`
- Writes `blog/translates/ru.md`, `es.md`, ...
- Requires an OpenAI API key

## 🔌 Providers

| Provider | When | API key |
|----------|------|---------|
| `google` | Default for JSON | Not required |
| `gpt` | `-p gpt` (JSON) or `translate-md` | OpenAI |

API key resolution order:
1. `-k/--key`
2. `OPENAI_API_KEY` environment variable
3. `key.txt` in the project root

```bash
# JSON via Google
dv-translator translate --dir i18n/locales -l ru,es

# JSON via GPT
dv-translator translate --dir i18n/locales -l ru -p gpt -k $OPENAI_API_KEY
```

## 🚩 Common flags

| Flag | Description | Default |
|------|-------------|---------|
| `--dir` | Directory with `en.json` / `en.md` | **required** |
| `-l, --locales` | Comma-separated locales | `ru,es,fr,de` |
| `--all` | All locales except `en` | — |
| `--exclude` | Locales to skip | — |
| `-f, --force` | Re-translate everything / overwrite existing files | — |
| `-t, --threads` | Parallel threads | `5` |
| `-k, --key` | OpenAI API key | env / key.txt |
| `-m, --model` | GPT model | `gpt-4o-mini` |

Additional flags for `translate`: `-p, --provider` (`google` / `gpt`)

Additional flags for `translate-md`: `--temperature` (0–2, default `1`)

## 🧰 Utility commands

```bash
dv-translator status --dir i18n/locales
dv-translator clean --dir i18n/locales
dv-translator info
```

`clean` removes `{locale}.json`, `{locale}.md`, and `.translation-hashes.json` from the directory. It does not touch `en.json` or `en.md`.

## 🧩 Programmatic API

```javascript
import Translator from '@dv.net/translator';

const translator = new Translator({ provider: 'google', maxConcurrent: 5 });
await translator.translateJsonFile('i18n/locales/en.json', ['ru', 'es'], 'i18n/locales');
```

## 🧰 Scripts

- ▶️ `start` — run the CLI locally (`node bin/cli.js`)
- 📦 `pack:check` — verify publishable package contents (`npm pack --dry-run`)

## 🛠️ Tech stack

- ⚙️ **Node.js** ESM (`>=18`)
- 🖥️ **Commander** — CLI
- 🌐 **Google Translate** — free JSON translation
- 🤖 **OpenAI** — GPT translation for JSON and Markdown
- 📁 **fs-extra** — file I/O

## 🗂️ Project structure

```
bin/
  cli.js              # CLI entry point
src/
  index.js            # public API (Translator class)
  commands/           # translate, translate-md, status, clean
  providers/          # google, gpt
  utils/              # helpers
  langs.js            # supported locales
```

## 🧑‍💻 Development

1) 📦 Install dependencies
```bash
yarn install
```

2) ▶️ Run the CLI
```bash
yarn start info
yarn start translate --dir ./locales --all
```

3) 📦 Verify package before publish
```bash
yarn pack:check
```

## 📦 Publishing

Publishing is automated via GitHub Release:

1. Bump `version` in `package.json`
2. Create a GitHub Release with tag `vX.Y.Z` matching `package.json`
3. The workflow publishes to npm as `@dv.net/translator`

Requires `NPM_TOKEN` in the `npm` GitHub environment.

## ⚙️ Environment requirements

- 🖥️ Node.js `>=18`
- 🔑 `OPENAI_API_KEY` — only for GPT / Markdown translation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<br>

<div align="center">

**Made with ❤️ for the developer community**

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/dv-net/translator)
[![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/@dv.net/translator)

</div>
