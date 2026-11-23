# Tự cập nhật kho thành phẩm lúc 8h30 mỗi sáng

Ổ `Y:\` là ổ mạng nội bộ, chỉ máy trong công ty đọc được. Vì vậy việc lấy file chạy trên **một máy văn phòng bật lúc 8h30**.

1. Cài một lần: [Git](https://git-scm.com/download/win), [Python 3](https://www.python.org/downloads/) (tích "Add to PATH"), rồi mở PowerShell chạy `pip install openpyxl`.
2. Clone repo: `git clone https://github.com/duy123456P/dashboard-dothanh "$env:USERPROFILE\dashboard-dothanh"` (đăng nhập GitHub khi được hỏi).
3. Tạo lịch: mở PowerShell, chạy
   ```
   schtasks /Create /TN "DAC kho 8h30" /SC DAILY /ST 08:30 /TR "powershell -ExecutionPolicy Bypass -File %USERPROFILE%\dashboard-dothanh\ban-do-xe-thuong-mai\auto\kho_8h30.ps1"
   ```
4. Kiểm tra: `schtasks /Run /TN "DAC kho 8h30"`, xem file `auto\kho_8h30.log`.

Mỗi sáng script lấy 2 file mới nhất (FILE XE TỔNG HỢP, BC NHẬP-XUẤT-TỒN), tạo `factory.json` chỉ gồm số đếm (không số khung, số máy), đẩy lên GitHub; workflow tự dựng và khóa lại bản đồ tại https://duy123456p.github.io/dashboard-dothanh/ban-do/.
