# MySmallGroup FE

Frontend for managing small-group data: participants, events, reports, and settings. Built with Angular and deployed to GitHub Pages.

## Repository Description (<=350 chars)
Angular frontend for managing small-group participants, events, and reports with a cookie-based login flow. Connects to a backend API, keeps session state client-side, and deploys to GitHub Pages. Mobile-friendly UI and simple admin workflows.

## Tech Stack (Important Libraries)
- Angular 15.1.x (`@angular/core`, `@angular/router`, `@angular/forms`, `@angular/common`, `@angular/platform-browser`)
- Angular Material 15.2.9 (`@angular/material`, `@angular/cdk`)
- RxJS 7.8.x (`rxjs`)
- Zone.js 0.12.x (`zone.js`)
- TypeScript 4.9.x (`typescript`)

## Overview
- Single-page app with routes for settings, participants, calendar, event manager, and reports.
- Backend-driven auth using HttpOnly cookies (no bearer token stored in the browser).
- All data requests go through the backend API (no direct CMS/GraphQL calls from the frontend).

## Product Description
MySmallGroup helps small-group leaders manage people and events in one simple place. Track participants, record attendance, organize event details, and generate quick reports without spreadsheets. The focus is on lightweight workflows that work on mobile and desktop.

## How It Works
- Login sends a passcode to the backend and expects `{ groupID }` in response.
- Backend sets an HttpOnly session cookie; the frontend includes it via `credentials: "include"`.
- Session state is stored in sessionStorage (`mysmallgroup_logged_in`, `mysmallgroup_groupid`) to guard routes.
- All API calls use `environment.apiUrl` as a base URL.

Relevant code:
- Login flow: `src/app/component/login/login.component.ts`
- API client: `src/app/helpers/base_request.ts`
- Route guard: `src/app/guards/auth.guard.ts`
- Routes: `src/app/app-routing.module.ts`

## Requirements
- Node.js 18+
- pnpm (recommended)

## Install
```bash
pnpm install
```

## Run Locally
```bash
pnpm start
```

Default dev URL: `http://localhost:4200`

## Build
```bash
pnpm run build
```

Production build output goes to `docs/` (see `angular.json`).

## Configuration
Environment files:
- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production)

`environment.prod.ts` contains the public backend URL used in production builds.

## CI/CD (GitHub Pages)
This repo includes a workflow at `/.github/workflows/deploy.yml` that:
- Installs dependencies
- Builds the app
- Deploys the `docs/` folder to GitHub Pages

Backend URL selection:
- If a GitHub Actions secret `BACKEND_URL` is set, the workflow overwrites `environment.prod.ts` during the build.
- If no secret is set, the workflow uses the URL already in `environment.prod.ts`.

To use GitHub Pages:
1) Enable Pages for the repo with source "GitHub Actions".
2) (Optional) Add `BACKEND_URL` as a repository secret.

## UI Notes
- Icons: https://fonts.google.com/icons
