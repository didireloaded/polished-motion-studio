import { useEffect, useRef, useState } from "react";
import { Mic, Play, Square, Trash2, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BAR_COUNT = 32;

function Waveform({ levels, active = false }: { levels: number[]; active?: boolean }) {
  return (
    <div className="flex h-10 items-center justify-center gap-[3px]" aria-hidden="true">
      {levels.map((level, index) => (
        <span
          key={index}
          className={`w-[3px] rounded-full transition-[height,opacity] duration-100 ${active ? "bg-primary" : "bg-primary/55"}`}
          style={{
            height: `${Math.max(4, level * 32)}px`,
            opacity: active ? 0.65 + level * 0.35 : 0.75,
          }}
        />
      ))}
    </div>
  );
}

const quietWave = Array.from(
  { length: BAR_COUNT },
  (_, i) => 0.16 + (Math.sin(i * 1.9) + 1) * 0.19,
);

export function VoiceIntroPlayer({ path }: { path: string }) {
  const [url, setUrl] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    let active = true;
    void supabase.storage
      .from("voice-intros")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (active && !error && data?.signedUrl) setUrl(data.signedUrl);
        else if (active) setUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return (
    <div className="rounded-xl bg-secondary/80 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? "Pause voice intro" : "Play voice intro"}
          disabled={!url}
          onClick={() => {
            const player = audio.current;
            if (!player) return;
            if (player.paused) void player.play();
            else player.pause();
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          {playing ? (
            <Square className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Voice intro</p>
          {url ? (
            <Waveform levels={quietWave} active={playing} />
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {unavailable ? "Voice intro unavailable" : "Loading audio…"}
            </p>
          )}
        </div>
      </div>
      {url && (
        <audio
          ref={audio}
          src={url}
          preload="none"
          className="sr-only"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
    </div>
  );
}

export function VoiceIntroRecorder({
  userId,
  initialPath,
}: {
  userId: string;
  initialPath: string | null;
}) {
  const queryClient = useQueryClient();
  const recorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const blob = useRef<Blob | null>(null);
  const localUrl = useRef<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [levels, setLevels] = useState(quietWave);
  const [clipUrl, setClipUrl] = useState("");
  const [savedPath, setSavedPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => setSavedPath(initialPath), [initialPath]);
  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      recorder.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void contextRef.current?.close();
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    },
    [],
  );

  const stopStream = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void contextRef.current?.close();
    contextRef.current = null;
  };

  const start = async () => {
    setNotice("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = [
        "audio/mp4",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const instance = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      context.createMediaStreamSource(stream).connect(analyser);
      contextRef.current = context;
      const samples = new Uint8Array(analyser.frequencyBinCount);
      let lastPaint = 0;
      const draw = (time: number) => {
        analyser.getByteFrequencyData(samples);
        if (time - lastPaint > 85) {
          lastPaint = time;
          const step = Math.max(1, Math.floor(samples.length / BAR_COUNT));
          setLevels(
            Array.from({ length: BAR_COUNT }, (_, i) => {
              const value = samples[Math.min(samples.length - 1, i * step)] ?? 0;
              return Math.max(0.14, value / 255);
            }),
          );
        }
        frameRef.current = requestAnimationFrame(draw);
      };
      frameRef.current = requestAnimationFrame(draw);
      chunks.current = [];
      instance.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      instance.onstop = () => {
        const result = new Blob(chunks.current, { type: instance.mimeType || "audio/webm" });
        stopStream();
        setRecording(false);
        if (!result.size) {
          setNotice("We couldn't capture audio. Please try again.");
          return;
        }
        if (result.size > 4 * 1024 * 1024) {
          setNotice("That recording is too large. Try a shorter intro.");
          return;
        }
        blob.current = result;
        if (localUrl.current) URL.revokeObjectURL(localUrl.current);
        localUrl.current = URL.createObjectURL(result);
        setClipUrl(localUrl.current);
      };
      recorder.current = instance;
      instance.start();
      setRecording(true);
      window.setTimeout(() => {
        if (instance.state === "recording") instance.stop();
      }, 30_000);
    } catch {
      stopStream();
      setNotice("Microphone access is unavailable. Check your browser permission and try again.");
    }
  };

  const save = async () => {
    if (!blob.current) return;
    setBusy(true);
    setNotice("");
    const extension = blob.current.type.includes("mp4")
      ? "mp4"
      : blob.current.type.includes("ogg")
        ? "ogg"
        : "webm";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("voice-intros")
      .upload(path, blob.current, { contentType: blob.current.type, upsert: false });
    if (uploadError) {
      setBusy(false);
      setNotice("Your intro couldn't be uploaded. Please try again.");
      return;
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ voice_intro_path: path })
      .eq("id", userId);
    if (profileError) {
      await supabase.storage.from("voice-intros").remove([path]);
      setBusy(false);
      setNotice("Your profile couldn't be updated. The uploaded recording was removed.");
      return;
    }
    if (savedPath && savedPath !== path)
      await supabase.storage.from("voice-intros").remove([savedPath]);
    setSavedPath(path);
    setBusy(false);
    setNotice("Voice intro saved to your profile.");
    void queryClient.invalidateQueries({ queryKey: ["recommendations", userId] });
    void queryClient.invalidateQueries({ queryKey: ["nearby", userId] });
  };

  const remove = async () => {
    setBusy(true);
    setNotice("");
    if (savedPath) {
      const { error } = await supabase
        .from("profiles")
        .update({ voice_intro_path: null })
        .eq("id", userId);
      if (error) {
        setBusy(false);
        setNotice("We couldn't remove the saved intro.");
        return;
      }
      await supabase.storage.from("voice-intros").remove([savedPath]);
    }
    blob.current = null;
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    localUrl.current = null;
    setClipUrl("");
    setSavedPath(null);
    setBusy(false);
    setNotice("Voice intro removed.");
    void queryClient.invalidateQueries({ queryKey: ["recommendations", userId] });
    void queryClient.invalidateQueries({ queryKey: ["nearby", userId] });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-secondary p-2.5 text-primary">
          <Mic className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold">Voice intro</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A quick hello, in your own voice. Up to 30 seconds.
          </p>
        </div>
      </div>
      {(recording || clipUrl) && (
        <div className="my-3 rounded-xl bg-secondary/60 px-3">
          <Waveform levels={levels} active={recording} />
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {recording ? (
          <button
            type="button"
            onClick={() => recorder.current?.stop()}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            <Square className="h-4 w-4" />
            Stop recording
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void start()}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            <Mic className="h-4 w-4" />
            {clipUrl ? "Record again" : savedPath ? "Replace intro" : "Record intro"}
          </button>
        )}
        {clipUrl && !recording && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {busy ? "Saving…" : "Save"}
          </button>
        )}
        {(clipUrl || savedPath) && !recording && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            aria-label="Remove voice intro"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {savedPath && !clipUrl && (
        <div className="mt-3">
          <VoiceIntroPlayer path={savedPath} />
        </div>
      )}
      {clipUrl && (
        <audio
          controls
          src={clipUrl}
          className="mt-3 w-full"
          aria-label="Listen to your voice intro"
        />
      )}
      {recording && (
        <p role="status" className="mt-2 text-xs text-primary">
          Recording… It will stop automatically after 30 seconds.
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {notice}
        </p>
      )}
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        Only signed-in members can listen. You can remove it at any time.
      </p>
    </section>
  );
}
