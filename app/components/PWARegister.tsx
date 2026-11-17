"use client";

import { useEffect, useRef, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __joyheartInstallPrompt?: InstallPromptEvent | null;
  }
}

const REQUEST_EVENT = "joyheart:pwa-install-request";
const STATUS_EVENT = "joyheart:pwa-install-status";
const AVAILABLE_EVENT = "joyheart:pwa-install-available";

export default function PWARegister() {
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const publish = (isInstalled: boolean) => window.dispatchEvent(
      new CustomEvent(STATUS_EVENT, { detail: { installed: isInstalled } })
    );

    // The early bootstrap listener in the document head/body may have captured
    // Chrome's one-shot event before React hydrated. Recover it before wiring UI.
    promptRef.current = window.__joyheartInstallPrompt ?? null;

    const registerWorker = () => {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
          console.error("JoyHeart service worker registration failed", error);
        });
      }
    };
    // Register as soon as this component mounts rather than waiting for window.load.
    registerWorker();

    const onAvailable = () => {
      promptRef.current = window.__joyheartInstallPrompt ?? null;
    };
    const onInstalled = () => {
      setInstalled(true);
      promptRef.current = null;
      window.__joyheartInstallPrompt = null;
      setShowHelp(false);
      publish(true);
    };
    const onRequest = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) return;
      const prompt = promptRef.current ?? window.__joyheartInstallPrompt ?? null;
      if (prompt) void runInstall(prompt);
      else setShowHelp(true);
    };

    window.addEventListener(AVAILABLE_EVENT, onAvailable);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(REQUEST_EVENT, onRequest);
    publish(standalone);

    return () => {
      window.removeEventListener(AVAILABLE_EVENT, onAvailable);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(REQUEST_EVENT, onRequest);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runInstall(event: InstallPromptEvent) {
    setBusy(true);
    try {
      // prompt() is called immediately from the user's click event.
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        publishInstalled();
      }
    } catch (error) {
      console.error("JoyHeart install prompt failed", error);
      setShowHelp(true);
    } finally {
      promptRef.current = null;
      window.__joyheartInstallPrompt = null;
      setBusy(false);
    }
  }

  function publishInstalled() {
    window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: { installed: true } }));
  }

  async function handleInstall() {
    const prompt = promptRef.current ?? window.__joyheartInstallPrompt ?? null;
    if (prompt) await runInstall(prompt);
    else setShowHelp(true);
  }

  if (installed) return null;

  return (
    <>
      <aside className="pwa-install-banner" aria-label="Install JoyHeart">
        <img src="/pwa-192.svg" alt="" width="42" height="42" />
        <div className="pwa-install-copy">
          <strong>Install the JoyHeart app</strong>
          <span>Get quick access from your home screen.</span>
        </div>
        <button type="button" className="pwa-install-button" onClick={handleInstall} disabled={busy}>
          {busy ? "Opening…" : "Install"}
        </button>
      </aside>
      {showHelp && (
        <div className="pwa-help-backdrop" role="presentation" onClick={() => setShowHelp(false)}>
          <section className="pwa-help-dialog" role="dialog" aria-modal="true" aria-labelledby="pwa-help-title" onClick={(event) => event.stopPropagation()}>
            <button className="pwa-help-close" type="button" aria-label="Close" onClick={() => setShowHelp(false)}>×</button>
            <img src="/pwa-192.svg" alt="" width="54" height="54" />
            <h2 id="pwa-help-title">Install JoyHeart</h2>
            <p>Your browser has not made its direct install prompt available yet.</p>
            <ol>
              <li>Make sure you are using Chrome and are not in Incognito mode.</li>
              <li>Update Chrome, then reload JoyHeart.</li>
              <li>If Chrome offers <strong>Install app</strong> in its browser menu, use that option.</li>
            </ol>
            <p className="pwa-help-note">Some browsers do not expose a website-controlled install prompt. JoyHeart cannot force the browser to show one.</p>
            <button type="button" className="pwa-install-button pwa-help-done" onClick={() => setShowHelp(false)}>Close</button>
          </section>
        </div>
      )}
    </>
  );
}
