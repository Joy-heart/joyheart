"use client";

import { useState } from "react";

export type ModerationPhoto = {
  id: string;
  memberReference: string;
  mimeType: string;
  fileSizeBytes: number;
  submittedAt: string;
  imageUrl: string | null;
};

export default function PhotoModerationQueue({ initialPhotos }: { initialPhotos: ModerationPhoto[] }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  async function review(photoId: string, decision: "approved" | "rejected") {
    setBusyId(photoId);
    setNotice("");
    try {
      const response = await fetch("/api/staff/photos/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, decision }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The review could not be saved.");
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      setNotice(decision === "approved" ? "Photo approved." : "Photo rejected.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The review could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="staff-review-page">
      <section className="staff-review-shell">
        <p className="staff-review-eyebrow">JoyHeart safety team</p>
        <h1>Profile photo review</h1>
        <p className="staff-review-intro">Only active staff can access this private queue. Approved photos can be considered for member discovery; rejected photos stay private.</p>
        <p className="staff-review-count">{photos.length} photo{photos.length === 1 ? "" : "s"} waiting for review</p>
        {notice && <p className="staff-review-notice" role="status">{notice}</p>}
        {photos.length === 0 ? <div className="staff-review-empty">There are no photos waiting for review.</div> : (
          <div className="staff-review-grid">
            {photos.map((photo) => (
              <article className="staff-review-card" key={photo.id}>
                {photo.imageUrl
                  ? <img src={photo.imageUrl} alt="Member-submitted profile photo awaiting moderation" />
                  : <div className="staff-review-image-error">Private image preview unavailable</div>}
                <div className="staff-review-card-details">
                  <p>Member reference: <strong>{photo.memberReference}</strong></p>
                  <p>{photo.mimeType} · {(photo.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                  <p>Submitted {new Date(photo.submittedAt).toLocaleString()}</p>
                  <div className="staff-review-actions">
                    <button type="button" onClick={() => review(photo.id, "approved")} disabled={Boolean(busyId) || !photo.imageUrl}>Approve</button>
                    <button type="button" className="reject" onClick={() => review(photo.id, "rejected")} disabled={Boolean(busyId)}>Reject</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
