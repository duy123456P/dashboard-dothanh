#!/usr/bin/env python3
"""Thư ký họp – ghi âm, chuyển giọng nói thành văn bản (miễn phí), xuất file để Ben lập biên bản.

  python thu_ky_hop.py ghi hop.wav                       # ghi âm từ micro, Enter để dừng
  python thu_ky_hop.py chuyen hop.wav --info hop.json    # chuyển thành văn bản (mặc định faster-whisper chạy trên máy)
  python thu_ky_hop.py chuyen hop.m4a --may phowhisper   # mô hình tiếng Việt của VinAI
  python thu_ky_hop.py chuyen hop.m4a --may groq         # API miễn phí (cần GROQ_API_KEY)
  python thu_ky_hop.py chuyen hop.wav --nguoi-noi        # tách người nói bằng pyannote (cần HF_TOKEN)

Kết quả: <tên>.ben.json (nhập vào Ben → Thư ký họp → “Nhập lời thoại từ file”), <tên>.srt và <tên>.txt.
"""
import argparse, json, os, sys, datetime as dt, pathlib


def ts(sec, srt=False):
    sec = max(0.0, float(sec)); h, r = divmod(int(sec), 3600); m, s = divmod(r, 60); ms = int(round((sec - int(sec)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}" if srt else (f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}")


def ghi(out, rate=16000):
    import sounddevice as sd, soundfile as sf, queue, threading
    q = queue.Queue(); stop = threading.Event()
    def cb(data, frames, t, status): q.put(data.copy())
    print(f"● Đang ghi vào {out}. Nhấn Enter để dừng…")
    with sf.SoundFile(out, "w", samplerate=rate, channels=1, subtype="PCM_16") as f, sd.InputStream(samplerate=rate, channels=1, callback=cb):
        threading.Thread(target=lambda: (input(), stop.set()), daemon=True).start()
        start = dt.datetime.now()
        while not stop.is_set() or not q.empty():
            try: f.write(q.get(timeout=0.2))
            except queue.Empty: pass
    print(f"Đã lưu {out} ({(dt.datetime.now() - start).seconds // 60} phút).")


def stt_faster_whisper(path, model, device):
    from faster_whisper import WhisperModel
    m = WhisperModel(model, device=device, compute_type="int8" if device == "cpu" else "float16")
    segs, info = m.transcribe(path, language="vi", vad_filter=True, beam_size=5)
    return [{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segs]


def stt_phowhisper(path, model, device):
    from transformers import pipeline
    asr = pipeline("automatic-speech-recognition", model=model, device=0 if device == "cuda" else -1, chunk_length_s=30)
    out = asr(path, return_timestamps=True, generate_kwargs={"language": "vi"})
    return [{"start": (c["timestamp"][0] or 0), "end": (c["timestamp"][1] or c["timestamp"][0] or 0), "text": c["text"].strip()} for c in out.get("chunks", [])] or [{"start": 0, "end": 0, "text": out["text"]}]


def stt_groq(path, model):
    import requests
    key = os.environ.get("GROQ_API_KEY") or sys.exit("Thiếu GROQ_API_KEY (tạo miễn phí tại console.groq.com)")
    if os.path.getsize(path) > 25 * 1024 * 1024:
        sys.exit("File lớn hơn 25 MB: chuyển sang mp3 16 kHz mono hoặc cắt nhỏ trước (ffmpeg -i in.m4a -ac 1 -ar 16000 -b:a 32k out.mp3)")
    with open(path, "rb") as f:
        r = requests.post("https://api.groq.com/openai/v1/audio/transcriptions", headers={"Authorization": f"Bearer {key}"},
                          files={"file": (os.path.basename(path), f)}, data={"model": model, "language": "vi", "response_format": "verbose_json"}, timeout=600)
    r.raise_for_status()
    return [{"start": s["start"], "end": s["end"], "text": s["text"].strip()} for s in r.json().get("segments", [])]


def gan_nguoi_noi(path, segs, names):
    from pyannote.audio import Pipeline
    tok = os.environ.get("HF_TOKEN") or sys.exit("Thiếu HF_TOKEN (tạo miễn phí tại huggingface.co, chấp nhận điều khoản pyannote/speaker-diarization-3.1)")
    dia = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=tok)(path)
    turns = [(t.start, t.end, spk) for t, _, spk in dia.itertracks(yield_label=True)]
    label = {}
    for s in segs:
        best, ov = "", 0.0
        for a, b, spk in turns:
            o = min(b, s["end"]) - max(a, s["start"])
            if o > ov: best, ov = spk, o
        if best and best not in label: label[best] = names[len(label)] if len(label) < len(names) else f"Người nói {len(label) + 1}"
        s["speaker"] = label.get(best, "")
    return segs


def xuat(segs, meta, base):
    for s in segs: s.setdefault("speaker", "")
    pathlib.Path(base + ".ben.json").write_text(json.dumps({"meta": meta, "segments": segs}, ensure_ascii=False, indent=1), encoding="utf-8")
    pathlib.Path(base + ".srt").write_text("\n".join(f"{i}\n{ts(s['start'], True)} --> {ts(s['end'], True)}\n{(s['speaker'] + ': ') if s['speaker'] else ''}{s['text']}\n" for i, s in enumerate(segs, 1)), encoding="utf-8")
    pathlib.Path(base + ".txt").write_text("\n".join(f"[{ts(s['start'])}] {(s['speaker'] + ': ') if s['speaker'] else ''}{s['text']}" for s in segs), encoding="utf-8")
    print(f"Đã xuất {base}.ben.json, {base}.srt, {base}.txt ({len(segs)} câu). Mở trang bản đồ → Ben → Thư ký họp → “Nhập lời thoại từ file” → chọn {os.path.basename(base)}.ben.json.")


def main():
    ap = argparse.ArgumentParser(description="Thư ký họp: ghi âm và chuyển giọng nói thành văn bản cho Ben")
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("ghi", help="Ghi âm từ micro"); g.add_argument("out", nargs="?", default=f"hop-{dt.datetime.now():%Y%m%d-%H%M}.wav")
    c = sub.add_parser("chuyen", help="Chuyển file ghi âm thành văn bản")
    c.add_argument("audio"); c.add_argument("--may", choices=["faster-whisper", "phowhisper", "groq"], default="faster-whisper", help="Máy nhận dạng giọng nói")
    c.add_argument("--model", help="Mặc định: large-v3 (faster-whisper), vinai/PhoWhisper-medium, whisper-large-v3 (groq)")
    c.add_argument("--device", default="cpu", choices=["cpu", "cuda"]); c.add_argument("--nguoi-noi", action="store_true", help="Tách người nói (pyannote)")
    c.add_argument("--ten", default="", help="Tên người nói theo thứ tự xuất hiện, phẩy ngăn cách")
    c.add_argument("--info", help="File JSON thông tin cuộc họp: title, host, place, form, reason, goal, people[], agenda[]")
    a = ap.parse_args()
    if a.cmd == "ghi": return ghi(a.out)
    model = a.model or {"faster-whisper": "large-v3", "phowhisper": "vinai/PhoWhisper-medium", "groq": "whisper-large-v3"}[a.may]
    print(f"Đang nhận dạng bằng {a.may} ({model})…")
    segs = stt_groq(a.audio, model) if a.may == "groq" else stt_phowhisper(a.audio, model, a.device) if a.may == "phowhisper" else stt_faster_whisper(a.audio, model, a.device)
    if a.nguoi_noi: segs = gan_nguoi_noi(a.audio, segs, [x.strip() for x in a.ten.split(",") if x.strip()])
    meta = json.loads(pathlib.Path(a.info).read_text(encoding="utf-8")) if a.info else {}
    st = dt.datetime.fromtimestamp(os.path.getmtime(a.audio)); dur = segs[-1]["end"] if segs else 0
    meta.setdefault("endedAt", st.astimezone().isoformat()); meta.setdefault("startedAt", (st - dt.timedelta(seconds=dur)).astimezone().isoformat())
    xuat(segs, meta, str(pathlib.Path(a.audio).with_suffix("")))


if __name__ == "__main__":
    main()
