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
  const [rejectingId, setRejectingId] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);

  async function review(photoId: string, decision: "approved" | "rejected", rejectionReason?: string) {
    if (decision === "approved" && !window.confirm("Approve this photo? It may become eligible for member profile display after the remaining launch checks.")) return;
    if (decision === "rejected" && (!rejectionReason || !rejectionReason.trim())) {
      setFailed(true);
      setNotice("Please add a reason before rejecting this photo.");
      return;
    }
    if (rejectionReason && rejectionReason.trim().length > 500) {
      setFailed(true);
      setNotice("The rejection reason must be 500 characters or fewer.");
      return;
    }

    setBusyId(photoId);
    setNotice("");
    setFailed(false);
    try {
      const response = await fetch("/api/staff/photos/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, decision, reason: rejectionReason?.trim() || null }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The review could not be saved.");
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      setRejectingId("");
      setReason("");
      setNotice(decision === "approved" ? "Photo approved and removed from the pending queue." : "Photo rejected and kept private.");
    } catch (error) {
      setFailed(true);
      setNotice(error instanceof Error ? error.message : "The review could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="staff-review-page">
      <section className="staff-review-shell">
        <div className="staff-review-heading-row">
          <div>
            <p className="staff-review-eyebrow">JoyHeart safety team</p>
            <h1>Profile photo review</h1>
            <p className="staff-review-intro">Review each photo carefully. Only active staff can access this private queue. Rejected photos remain private.</p>
          </div>
          <button className="staff-review-refresh" type="button" onClick={() => window.location.reload()} disabled={Boolean(busyId)}>Refresh queue</button>
        </div>
        <p className="staff-review-count" aria-live="polite">{photos.length} photo{photos.length === 1 ? "" : "s"} waiting for review</p>
        {notice && <p className={failed ? "staff-review-notice error" : "staff-review-notice"} role="status">{notice}</p>}
        {photos.length === 0 ? (
          <div className="staff-review-empty">
            <span aria-hidden="true">♡</span>
            <h2>All caught up</h2>
            <p>There are no photos waiting for review right now.</p>
          </div>
        ) : (
          <div className="staff-review-grid">
            {photos.map((photo) => (
              <article className="staff-review-card" key={photo.id}>
                {photo.imageUrl
                  ? <img src={photo.imageUrl} alt="Member-submitted profile photo awaiting moderation" />
                  : <div className="staff-review-image-error">Private image preview unavailable. Refresh the queue to request a new preview.</div>}
                <div className="staff-review-card-details">
                  <p>Member reference: <strong>{photo.memberReference}</strong></p>
                  <p>{photo.mimeType} · {(photo.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                  <p>Submitted {new Date(photo.submittedAt).toLocaleString()}</p>
                  {rejectingId === photo.id ? (
                    <div className="staff-review-rejection">
                      <label htmlFor={`reject-reason-${photo.id}`}>Reason for rejection</label>
                      <textarea
                        id={`reject-reason-${photo.id}`}
                        value={reason}
                        onChange={(event) => setReason(event.target.value.slice(0, 500))}
                        maxLength={500}
                        rows={3}
                        placeholder="Explain what needs to change in this photo"
                      />
                      <p>{reason.length}/500 characters. This reason is saved with the review.</p>
                      <div className="staff-review-actions">
                        <button type="button" className="reject" onClick={() => void review(photo.id, "rejected", reason)} disabled={Boolean(busyId)}>{busyId === photo.id ? "Saving…" : "Confirm rejection"}</button>
                        <button type="button" className="cancel" onClick={() => { setRejectingId(""); setReason(""); }} disabled={Boolean(busyId)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="staff-review-actions">
                      <button type="button" onClick={() => void review(photo.id, "approved")} disabled={Boolean(busyId) || !photo.imageUrl}>{busyId === photo.id ? "Saving…" : "Approve"}</button>
                      <button type="button" className="reject" onClick={() => { setRejectingId(photo.id); setReason(""); setNotice(""); setFailed(false); }} disabled={Boolean(busyId)}>Reject</button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
