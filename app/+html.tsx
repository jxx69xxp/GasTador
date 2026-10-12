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
