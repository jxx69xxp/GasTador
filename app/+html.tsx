import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web-only root HTML: adds PWA manifest, icons and service worker.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#A78BFA" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Paws" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        {/* Desktop: keep the phone UI as a centered column instead of stretching edge to edge. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `@media (min-width: 600px) {
  body { background: #E9E6F7; }
  #root { max-width: 480px; margin: 0 auto; box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 12px 48px rgba(31,41,55,.18); }
  /* RN-web Modal portals (unstyled divs on body): the transform makes their fixed children fill the column, not the window. */
  body > div:not([id]):not([style]) { position: fixed; inset: 0; max-width: 480px; margin: 0 auto; transform: translateZ(0); pointer-events: none; }
  body > div:not([id]):not([style]) > * { pointer-events: auto; }
}
@media (min-width: 600px) and (prefers-color-scheme: dark) { body { background: #07080F; } }`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            // Stash the install event: it can fire before React mounts InstallPrompt.
            __html: `if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.__bip=e;dispatchEvent(new Event('bip'))})`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
