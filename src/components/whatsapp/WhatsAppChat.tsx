import { Send, MessageCircle, Tag, ChevronDown, Trash2, Image, FileText, Video, Mic, ArrowRightLeft, Paperclip, Camera, File as FileIcon, Contact, X } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { TemplatePicker } from "./TemplatePicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRef, useEffect, useState } from "react";
import { format } from "date-fns";
import { MediaLightbox } from "./MediaLightbox";

interface Message {
  id: string;
  content?: string;
  direction: string;
  message_type: string;
  created_at: string;
  sender_name?: string;
  status?: string;
}

interface TagItem {
  id: string;
  tag_name: string;
  tag_color: string;
}

interface Props {
  messages: Message[];
  contactName?: string;
  contactPhone?: string;
  contactStatus?: string;
  contactTags?: TagItem[];
  isGroup?: boolean;
  onSend: (text: string) => void;
  onSendMedia?: (file: File, mediaType: string, caption?: string) => void;
  onStatusChange?: (status: string) => void;
  onOpenTags?: () => void;
  onDeleteChat?: () => void;
  onTransfer?: () => void;
  sending?: boolean;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto", color: "text-green-500" },
  { value: "attending", label: "Atendendo", color: "text-blue-500" },
  { value: "waiting", label: "Aguardando", color: "text-amber-500" },
  { value: "closed", label: "Fechado", color: "text-muted-foreground" },
];

function parseMediaContent(content: string | undefined, messageType: string) {
  if (!content) return { url: null, caption: null, text: "[media]" };
  
  // Try parsing as JSON (new format with url+caption)
  if (messageType !== "text") {
    try {
      const parsed = JSON.parse(content);
      if (parsed.url) return { url: parsed.url, caption: parsed.caption, text: null };
    } catch {
      // Not JSON, might be old format or plain text
    }
  }
  
  return { url: null, caption: null, text: content };
}

const MEDIA_ICONS: Record<string, React.ReactNode> = {
  audio: <Mic className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  document: <FileText className="h-5 w-5" />,
  sticker: <Image className="h-5 w-5" />,
};

function MediaUnavailable({ type }: { type: string }) {
  const labels: Record<string, string> = {
    image: "Imagem indisponível",
    video: "Vídeo indisponível",
    audio: "Áudio indisponível",
  };
  return (
    <div className="flex items-center gap-2 py-2 text-muted-foreground">
      {type === "video" ? <Video className="h-5 w-5" /> : type === "audio" ? <Mic className="h-5 w-5" /> : <Image className="h-5 w-5" />}
      <span className="text-xs">{labels[type] || "Mídia indisponível"}</span>
    </div>
  );
}

