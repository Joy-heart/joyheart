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
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      const { data, error } = await supabase
        .from("profile_photos")
        .select("id,storage_path,mime_type,file_size_bytes,moderation_status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as PhotoRow[];
      const previews = await Promise.all(rows.map(async (photo) => {
        const { data: signed, error: signedError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(photo.storage_path, 10 * 60);
        return { ...photo, previewUrl: signedError ? null : signed?.signedUrl ?? null };
      }));
      setPhotos(previews);
    } catch {
      setFailed(true);
      setNotice("We could not load your private photo previews. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [profileReady]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setNotice("");
    setFailed(false);
    if (!file) return;

    if (!supabase) {
      setFailed(true);
      setNotice("Photo uploads are temporarily unavailable.");
      return;
    }
    if (!profileReady) {
      setFailed(true);
      setNotice("Save your basic profile details first, then add your photo.");
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      setFailed(true);
      setNotice("You can add up to five photos. Remove one before adding another.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFailed(true);
      setNotice("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size < 1 || file.size > MAX_BYTES) {
      setFailed(true);
      setNotice("Each photo must be smaller than 5 MB.");
      return;
    }

    setBusy(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email_confirmed_at) {
        throw new Error("Please verify your email and sign in again.");
      }

      const { data: existing, error: countError } = await supabase
        .from("profile_photos")
        .select("id")
        .limit(MAX_PHOTOS);
      if (countError) throw countError;
      if ((existing ?? []).length >= MAX_PHOTOS) {
        throw new Error("You can add up to five photos. Remove one before adding another.");
      }

      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase
        .from("profile_photos")
        .insert({
          user_id: user.id,
          storage_path: storagePath,
          mime_type: file.type,
          file_size_bytes: file.size,
          moderation_status: "pending",
        });

      if (metadataError) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw metadataError;
      }

      setNotice("Photo uploaded privately. It is waiting for JoyHeart's safety review and is not visible to other members.");
      await refresh();
    } catch (error) {
      setFailed(true);
      const message = error instanceof Error ? error.message : "";
      setNotice(message.includes("Bucket not found") || message.includes("profile_photos")
        ? "The private photo service is not ready yet. Its database and storage migration must be reviewed and applied first."
        : message || "We could not upload that photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(photo: PhotoPreview) {
    if (!supabase || busy) return;
    setBusy(true);
    setNotice("");
    setFailed(false);
    try {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from("profile_photos").delete().eq("id", photo.id);
      if (rowError) throw rowError;
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setNotice("Your photo has been removed.");
    } catch {
      setFailed(true);
      setNotice("We could not remove that photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-photo-uploader" aria-labelledby="profile-photo-title">
      <div className="profile-photo-uploader-heading">
        <div className="profile-photo-icon" aria-hidden="true">♡</div>
        <div>
          <h3 id="profile-photo-title">Your profile photos</h3>
          <p>Add up to five clear photos of yourself. JPG, PNG or WebP, up to 5 MB each.</p>
        </div>
      </div>
      {!profileReady && <p className="profile-photo-help">Save your basic profile details above before adding a photo.</p>}
      <label className={`profile-photo-upload-button${!profileReady || busy || photos.length >= MAX_PHOTOS ? " disabled" : ""}`}>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={!profileReady || busy || photos.length >= MAX_PHOTOS} />
        <span aria-hidden="true">＋</span>{busy ? "Working…" : "Choose a photo"}
      </label>
      <p className="profile-photo-help">Your original photo stays in private storage. Only you and authorised safety reviewers can access it before approval.</p>
      {loading && <p className="profile-photo-help">Loading your photos…</p>}
      {photos.length > 0 && (
        <ul className="profile-photo-list">
          {photos.map((photo) => (
            <li key={photo.id}>
              {photo.previewUrl ? (
                <img className="profile-photo-thumbnail" src={photo.previewUrl} alt="Your uploaded profile photo" />
              ) : (
                <div className="profile-photo-file-icon" aria-hidden="true">▧</div>
              )}
              <div className="profile-photo-file-details">
                <strong>{photo.storage_path.split("/").pop()}</strong>
                <span>{formatSize(photo.file_size_bytes)} · {photo.moderation_status === "pending" ? "Waiting for review" : photo.moderation_status}</span>
              </div>
              <button type="button" onClick={() => removePhoto(photo)} disabled={busy} aria-label="Remove photo">Remove</button>
            </li>
          ))}
        </ul>
      )}
      {notice && <p className={failed ? "profile-form-notice error" : "profile-form-notice success"} role="status">{notice}</p>}
      <p className="profile-photo-count">{photos.length} of {MAX_PHOTOS} photos added</p>
    </section>
  );
}
