"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
          console.error("JoyHeart service worker registration failed", error);
        });
      }, { once: true });
    }

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  if (installed || dismissed || !installPrompt) return null;

  return (
    <aside className="pwa-install-banner" aria-label="Install JoyHeart">
      <img src="/pwa-192.svg" alt="" width="42" height="42" />
      <div className="pwa-install-copy">
        <strong>Get the JoyHeart app</strong>
        <span>Install it on your device for quick access.</span>
      </div>
      <button type="button" className="pwa-install-button" onClick={install}>Install</button>
      <button type="button" className="pwa-dismiss-button" aria-label="Dismiss install offer" onClick={() => setDismissed(true)}>×</button>
    </aside>
  );
}
