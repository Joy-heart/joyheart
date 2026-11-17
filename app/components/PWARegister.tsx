"use client";

import { useEffect, useRef, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const REQUEST_EVENT = "joyheart:pwa-install-request";
const STATUS_EVENT = "joyheart:pwa-install-status";

export default function PWARegister() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
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
    const registerWorker = () => {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
          console.error("JoyHeart service worker registration failed", error);
        });
      }
    };
    if (document.readyState === "complete") registerWorker();
    else window.addEventListener("load", registerWorker, { once: true });

    const onPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      promptRef.current = null;
      setPromptEvent(null);
      setShowHelp(false);
      publish(true);
    };
    const onRequest = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) return;
      if (promptRef.current) void runInstall(promptRef.current);
      else setShowHelp(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(REQUEST_EVENT, onRequest);
    publish(standalone);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(REQUEST_EVENT, onRequest);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runInstall(event: InstallPromptEvent) {
    setBusy(true);
    try {
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
      setPromptEvent(null);
      setBusy(false);
    }
  }

  function publishInstalled() {
    window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: { installed: true } }));
  }

  async function handleInstall() {
    if (promptRef.current) await runInstall(promptRef.current);
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
            <p>To add JoyHeart to this device:</p>
            <ol>
              <li>Open this page in your browser.</li>
              <li>Tap the browser menu (three dots or Share).</li>
              <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>Confirm the installation.</li>
            </ol>
            <p className="pwa-help-note">If JoyHeart is already installed, open it from your home screen. You can install it again after uninstalling it.</p>
            <button type="button" className="pwa-install-button pwa-help-done" onClick={() => setShowHelp(false)}>Got it</button>
          </section>
        </div>
      )}
    </>
  );
}
