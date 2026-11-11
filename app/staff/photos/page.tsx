import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import PhotoModerationQueue, { type ModerationPhoto } from "@/app/components/staff/PhotoModerationQueue";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StaffPhotosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email_confirmed_at) redirect("/login?next=%2Fstaff%2Fphotos");

  const { data: isStaff, error: roleError } = await supabase.rpc("joyheart_is_active_staff");
  if (roleError || !isStaff) redirect("/account");

  const { data, error } = await supabase
    .from("profile_photos")
    .select("id,user_id,storage_path,mime_type,file_size_bytes,created_at")
    .eq("moderation_status", "pending")
    .neq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error("The private photo review queue is not available yet.");

  const photos: ModerationPhoto[] = await Promise.all((data ?? []).map(async (photo) => {
    const { data: signed, error: signedError } = await supabase.storage
      .from("joyheart-profile-photos")
      .createSignedUrl(photo.storage_path, 30);
    return {
      id: photo.id,
      memberReference: photo.user_id.slice(0, 8),
      mimeType: photo.mime_type,
      fileSizeBytes: photo.file_size_bytes,
      submittedAt: photo.created_at,
      imageUrl: signedError ? null : signed?.signedUrl ?? null,
    };
  }));

  return <PhotoModerationQueue initialPhotos={photos} />;
}
