"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

type PhotoRow = {
  id: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  moderation_status: "pending" | "approved" | "rejected" | "removed";
  created_at: string;
};
type PhotoPreview = PhotoRow & { previewUrl: string | null };

const BUCKET = "joyheart-profile-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 5;

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProfilePhotoUpload({ profileReady }: { profileReady: boolean }) {
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [loading, setLoading] = useState(profileReady);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !profileReady) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("profile_photos")
        .select("id,storage_path,mime_type,file_size_bytes,moderation_status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as PhotoRow[];
      const previews = await Promise.all(rows.map(async (photo) => {
        // Owner-only Storage RLS permits a private preview of pending/rejected files.
        const { data: signed, error: signedError } = await supabase.storage.from(BUCKET)
          .createSignedUrl(photo.storage_path, 30);
        return { ...photo, previewUrl: signedError ? null : signed?.signedUrl ?? null };
      }));
      setPhotos(previews);
    } catch {
      setFailed(true);
      setNotice("We could not load your private photo previews. Please refresh and try again.");
    } finally { setLoading(false); }
  }, [profileReady]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setNotice(""); setFailed(false);
    if (!file) return;
    if (!supabase) { setFailed(true); setNotice("Photo uploads are temporarily unavailable."); return; }
    if (!profileReady) { setFailed(true); setNotice("Save your basic profile details first, then add your photo."); return; }
    if (photos.filter((photo) => photo.moderation_status !== "removed").length >= MAX_PHOTOS) {
      setFailed(true); setNotice("You can add up to five active photos. Remove one before adding another."); return;
    }
    if (file.size < 1 || file.size > MAX_BYTES) {
      setFailed(true); setNotice("Each photo must be smaller than 5 MB."); return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.set("photo", file);
      const response = await fetch("/api/profile-photos", { method: "POST", body, credentials: "same-origin" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The photo could not be uploaded.");
      setNotice("Your photo was securely processed and uploaded privately. It is waiting for JoyHeart's safety review.");
      await refresh();
    } catch (error) {
      setFailed(true);
      setNotice(error instanceof Error && error.message ? error.message : "We could not upload that photo. Please try again.");
    } finally { setBusy(false); }
  }

  async function removePhoto(photo: PhotoPreview) {
    if (!supabase || busy) return;
    setBusy(true); setNotice(""); setFailed(false);
    try {
      const response = await fetch(`/api/profile-photos/${encodeURIComponent(photo.id)}`, {
        method: "DELETE", credentials: "same-origin",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) throw new Error(result.error || "The photo could not be removed.");
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setNotice(result.cleanupPending
        ? "Your photo is no longer visible. Its private storage object is queued for cleanup."
        : "Your photo has been removed.");
    } catch (error) {
      setFailed(true);
      setNotice(error instanceof Error && error.message ? error.message : "We could not remove that photo. Please try again.");
    } finally { setBusy(false); }
  }

  const activeCount = photos.filter((photo) => photo.moderation_status !== "removed").length;
  return (
    <section className="profile-photo-uploader" aria-labelledby="profile-photo-title">
      <div className="profile-photo-uploader-heading">
        <div className="profile-photo-icon" aria-hidden="true">♡</div>
        <div><h3 id="profile-photo-title">Your profile photos</h3><p>Add up to five clear photos of yourself. JPG, PNG or WebP, up to 5 MB each.</p></div>
      </div>
      {!profileReady && <p className="profile-photo-help">Save your basic profile details above before adding a photo.</p>}
      <label className={`profile-photo-upload-button${!profileReady || busy || activeCount >= MAX_PHOTOS ? " disabled" : ""}`}>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={!profileReady || busy || activeCount >= MAX_PHOTOS} />
        <span aria-hidden="true">＋</span>{busy ? "Working…" : "Choose a photo"}
      </label>
      <p className="profile-photo-help">Photos are decoded and re-encoded on the server before entering private storage. Only you and authorised safety reviewers can access them before approval.</p>
      {loading && <p className="profile-photo-help">Loading your photos…</p>}
      {photos.length > 0 && <ul className="profile-photo-list">
        {photos.map((photo) => <li key={photo.id}>
          {photo.previewUrl ? <img className="profile-photo-thumbnail" src={photo.previewUrl} alt="Your uploaded profile photo" />
            : <div className="profile-photo-file-icon" aria-hidden="true">▧</div>}
          <div className="profile-photo-file-details">
            <strong>{photo.storage_path.split("/").pop()}</strong>
            <span>{formatSize(photo.file_size_bytes)} · {photo.moderation_status === "pending" ? "Waiting for review" : photo.moderation_status}</span>
          </div>
          {photo.moderation_status !== "removed" && <button type="button" onClick={() => removePhoto(photo)} disabled={busy} aria-label="Remove photo">Remove</button>}
        </li>)}
      </ul>}
      {notice && <p className={failed ? "profile-form-notice error" : "profile-form-notice success"} role="status">{notice}</p>}
      <p className="profile-photo-count">{activeCount} of {MAX_PHOTOS} active photos</p>
    </section>
  );
}
