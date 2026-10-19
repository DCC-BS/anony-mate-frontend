# AnonyMate-frontend

![anony-mate-frontend Screenshot](_imgs/screenshot.png)

AnonyMate is a modern web application for redacting sensitive information from free-form text and PDF documents. Users choose which entity types to detect and list terms that must stay visible; everything found is redacted until they say otherwise. Built with Nuxt 4 and TypeScript, the whole pipeline — document queue, review, and storage — runs client-side in the browser.

This repository contains the frontend application; the backend is built with Python FastAPI and available at [https://github.com/DCC-BS/anony-mate-api](https://github.com/DCC-BS/anony-mate-api).

![GitHub License](https://img.shields.io/github/license/DCC-BS/anony-mate-frontend) [![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

---

<p align="center">
  <a href="https://dcc-bs.github.io/documentation/">DCC Documentation & Guidelines</a> | <a href="https://www.bs.ch/daten/databs/dcc">DCC Website</a>
</p>

---

## Features

### Core Capabilities

- **Text & PDF Review**: Review detections either on the original text in the editor or directly on the uploaded PDF in the browser's viewer — the original file is kept and every detection arrives as a mark with its boxes on the page.
- **Entity Type Management**: Curated presets (`default`, `legal`, `full`) seeded on first run, plus custom entity types with display names, detector descriptions, and replacement templates (`{name}`, `{label}`, `{subject}`, `{occurrence}`).
- **Detection Groups**: Named sets of entity types chosen when a document is queued; swapping a group re-detects the document. Built-in groups can be copied into groups of your own.
- **Never-Redact List**: Terms exempt from redaction — they stay visible even when a detector matches them.
- **Client-Owned Pipeline**: The document queue (staged → converting → redacting → ready) lives entirely in IndexedDB; a reload picks up whatever is unfinished. Documents are cleaned up after a configurable retention period.
- **Safe-By-Default Review**: Every detection arrives redacted and stays that way unless explicitly un-redacted. A review wizard walks the redactions one at a time; a threshold slider raises the confidence floor per document.
- **Hand Marking**: File detections by hand — words selected in the editor or a rectangle drawn over a PDF page — each arriving as a redacted detection of the chosen entity type. Hand-drawn marks' guessed text is editable inline.
- **Redaction Styles**: Write redactions as the entity type's placeholder (e.g. `Person-1`) or as black bars (`████`).
- **Annotated PDF Export**: PDF reviews export the original with one redaction annotation (ISO 32000) per kept mark, ready for Kofax Power PDF or Acrobat to apply.
- **Multilingual Support**: German (`de-CH`) and English interface.

## Technology Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) (Vue 3 Composition API with `<script setup lang="ts">`)
- **UI & Styling**: [Nuxt UI v4](https://ui.nuxt.com/) & [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide Icons](https://lucide.dev/) via `@iconify-json/lucide`
- **PDF Rendering**: [pdf.js](https://mozilla.github.io/pdf.js/) via `@dcc-bs/common-ui.bs.js`
- **Client Storage**: [Dexie](https://dexie.org/) (IndexedDB) for documents, detections, and entity groups
- **Internationalization**: [@nuxtjs/i18n](https://i18n.nuxtjs.org/)
- **Environment & Secrets**: [Varlock](https://varlock.dev/) with Proton Pass plugin
- **Package Manager**: [Bun](https://bun.sh/)
- **Tool Version Manager**: [Mise](https://mise.jdx.dev/)
- **Linter & Formatter**: [Biome](https://biomejs.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit) & [Playwright](https://playwright.dev/) (E2E)

---

## Setup

### Prerequisites

We recommend using [mise](https://mise.jdx.dev/) to automatically manage tool versions (Bun, Node.js, Varlock, pass-cli):

```bash
mise install
```

### Environment Configuration

Create a `.env` file in the project root with the basic environment mode:

```bash
APP_MODE=dev      # dev, ci, build, prod
```

#### Environment Variables

Environment variables are validated using Varlock schemas (`.env.schema`, `.env.runtime.schema`, `.env.buildtime.schema`, `.env.dev.schema`):

| Variable | Description | Default | Type |
|----------|-------------|---------|------|
| **Core Configuration** | | | |
| `APP_MODE` | Application runtime mode (`dev`, `ci`, `build`, `prod`) | `dev` | enum |
| `USE_FEEDBACK` | Enable feedback widget | `true` (non-CI) | boolean |
| `DUMMY` | Enable mock data mode (no backend required) | `false` | boolean |
| **Backend & Services** | | | |
| `API_PORT` | Backend API port | `8000` | port |
| `NUXT_API_URL` | Backend API URL | `http://localhost:8000` (dev) | URL |
| `NUXT_FEEDBACK_GITHUB_TOKEN` | GitHub token for feedback reporting | Proton Pass (dev) | string (sensitive) |
| `NUXT_PUBLIC_POLL_INTERVAL_MS` | Interval between task status polls | `3000` | number |
| `NUXT_PUBLIC_DOCUMENT_RETENTION_DAYS` | Days a document is kept locally before cleanup | `7` | number |
| `NUXT_PUBLIC_LOGGER_LOG_LEVEL` | Client log level | `debug` (dev), `info` (prod) | enum |
| **UI & Onboarding Flags** | | | |
| `NUXT_PUBLIC_COMMON_UI_DISABLE_CHANGELOG` | Disable changelog modal | `true` | boolean |
| `NUXT_PUBLIC_COMMON_UI_DISABLE_DISCLAIMER` | Disable disclaimer banner | `true` | boolean |
| `NUXT_PUBLIC_COMMON_UI_DISABLE_ONBOARDING` | Disable onboarding tour (off in CI) | `false` | boolean |
| `NUXT_PUBLIC_COMMON_UI_DISABLE_SYSTEM_STATUS` | Disable backend health indicator | `true` | boolean |

### Varlock & Secrets Management

We use [varlock](https://varlock.dev/) for schema-based validation and optional secret retrieval from Proton Pass:

```bash
# Validate and load secrets into the environment
mise run env
```

---

## Development

Start the development server (backend API expected at `http://localhost:8000`):

```bash
# Using mise
mise run dev

# Or via varlock directly
npx varlock run -- nuxt dev
```

### Development with Inspector

```bash
mise run debug
```

### Dummy Mode (Offline / Mock Data)

Run the frontend with mocked backend responses (no Python backend or detection model required):

```bash
mise run dummy
```

---

## Project Architecture

```text
app/
├── assets/                 # Main CSS styles
├── components/             # Vue components (PascalCase)
│   ├── documents/          # Document queue table & status badges
│   ├── entities/           # Entity type, group & never-redact editors
│   ├── new/                # New-document form (group & output selection)
│   └── review/             # Editor/PDF review, detection sidebar, wizard
├── composables/            # Reactive Vue composables (useXxx)
├── layouts/                # Page layouts
├── pages/                  # Route pages
├── plugins/                # Client plugins
├── stores/                 # Client-side state
├── types/                  # TypeScript models
└── utils/                  # Framework-agnostic utilities
server/
├── api/                    # Nitro API endpoints
└── assets/                 # Changelogs
shared/
└── types/                  # Shared TypeScript types (client & server)
i18n/
└── locales/                # de-CH & en translations
test/                       # Vitest config & setup
e2e/                        # Playwright E2E tests (*.spec.ts)
docker/                     # Docker compose files & Nginx config
```

---

## Testing & Quality Assurance

### Unit Tests (Vitest)

```bash
# Run all unit tests
mise run test:unit

# Run tests in watch mode
mise run test:watch

# Run with coverage report
mise run test:coverage
```

### Type Checking & Linting

```bash
# TypeScript strict type check
mise run tsc

# Biome code formatting
mise run lint

# Biome check & autofix
mise run check
```

### End-to-End Tests (Playwright)

```bash
# Build, serve and run all E2E tests
mise run e2e

# Run with Playwright interactive UI
mise run e2e:ui

# Generate tests via Playwright codegen (requires a running e2e:serve)
mise run e2e:codegen
```

---

## Production Build & Deployment

### Build & Preview

```bash
# Build production bundle
mise run build

# Preview production build locally
mise run preview
```

### Docker Deployment

Build and run using the multi-stage Dockerfile:

```bash
# Build Docker image
docker build -t anony-mate-frontend .

# Run container
docker run -p 3000:3000 anony-mate-frontend
```

---

## License

[MIT](LICENSE) © Data Competence Center Basel-Stadt

<a href="https://www.bs.ch/schwerpunkte/daten/databs/schwerpunkte/datenwissenschaften-und-ki"><img src="https://github.com/DCC-BS/.github/blob/main/_imgs/databs_log.png?raw=true" alt="DCC Logo" width="200" /></a>

Datenwissenschaften und KI <br>
Developed with ❤️ by DCC - Data Competence Center
