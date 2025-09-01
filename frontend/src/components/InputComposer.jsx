import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { toast } from "../hooks/use-toast";
import { Mic, MicOff, Paperclip, Send, Trash2, X, Languages } from "lucide-react";

const ACCEPT_IMG = new Set(["jpg","jpeg","png","gif","webp"]); 

export default function InputComposer({
  t,
  lang = "ru",
  softMaxLength = null,
  maxFileSize = 10 * 1024 * 1024,
  allowedFileTypes = ["txt","pdf","jpg","jpeg","png","gif","webp"],
  onSubmit, // (payload: {text, files}) => Promise<void> | void
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // {name, size, type, url, file}
  const [listening, setListening] = useState(false);
  const taRef = useRef(null);
  const inputRef = useRef(null);
  const recRef = useRef(null);

  const speechLocale = useMemo(() => (lang === "ru" ? "ru-RU" : "en-US"), [lang]);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    const autoresize = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    autoresize();
    const onInput = () => autoresize();
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, []);

  const handleFiles = (fileList) => {
    const next = [];
    Array.from(fileList || []).forEach(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (allowedFileTypes && !allowedFileTypes.map(s => s.toLowerCase()).includes(ext)) {
        toast({ title: 'File', description: `${f.name}: недопустимый тип` });
        return;
      }
      if (f.size > maxFileSize) {
        toast({ title: 'File', description: `${f.name}: превышен размер` });
        return;
      }
      const url = URL.createObjectURL(f);
      next.push({ name: f.name, size: f.size, type: f.type || '', url, file: f });
    });
    if (next.length) setFiles(prev => [...prev, ...next]);
  };

  const onPickFiles = (e) => handleFiles(e.target.files);

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => e.preventDefault();

  const startSpeech = () => {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        toast({ title: 'Mic', description: 'Голосовой ввод недоступен' });
        return;
      }
      const rec = new SR();
      rec.lang = speechLocale;
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (evt) => {
        let buf = '';
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          buf += evt.results[i][0].transcript;
        }
        if (buf) setText(prev => (prev ? prev + ' ' : '') + buf.trim());
      };
      rec.onend = () => setListening(false);
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (e) {
      setListening(false);
    }
  };

  const stopSpeech = () => { try { recRef.current && recRef.current.stop(); } catch(_){} setListening(false); };

  const handleSend = async () => {
    const payload = { text, files };
    if (!text && files.length === 0) { toast({ title: 'Empty', description: 'Нет данных для отправки' }); return; }
    try {
      await onSubmit?.(payload);
      // cleanup on success
      setText("");
      setFiles(prev => { prev.forEach(f => URL.revokeObjectURL(f.url)); return []; });
    } catch (e) {
      // ignore
    }
  };

  const removeFile = (idx) => {
    setFiles(prev => {
      const copy = [...prev];
      try { URL.revokeObjectURL(copy[idx].url); } catch(_){}
      copy.splice(idx, 1);
      return copy;
    });
  };

  const counter = text.length;

  return (
    <Card className="bg-card/70">
      <CardContent className="p-3">
        <div className="flex items-start gap-3" onDrop={onDrop} onDragOver={onDragOver}>
          <div className="flex-1">
            <Textarea
              ref={taRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={"Введите сообщение..."}
              className="min-h-[58px] resize-none bg-background/60 border-input font-mono text-sm leading-relaxed"
              style={{ width: 'clamp(16.5cm, 100%, 26cm)', overflowX: 'auto' }}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-muted-foreground">{softMaxLength ? `${counter} / ${softMaxLength}` : `${counter} символов`}</div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                        <Paperclip className="w-4 h-4 mr-2" /> Файлы
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Добавить файлы (drag&drop поддерживается)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input ref={inputRef} type="file" multiple className="hidden" onChange={onPickFiles} />
                {!listening ? (
                  <Button variant="outline" size="sm" onClick={startSpeech}>
                    <Mic className="w-4 h-4 mr-2" /> {lang === 'ru' ? 'Голос (RU)' : 'Voice (EN)'}
                  </Button>
                ) : (
                  <Button variant="destructive" size="sm" onClick={stopSpeech}>
                    <MicOff className="w-4 h-4 mr-2" /> Stop
                  </Button>
                )}
                <Button size="sm" onClick={handleSend}>
                  <Send className="w-4 h-4 mr-2" /> Отправить
                </Button>
              </div>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-3 border rounded">
            {files.map((f, idx) => (
              <div key={idx} className="flex items-start justify-between p-2 border-b last:border-b-0">
                <div className="flex items-start gap-3">
                  <div className="w-[80px] h-[56px] bg-muted flex items-center justify-center overflow-hidden rounded border">
                    {ACCEPT_IMG.has((f.name.split('.').pop()||'').toLowerCase()) ? (
                      <img src={f.url} alt={f.name} className="max-w-[80px] max-h-[56px] object-cover" />
                    ) : (
                      <span className="text-xs">📄</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{(f.size/1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeFile(idx)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}