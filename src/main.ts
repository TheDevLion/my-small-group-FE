import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';


const AUTO_RELOAD_GUARD_KEY = 'mysmallgroup_auto_reload_at';
const AUTO_RELOAD_GUARD_WINDOW_MS = 30_000;
const BUILD_CHECK_PARAM = 'build_check';
const AUTH_MIGRATION_KEY = 'mysmallgroup_auth_migration_v2';
const LOGGED_IN_KEY = 'mysmallgroup_logged_in';
const GROUP_ID_KEY = 'mysmallgroup_groupid';
const AUTH_TOKEN_KEY = 'mysmallgroup_auth_token';

const normalizeAssetPath = (src: string) => {
  return new URL(src, window.location.origin).pathname;
};

const getCurrentMainBundlePath = () => {
  const script = document.querySelector<HTMLScriptElement>('script[src*="main."]');
  if (!script?.src) {
    return null;
  }

  return normalizeAssetPath(script.src);
};

const getLatestMainBundlePath = async () => {
  const baseUrl = new URL(document.baseURI, window.location.origin);
  const indexUrl = new URL('index.html', baseUrl);
  indexUrl.searchParams.set(BUILD_CHECK_PARAM, Date.now().toString());

  const response = await fetch(indexUrl.toString(), { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const script = parsed.querySelector<HTMLScriptElement>('script[src*="main."]');

  if (!script?.src) {
    return null;
  }

  return normalizeAssetPath(script.src);
};

const shouldThrottleReload = () => {
  const lastReloadAt = Number(sessionStorage.getItem(AUTO_RELOAD_GUARD_KEY) ?? '0');
  return Date.now() - lastReloadAt < AUTO_RELOAD_GUARD_WINDOW_MS;
};

const redirectWithCacheBust = () => {
  sessionStorage.setItem(AUTO_RELOAD_GUARD_KEY, Date.now().toString());
  const url = new URL(window.location.href);
  url.searchParams.set(BUILD_CHECK_PARAM, Date.now().toString());
  window.location.replace(url.toString());
};

const forceRefreshIfStaleBuild = async () => {
  try {
    const currentMain = getCurrentMainBundlePath();
    if (!currentMain) {
      return false;
    }

    const latestMain = await getLatestMainBundlePath();
    if (!latestMain || currentMain === latestMain) {
      return false;
    }

    if (shouldThrottleReload()) {
      return false;
    }

    redirectWithCacheBust();
    return true;
  } catch {
    return false;
  }
};

const runAuthStorageMigration = () => {
  if (localStorage.getItem(AUTH_MIGRATION_KEY) === 'done') {
    return;
  }

  const loggedIn = sessionStorage.getItem(LOGGED_IN_KEY) === 'true';
  const authToken = sessionStorage.getItem(AUTH_TOKEN_KEY);

  if (loggedIn && !authToken) {
    sessionStorage.removeItem(LOGGED_IN_KEY);
    sessionStorage.removeItem(GROUP_ID_KEY);
  }

  localStorage.setItem(AUTH_MIGRATION_KEY, 'done');
};

forceRefreshIfStaleBuild().then((reloaded) => {
  if (reloaded) {
    return;
  }

  runAuthStorageMigration();

  platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => console.error(err));
});
