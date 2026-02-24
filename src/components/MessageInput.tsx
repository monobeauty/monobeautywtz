import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, FileText, Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  instanceName: string;
  remoteJid: string;
}

interface AttachedFile {
  file: File;
  base64: string;
  preview: string | null;
  type: "image" | "document" | "audio";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getMediaType(file: File): "image" | "document" {
  if (file.type.startsWith("image/")) return "image";
  return "document";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MessageInput({ instanceName, remoteJid }: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<AttachedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording state
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          const base64 = await blobToBase64(blob);
          const file = new File([blob], "audio.webm", { type: "audio/webm" });
          const preview = URL.createObjectURL(blob);
          setAttachment({ file, base64, preview, type: "audio" });
        } catch {
          toast.error("Erro ao processar áudio");
        }
        stopRecordingCleanup();
      };

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    stopRecordingCleanup();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 16MB");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const type = getMediaType(file);
      const preview = type === "image" ? URL.createObjectURL(file) : null;
      setAttachment({ file, base64, preview, type });
    } catch {
      toast.error("Erro ao processar arquivo");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  };

  const handleSend = async () => {
    if ((!text.trim() && !attachment) || sending) return;

    setSending(true);
    try {
      const number = remoteJid.replace(/@.*/, "");

      const body: Record<string, any> = {
        instance_name: instanceName,
        number,
      };

      if (text.trim()) body.text = text.trim();

      if (attachment) {
        body.media_base64 = attachment.base64;
        body.media_mimetype = attachment.file.type;
        body.media_filename = attachment.file.name;
        body.media_type = attachment.type;
      }

      const { error } = await supabase.functions.invoke("send-message", { body });
      if (error) throw error;

      setText("");
      removeAttachment();
    } catch (err: any) {
      console.error("Send error:", err);
      toast.error("Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card px-6 py-4">
      {/* Attachment preview */}
      {attachment && (
          <div className="mb-2">
          <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
            {attachment.type === "image" && attachment.preview ? (
              <img
                src={attachment.preview}
                alt="Preview"
                className="w-16 h-16 rounded-md object-cover flex-shrink-0"
              />
            ) : attachment.type === "audio" && attachment.preview ? (
              <audio src={attachment.preview} controls className="h-10 flex-1" preload="metadata" />
            ) : (
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            )}
            {attachment.type !== "audio" && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file.size)}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={removeAttachment}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div className="mb-2">
          <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse flex-shrink-0" />
            <span className="text-sm font-medium text-destructive">Gravando...</span>
            <span className="text-sm text-muted-foreground font-mono">
              {formatDuration(recordingDuration)}
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground"
              onClick={cancelRecording}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8"
              onClick={stopRecording}
            >
              <Square className="w-3 h-3 mr-1" />
              Parar
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* File picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 flex-shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || recording}
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            attachment?.type === "audio"
              ? "Enviar áudio..."
              : attachment
              ? "Adicione uma legenda..."
              : "Digite uma mensagem..."
          }
          className="min-h-[44px] max-h-32 resize-none bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
          rows={1}
          disabled={recording}
        />

        {/* Mic / Send button */}
        {!text.trim() && !attachment && !recording ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 flex-shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            onClick={startRecording}
            disabled={sending}
          >
            <Mic className="w-5 h-5" />
          </Button>
        ) : recording ? null : (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!text.trim() && !attachment) || sending}
            className={cn(
              "h-11 w-11 flex-shrink-0 rounded-full",
              attachment && "bg-primary"
            )}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