function ImageWithFallback({ url, onClick }: { url: string; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MediaUnavailable type="image" />;
  return (
    <img
      src={url}
      alt="Imagem"
      className="rounded max-w-full max-h-64 mb-1 cursor-pointer"
      onClick={onClick}
      onError={() => setFailed(true)}
    />
  );
}

function VideoWithFallback({ url, onClick }: { url: string; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MediaUnavailable type="video" />;
  return (
    <video
      src={url}
      controls
      playsInline
      muted
      preload="metadata"
      className="rounded max-w-full max-h-64 mb-1 cursor-pointer"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      onError={() => setFailed(true)}
    />
  );
}

function AudioWithFallback({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MediaUnavailable type="audio" />;
  return (
    <audio src={url} controls preload="metadata" className="max-w-full mb-1" onError={() => setFailed(true)} />
  );
}

export function WhatsAppChat({
  messages, contactName, contactPhone, contactStatus, contactTags, isGroup,
  onSend, onSendMedia, onStatusChange, onOpenTags, onDeleteChat, onTransfer, sending
}: Props) {
  const [text, setText] = useState("");
  const [lightbox, setLightbox] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileAccept, setFileAccept] = useState<string>("");
  const [fileMediaType, setFileMediaType] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || sending) return;
    onSend(text.trim());
    setText("");
  };

  const openFilePicker = (accept: string, mediaType: string) => {
    setFileAccept(accept);
    setFileMediaType(mediaType);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSendMedia) return;
    onSendMedia(file, fileMediaType, text.trim() || undefined);
    setText("");
    // Reset the input so the same file can be picked again
    e.target.value = "";
  };

  const startRecording = async () => {
    if (!onSendMedia || sending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
        setRecordSeconds(0);
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          const ext = mimeType.includes("mp4") ? "m4a" : "ogg";
          const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: mimeType });
          onSendMedia(file, "audio");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err: any) {
      alert("Não foi possível acessar o microfone: " + (err?.message || err));
    }
  };

  const stopRecording = (cancel = false) => {
    const r = recorderRef.current;
    if (!r) return;
    if (cancel) {
      chunksRef.current = [];
    }
    try { r.stop(); } catch {}
    recorderRef.current = null;
  };

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!contactPhone) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <MessageCircle className="h-12 w-12" />
        <p className="text-sm">Selecione um contato para iniciar</p>
      </div>
    );
  }

  const currentStatusLabel = STATUS_OPTIONS.find((s) => s.value === contactStatus)?.label || "Aberto";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{contactName || contactPhone}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] gap-1">
                  {currentStatusLabel}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => onStatusChange?.(opt.value)}
                    className={opt.color}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">{contactPhone}</p>
            {contactTags && contactTags.length > 0 && (
              <div className="flex gap-1">
                {contactTags.map((t) => (
                  <span
                    key={t.id}
                    className="text-[8px] px-1.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: t.tag_color }}
                  >
                    {t.tag_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Transferir conversa" onClick={onTransfer}>
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onOpenTags}>
          <Tag className="h-4 w-4" />
        </Button>
        {/* Delete chat button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar conversa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja apagar toda a conversa com {contactName || contactPhone}? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDeleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Apagar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          const { url, caption, text: plainText } = parseMediaContent(msg.content, msg.message_type);

          return (
            <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  isOutbound
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-secondary text-secondary-foreground rounded-bl-none"
                }`}
              >
                {/* Show sender name in group chats for inbound messages */}
                {isGroup && !isOutbound && msg.sender_name && (
                  <p className="text-xs font-semibold text-primary mb-1">{msg.sender_name}</p>
                )}
                {/* Render media */}
                {url && msg.message_type === "image" && (
                  <ImageWithFallback url={url} onClick={() => setLightbox({ url, type: "image" })} />
                )}
                {url && msg.message_type === "video" && (
                  <VideoWithFallback url={url} onClick={() => setLightbox({ url, type: "video" })} />
                )}
                {url && msg.message_type === "audio" && (
                  <AudioWithFallback url={url} />
                )}
                {url && msg.message_type !== "image" && msg.message_type !== "video" && msg.message_type !== "audio" && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-1 underline">
                    {MEDIA_ICONS[msg.message_type] || <FileText className="h-5 w-5" />}
                    <span className="text-xs">{msg.message_type === "document" ? "Documento" : "Sticker"}</span>
                  </a>
                )}
                {/* Caption or text */}
                {(caption || (!url && plainText)) && (
                  <p className="whitespace-pre-wrap break-words">{caption || plainText}</p>
                )}
                {!url && !plainText && !caption && (
                  <p className="whitespace-pre-wrap break-words text-muted-foreground italic">[mídia]</p>
                )}
                <p className={`text-[10px] mt-1 ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex gap-2 items-end">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={fileAccept}
          className="hidden"
          onChange={handleFileSelected}
        />
        {/* Attachment dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" disabled={sending}>
              <Paperclip className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="min-w-[180px]">
            <DropdownMenuItem onClick={() => openFilePicker("image/*", "image")} className="gap-2">
              <Camera className="h-4 w-4 text-blue-500" />
              Imagem
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openFilePicker("video/*", "video")} className="gap-2">
              <Video className="h-4 w-4 text-purple-500" />
              Vídeo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openFilePicker("audio/*", "audio")} className="gap-2">
              <Mic className="h-4 w-4 text-green-500" />
              Áudio
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openFilePicker(".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar", "document")} className="gap-2">
              <File className="h-4 w-4 text-orange-500" />
              Documento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <EmojiPicker onEmojiSelect={(emoji) => setText((prev) => prev + emoji)} />
        <TemplatePicker onSelect={(body) => setText(body)} contactName={contactName} />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} disabled={!text.trim() || sending} size="icon" className="shrink-0 self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {lightbox && (
        <MediaLightbox
          open={!!lightbox}
          onOpenChange={(open) => { if (!open) setLightbox(null); }}
          url={lightbox.url}
          type={lightbox.type}
        />
      )}
    </div>
  );
}
