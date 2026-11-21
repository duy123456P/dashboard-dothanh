#!/usr/bin/env python3
"""Khóa bản đồ 3D bằng mật khẩu (không cần tên đăng nhập).

Mã hóa toàn bộ index.html bằng AES-256-GCM, khóa dẫn xuất từ mật khẩu qua PBKDF2-SHA256,
rồi ghi trang đăng nhập ../ban-do/index.html. Trình duyệt giải mã tại chỗ khi nhập đúng mật khẩu.

Mật khẩu mới không được trùng bất kỳ mật khẩu nào đã dùng: lịch sử lưu dạng băm (PBKDF2, muối riêng)
trong ../ban-do/.mat-khau-da-dung.json, không lưu mật khẩu gốc.

Cách dùng:  MAP_PASSWORD='mật-khẩu-mới' python3 tools_lock.py
            (hoặc python3 tools_lock.py rồi nhập mật khẩu khi được hỏi)
"""
import base64, getpass, hashlib, hmac, json, os, secrets, sys, datetime
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "ban-do")
HIST = os.path.join(OUT_DIR, ".mat-khau-da-dung.json")
ITER = 600_000

def kdf(pw, salt, it=ITER):
    return hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, it, 32)

def main():
    pw = os.environ.get("MAP_PASSWORD") or getpass.getpass("Mật khẩu mới: ")
    pw = pw.strip()
    if len(pw) < 6:
        sys.exit("Mật khẩu phải có ít nhất 6 ký tự.")
    os.makedirs(OUT_DIR, exist_ok=True)
    hist = json.load(open(HIST, encoding="utf-8")) if os.path.exists(HIST) else []
    for h in hist:
        if hmac.compare_digest(kdf(pw, base64.b64decode(h["salt"]), h.get("iter", ITER)), base64.b64decode(h["hash"])):
            sys.exit("Mật khẩu này đã từng dùng (%s). Hãy chọn mật khẩu khác." % h.get("date", ""))
    src = open(os.path.join(HERE, "index.html"), "rb").read()
    salt, iv = secrets.token_bytes(16), secrets.token_bytes(12)
    ct = AESGCM(kdf(pw, salt)).encrypt(iv, src, None)
    payload = json.dumps({"s": base64.b64encode(salt).decode(), "i": base64.b64encode(iv).decode(), "n": ITER, "c": base64.b64encode(ct).decode()})
    page = open(os.path.join(HERE, "lock.html"), encoding="utf-8").read().replace("/*__PAYLOAD__*/", payload)
    open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8").write(page)
    hs = secrets.token_bytes(16)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime("%d/%m/%Y %H:%M")
    hist.append({"date": now, "salt": base64.b64encode(hs).decode(), "hash": base64.b64encode(kdf(pw, hs)).decode(), "iter": ITER})
    json.dump(hist, open(HIST, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Đã khóa bản đồ: ban-do/index.html (%d KB). Lần đổi mật khẩu thứ %d, lúc %s." % (len(page) // 1024, len(hist), now))

if __name__ == "__main__":
    main()
