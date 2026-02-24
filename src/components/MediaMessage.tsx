import { useState, useEffect } from "react";
import { Image, FileText, Film, Mic, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MediaType } from "@/types/message";
import { Lightbox } from "@/components/Lightbox";

interface MediaMessageProps {
  mediaType: MediaType;
  mediaUrl: string | null | undefined;
  mediaMimetype: string | null | undefined;
  mediaFilename: string | null | undefined;
  messageId: string;
  instanceName: string;
}

export function MediaMessage({
  mediaType,
  mediaUrl,
  mediaMimetype,
  mediaFilename,
  messageId,
  instanceName,
}: MediaMessageProps) {
  const [base64, setBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Try to load base64 from Evolution API if no direct URL
  useEffect(() => {
    if (mediaUrl && mediaUrl.startsWith("http")) return; // already have URL
    if (!mediaType || base64 || loading || error) return;

    let cancelled = false;
    setLoading(true);

    supabase.functions
      .invoke("fetch-media", {
        body: { instance_name: instanceName, message_id: messageId },
      })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data?.base64) {
          setError(true);
        } else {
          const mime = data.mimetype || mediaMimetype || "application/octet-stream";
          setBase64(`data:${mime};base64,${data.base64}`);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [mediaType, mediaUrl, messageId, instanceName, base64, loading, error, mediaMimetype]);

  const src = mediaUrl && mediaUrl.startsWith("http") ? mediaUrl : base64;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Carregando mídia...</span>
      </div>
    );
  }

  if (mediaType === "image" || mediaType === "sticker") {
    if (!src) {
      return (
        <div className="flex items-center gap-2 py-2 text-muted-foreground">
          <Image className="w-4 h-4" />
          <span className="text-xs italic">{mediaType === "sticker" ? "[sticker]" : "[imagem]"}</span>
        </div>
      );
    }
    return (
      <div className="my-1">
        <img
          src={src}
          alt="Mídia"
          className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setLightboxOpen(true)}
          loading="lazy"
        />
        {lightboxOpen && (
          <Lightbox src={src} alt="Mídia" onClose={() => setLightboxOpen(false)} />
        )}
      </div>
    );
  }

  if (mediaType === "video") {
    if (!src) {
      return (
        <div className="flex items-center gap-2 py-2 text-muted-foreground">
          <Film className="w-4 h-4" />
          <span className="text-xs italic">[vídeo]</span>
        </div>
      );
    }
    return (
      <div className="my-1">
        <video
          src={src}
          controls
          className="max-w-full max-h-64 rounded-lg"
          preload="metadata"
        />
      </div>
    );
  }

  if (mediaType === "audio") {
    if (!src) {
      return (
        <div className="flex items-center gap-2 py-2 text-muted-foreground">
          <Mic className="w-4 h-4" />
          <span className="text-xs italic">[áudio]</span>
        </div>
      );
    }
    return (
      <div className="my-1 w-full min-w-[200px]">
        <audio src={src} controls className="w-full h-10" preload="metadata" />
      </div>
    );
  }

  if (mediaType === "document") {
    return (
      <div
        className="flex items-center gap-3 py-2 px-3 my-1 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
        onClick={() => src && window.open(src, "_blank")}
      >
        <FileText className="w-8 h-8 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{mediaFilename || "Documento"}</p>
          <p className="text-[10px] text-muted-foreground">{mediaMimetype || "arquivo"}</p>
        </div>
        {src && <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </div>
    );
  }

  return null;
}
