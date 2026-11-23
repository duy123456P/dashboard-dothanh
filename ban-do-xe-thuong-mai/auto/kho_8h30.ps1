# Chạy 8h30 mỗi sáng trên máy văn phòng (Windows Task Scheduler): lấy 2 file kho thành phẩm mới nhất trong Y:\TỒN KHO THÀNH PHẨM\2026,
# tạo factory.json (chỉ số đếm, KHÔNG số khung/số máy), đẩy lên GitHub main → workflow tự dựng và khóa lại bản đồ.
# Yêu cầu một lần: Git, Python 3 (pip install openpyxl), clone repo dashboard-dothanh vào $Repo và đăng nhập Git (GitHub Desktop hoặc git credential manager).
$ErrorActionPreference = "Stop"
$Src  = "Y:\TỒN KHO THÀNH PHẨM\2026"
$Repo = "$env:USERPROFILE\dashboard-dothanh"
$Log  = "$Repo\ban-do-xe-thuong-mai\auto\kho_8h30.log"
function Newest($pattern) { Get-ChildItem -Path $Src -Recurse -File -Filter $pattern | Where-Object { $_.Name -notlike "~$*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1 }
try {
  $fileXe = Newest "*FILE XE T*NG H*P*.xlsx"
  $fileNxt = Newest "*NH*P*XU*T*T*N*.xlsx"
  if (-not $fileXe -or -not $fileNxt) { throw "Không thấy file FILE XE TỔNG HỢP hoặc BC NHẬP-XUẤT-TỒN trong $Src" }
  Set-Location $Repo
  git pull --rebase origin main | Out-Null
  $tmp = "$env:TEMP\dac_kho"; New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  Copy-Item $fileXe.FullName "$tmp\file_xe.xlsx" -Force; Copy-Item $fileNxt.FullName "$tmp\nxt.xlsx" -Force   # chép ra máy, tránh khóa file trên ổ mạng
  python "$Repo\ban-do-xe-thuong-mai\tools_sync_factory.py" "$tmp\file_xe.xlsx" "$tmp\nxt.xlsx"
  git add "ban-do-xe-thuong-mai/factory.json"
  git diff --cached --quiet; if ($LASTEXITCODE -ne 0) { git commit -m "Tồn kho thành phẩm DAC $(Get-Date -Format 'dd/MM/yyyy') ($($fileXe.Name), $($fileNxt.Name))" | Out-Null; git push origin main | Out-Null }
  Add-Content $Log "$(Get-Date -Format s) OK $($fileXe.Name) | $($fileNxt.Name)"
} catch { Add-Content $Log "$(Get-Date -Format s) LỖI $($_.Exception.Message)"; exit 1 }
