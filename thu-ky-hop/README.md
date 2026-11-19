# Thư ký họp: ghi âm → văn bản → biên bản

Bộ công cụ miễn phí chạy trên máy tính, dùng cùng Ben trên trang bản đồ:

1. **Ghi âm** cả cuộc họp (micro máy tính, hoặc file ghi âm điện thoại .m4a/.mp3/.wav).
2. **Chuyển giọng nói thành văn bản** bằng mô hình mã nguồn mở chạy trên máy (dữ liệu không rời khỏi máy) hoặc API miễn phí.
3. **Tách người nói** (tùy chọn): ai nói câu nào.
4. Xuất `*.ben.json`. Trên trang bản đồ: **Ben → Thư ký họp → Nhập lời thoại từ file**, rồi bấm **Ben tổng hợp & lập biên bản**. Ben soạn biên bản (logo, số biên bản, thời gian, địa điểm, lý do, chương trình, nội dung từng mục, ý kiến từng người, kết luận, phân công, chữ ký). Host chốt xong thì tải bản Word (.docx).

## Cài đặt

```bash
python -m pip install -r requirements.txt
```

Máy cần Python 3.9 trở lên và ffmpeg. Lần chạy đầu sẽ tải mô hình (large-v3 khoảng 3 GB).

## Dùng

```bash
python thu_ky_hop.py ghi hop-giao-ban.wav
```

```bash
python thu_ky_hop.py chuyen hop-giao-ban.wav --info mau-thong-tin.json
```

```bash
python thu_ky_hop.py chuyen hop.m4a --may phowhisper --nguoi-noi --ten "Nguyễn Văn Hùng,Trần Thị Mai"
```

```bash
python thu_ky_hop.py chuyen hop.m4a --may groq
```

## Lựa chọn miễn phí

| Thành phần | Công cụ | Giấy phép / chi phí | Ghi chú |
|---|---|---|---|
| Giọng nói → văn bản, chạy trên máy | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (Whisper large-v3) | MIT, miễn phí | Mặc định. Tiếng Việt tốt; CPU chậm (khoảng 0,5–1× thời lượng với máy mạnh), có GPU NVIDIA thì nhanh hơn nhiều |
| Giọng nói → văn bản tiếng Việt | [PhoWhisper](https://github.com/VinAIResearch/PhoWhisper) của VinAI | Mã nguồn mở | Tinh chỉnh cho tiếng Việt và giọng vùng miền |
| Bản C++ nhẹ | [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | MIT | Chạy tốt trên Mac Apple Silicon, máy không GPU |
| Tách người nói | [pyannote.audio](https://github.com/pyannote/pyannote-audio) | MIT; mô hình cần token Hugging Face miễn phí | Dùng `--nguoi-noi` |
| Gộp nhận dạng + tách người nói | [WhisperX](https://github.com/m-bain/whisperX) | BSD-2 | Mốc giờ từng từ, nếu cần chính xác hơn |
| API miễn phí (gói free) | [Groq](https://console.groq.com) – whisper-large-v3 | Gói miễn phí có giới hạn lượt/ngày | Rất nhanh; file tối đa 25 MB, dữ liệu gửi lên máy chủ nước ngoài |
| Ứng dụng họp trọn gói tự cài | [Meetily](https://github.com/Zackriya-Solutions/meeting-minutes) | MIT | Ghi âm, chuyển văn bản, tóm tắt cục bộ |

Giới hạn và điều khoản của các gói miễn phí thay đổi theo thời gian: kiểm tra trên trang của nhà cung cấp trước khi dùng.

## Bảo mật

- Cuộc họp nội bộ (số bán, giá, nhân sự): nên dùng **faster-whisper/PhoWhisper chạy trên máy**, âm thanh không rời khỏi máy.
- Chỉ dùng API bên ngoài (Groq) cho nội dung không nhạy cảm.
- Nên thông báo cho người dự họp trước khi ghi âm.

## Định dạng nhập vào Ben

Ben nhận các định dạng sau:

- `*.ben.json` của công cụ này;
- `.srt`/`.vtt` từ Whisper, Zoom, Microsoft Teams (có tên người nói), Google Meet;
- `.txt` dạng `[mm:ss] Tên: nội dung`.
