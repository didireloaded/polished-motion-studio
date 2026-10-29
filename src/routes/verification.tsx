import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, LockKeyhole } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verification")({
  head: () => ({ meta: [{ title: "Verification — Mutal" }] }),
  component: Verification,
});

function Verification() {
  const { user } = useSession();
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const request = useQuery({
    queryKey: ["selfie-verification", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("selfie_verifications")
        .select("status,submitted_at,image_path")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const choose = (next?: File) => {
    setError("");
    if (!next) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(next.type) ||
      next.size > 5 * 1024 * 1024
    ) {
      setError("Use a JPG, PNG or WebP image under 5 MB.");
      return;
    }
    setFile(next);
  };
  const submit = async () => {
    if (!user || !file || busy || request.data?.status === "approved") return;
    setBusy(true);
    setError("");
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const imagePath = `${user.id}/selfie.${extension}`;
    const upload = await supabase.storage
      .from("verification-selfies")
      .upload(imagePath, file, { upsert: true, contentType: file.type });
    if (upload.error) {
      setError("We couldn't upload your selfie. Please try again.");
      setBusy(false);
      return;
    }
    const result = await supabase.from("selfie_verifications").upsert({
      user_id: user.id,
      image_path: imagePath,
      status: "pending",
      reviewed_at: null,
      reviewed_by: null,
      submitted_at: new Date().toISOString(),
    });
    setBusy(false);
    if (result.error)
      setError(
        "Your selfie uploaded, but the review request could not be saved. Please try again.",
      );
    else {
      if (request.data?.image_path && request.data.image_path !== imagePath) {
        void supabase.storage.from("verification-selfies").remove([request.data.image_path]);
      }
      setFile(null);
      setPreview(null);
      void client.invalidateQueries({ queryKey: ["selfie-verification", user.id] });
    }
  };
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white px-5 pb-10">
      <header className="flex h-14 items-center">
        <Link to="/you" aria-label="Back to profile">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </header>
      <h1 className="text-[22px] font-semibold">Help keep Mutal safe</h1>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">
        A recent selfie helps us review who is behind a profile.
      </p>
      <section className="mt-6 rounded-[15px] border border-border p-4">
        <div className="flex gap-3">
          <Camera className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Selfie verification</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Use a clear, current photo of your face. Your selfie is private and is not added to
              your profile.
            </p>
          </div>
        </div>
        {user ? (
          <>
            {request.data?.status === "approved" ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Your selfie was reviewed and approved.
              </p>
            ) : (
              <>
                {request.data?.status === "pending" && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Selfie received · waiting for review. You can replace it below.
                  </p>
                )}
                {request.data?.status === "rejected" && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    A new selfie is needed. Please take another clear photo.
                  </p>
                )}
                <label className="mt-4 flex h-11 cursor-pointer items-center justify-center rounded-full border border-primary text-sm font-semibold text-primary">
                  {file ? "Retake selfie" : "Take selfie"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    onChange={(event) => choose(event.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
                {preview && (
                  <img
                    src={preview}
                    alt="Selfie preview"
                    className="mx-auto mt-4 h-48 w-48 rounded-xl object-cover"
                  />
                )}
                {file && (
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={busy}
                    className="mt-4 h-11 w-full rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Uploading…" : "Submit for review"}
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          <Link
            to="/auth"
            className="mt-4 flex h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
          >
            Sign in to verify
          </Link>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        )}
      </section>
      <p className="mt-8 flex gap-2 text-xs leading-5 text-muted-foreground">
        <LockKeyhole className="h-4 w-4 shrink-0" />
        Your selfie is stored privately for review. Approval is not automatic.
      </p>
    </main>
  );
}
