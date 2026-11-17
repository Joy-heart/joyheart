export default function OfflinePage() {
  return (
    <main className="pwa-offline-page">
      <img src="/pwa-192.svg" alt="" width="76" height="76" />
      <p className="eyebrow">JoyHeart</p>
      <h1>You’re offline</h1>
      <p>We can’t reach JoyHeart right now. Check your internet connection and try again.</p>
      <a className="button button-primary" href="/">Try again</a>
      <p className="pwa-offline-note">For your safety, private profiles, messages and account information are not stored for offline use.</p>
    </main>
  );
}
