const fs = require('fs');
const path = require('path');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  ShadingType, HeadingLevel, PageBreak, Header, Footer, PageNumber, LevelFormat, TableOfContents, VerticalAlign, TabStopType } = D;

const DIR = __dirname;
const NAVY = '1F2A7A', GREY = 'F2F3F7', LINE = 'B8BCC8';
const FONT = 'Times New Roman';
const W = 9070; // A4, lề trái 3 cm, phải 2 cm

const r = (t, o = {}) => new TextRun({ text: t, font: FONT, size: o.size || 26, bold: o.b, italics: o.i, color: o.color });
function rich(s, size) { // **đậm**
  const out = []; s.split(/(\*\*[^*]+\*\*)/).forEach(seg => { if (!seg) return; if (seg.startsWith('**')) out.push(r(seg.slice(2, -2), { b: true, size })); else out.push(r(seg, { size })); });
  return out;
}
const P = (s, o = {}) => new Paragraph({ children: rich(s, o.size), alignment: o.align || AlignmentType.JUSTIFIED, spacing: { before: o.before ?? 0, after: o.after ?? 120, line: 300 }, indent: o.indent ? { firstLine: 567 } : undefined, keepNext: o.keepNext });
const note = s => new Paragraph({ children: [r(s, { i: true, size: 20, color: '555555' })], spacing: { before: 60, after: 160 }, alignment: AlignmentType.LEFT });
const H1 = s => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: s, font: FONT })], pageBreakBefore: false });
const H2 = s => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: s, font: FONT })] });
const H3 = s => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: s, font: FONT })] });
const bul = (s, lvl = 0) => new Paragraph({ numbering: { reference: 'bul', level: lvl }, children: rich(s), spacing: { after: 80, line: 290 }, alignment: AlignmentType.JUSTIFIED });
let numId = 0; const numbered = items => { const ref = 'num' + (numId++); NUMS.push(ref); return items.map(s => new Paragraph({ numbering: { reference: ref, level: 0 }, children: rich(s), spacing: { after: 80, line: 290 }, alignment: AlignmentType.JUSTIFIED })); };
const NUMS = [];
const brk = () => new Paragraph({ children: [new PageBreak()] });

function table(head, rows, widths, o = {}) {
  const sum = widths.reduce((a, b) => a + b, 0); const ws = widths.map(w => Math.round(w * W / sum)); ws[ws.length - 1] += W - ws.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (t, i, hdr, bold, shade) => new TableCell({ width: { size: ws[i], type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
    shading: hdr ? { fill: NAVY, type: ShadingType.CLEAR, color: 'auto' } : shade ? { fill: GREY, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: String(t).split('\n').map(line => new Paragraph({ alignment: (o.num && o.num.includes(i) && !hdr) ? AlignmentType.RIGHT : AlignmentType.LEFT, spacing: { after: 0, line: 260 },
      children: hdr ? [r(line, { b: true, size: 20, color: 'FFFFFF' })] : rich(bold ? '**' + line + '**' : line, 20) })) });
  const trs = o.noHead ? [] : [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell(h, i, true)) })];
  rows.forEach((row, k) => { const tot = o.totalLast && k === rows.length - 1; trs.push(new TableRow({ cantSplit: true, children: row.map((c, i) => cell(c, i, false, tot, tot || (o.zebra && k % 2 === 1))) })); });
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: ws, rows: trs });
}
const img = (f, w, h, align = AlignmentType.CENTER) => new Paragraph({ alignment: align, spacing: { after: 80 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(DIR, f)), transformation: { width: w, height: h } })] });
const fmt = n => Math.round(n).toLocaleString('de-DE');

// ---------- số liệu ----------
const QS = [1052, 1348, 1215, 1385];
const REG = [['Miền Bắc', 1646], ['Miền Trung – Tây Nguyên', 684], ['Miền Nam', 972], ['Miền Tây', 1602], ['Điểm chưa xác định vùng (Nhất Tín và điểm nhỏ)', 96]];
function splitQ(total) { const raw = QS.map(q => total * q / 5000); const b = raw.map(Math.floor); let rem = total - b.reduce((a, x) => a + x, 0); raw.map((v, i) => [v - b[i], i]).sort((a, c) => c[0] - a[0]).slice(0, rem).forEach(([, i]) => b[i]++); return b; }
const regRows = REG.map(([n, t]) => { const q = splitQ(t); return [n, fmt(Math.round(t * 0.84)), fmt(t), ...q.map(fmt)]; });
regRows.push(['Cộng', '4.200', '5.000', ...QS.map(fmt)]);
// điều chỉnh làm tròn cột cam kết cho khớp 4.200
{ const c = REG.map(([, t]) => Math.round(t * 0.84)); const s = c.reduce((a, b) => a + b, 0); c[0] += 4200 - s; c.forEach((v, i) => regRows[i][1] = fmt(v)); }

const DEALERS = [['ĐT Đông Nam', 'Hà Nội', 602, 7, 868, 1010, 13], ['Trường Vũ', 'Cần Thơ', 466, 21, 672, 783, 10], ['Quang Dương', 'Hải Phòng', 214, 6, 308, 359, 5], ['ĐT Đà Nẵng', 'Đà Nẵng', 172, 7, 248, 289, 4],
  ['Tân Vạn', 'TP. Hồ Chí Minh', 155, 9, 223, 260, 3], ['Vũ Hùng', 'TP. Hồ Chí Minh', 149, 5, 215, 250, 3], ['ĐT Hậu Giang', 'Cần Thơ', 125, 6, 180, 210, 3], ['Phú Mỹ', 'TP. Hồ Chí Minh', 117, 9, 169, 196, 3],
  ['ĐT Long An', 'Tây Ninh', 98, 6, 141, 165, 2], ['ĐT Kiên Giang', 'An Giang', 92, 5, 133, 154, 2], ['Phi Hưng', 'Đắk Lắk', 84, 4, 121, 141, 2], ['Việt Nhật Anh', 'Đồng Nai', 71, 5, 102, 119, 2],
  ['Mỹ Phú Hưng', 'Đồng Tháp', 68, 5, 98, 114, 1], ['Ô Tô 19/5', 'Thanh Hóa', 63, 5, 91, 106, 1], ['Hưng Vượng', 'Lâm Đồng', 48, 2, 69, 81, 1], ['Ô Tô Tây Nguyên', 'Đắk Lắk', 38, 9, 55, 64, 1],
  ['Hồng Vinh', 'Đồng Tháp', 36, 1, 52, 60, 1], ['ĐT Tiền Giang', 'Đồng Tháp', 35, 4, 50, 59, 1], ['Phúc Châu', 'Vĩnh Long', 34, 3, 49, 57, 1], ['Dũng Lạc', 'Nghệ An', 22, 3, 32, 37, 0],
  ['Hùng Tuyến (cấp 2)', 'Gia Lai', 14, 2, 20, 24, 0], ['Cương Nguyễn (cấp 2)', 'Quảng Ngãi', 14, 2, 20, 24, 0], ['ĐT Bình Thuận', 'Lâm Đồng', 14, 5, 20, 24, 0], ['Nhất Tín và điểm nhỏ', '—', 57, 0, 82, 96, 1]];
const dRows = DEALERS.map(d => [d[0], d[1], fmt(d[2]), d[3], fmt(d[4]), fmt(d[5]), d[6] ? '+' + d[6] : '0', d[3] + d[6]]);
dRows.push(['Cộng đại lý hiện có', '', '2.788', 131, '4.018', '4.682', '+60', 191]);

// ---------- văn bản ----------
const cover = [
  new Paragraph({ spacing: { after: 0 }, children: [] }),
  img('logo.png', 210, 168),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 }, children: [r('ĐÔ THÀNH AUTO – DAC', { b: true, size: 28, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [r('KHỐI KINH DOANH', { b: true, size: 24, color: '444444' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [r('KẾ HOẠCH', { b: true, size: 44, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [r('PHÁT TRIỂN KHỐI KINH DOANH NĂM 2027', { b: true, size: 36, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [r('Kinh doanh xe · Dịch vụ · Phụ tùng · Đào tạo · Marketing · Chăm sóc khách hàng · Phát triển đại lý', { i: true, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [r('Mục tiêu: 5.000 xe bán lẻ – thị phần 7,0% (cam kết tối thiểu 4.200 xe – 5,9%)', { b: true, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 900 }, children: [r('34 đại lý cấp 1 · 231 tư vấn bán hàng · số hóa toàn bộ chuỗi kho thành phẩm → giao xe → chăm sóc sau bán', { size: 22 })] }),
  table(['', ''], [
    ['Số văn bản', '……/2026/KH-KKD'],
    ['Người lập', 'Ông Phạm Văn Duy – Phó Giám đốc phụ trách Khối Kinh doanh DAC'],
    ['Trình phê duyệt', 'Ông Huỳnh Cao Minh – Phó Tổng Giám đốc thường trực DAC'],
    ['Ngày lập', '24 tháng 11 năm 2026'],
    ['Kỳ kế hoạch, hiệu lực', 'Áp dụng từ 01/01/2027 đến 31/12/2027, kể từ ngày được phê duyệt'],
    ['Mức độ lưu hành', 'Nội bộ – Ban Tổng Giám đốc và Khối Kinh doanh DAC']], [28, 72], { noHead: true }),
  brk()];

const SECS = ['I. Căn cứ lập kế hoạch', 'II. Điều kiện tiên quyết', 'III. Tóm tắt điều hành', 'IV. Hiện trạng 2026 và số liệu nền', 'V. Phương pháp dự báo và cơ sở khả thi', 'VI. Mục tiêu và kế hoạch theo mảng', 'VII. Phân bổ chỉ tiêu xuống bộ phận và phòng ban', 'VIII. Thẻ điểm KPI và cơ chế thưởng', 'IX. Ngân sách và quản trị rủi ro', 'X. Phương thức triển khai và hiệu lực'];
const toc = [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [r('MỤC LỤC', { b: true, size: 30, color: NAVY })] }),
  ...SECS.map(t => new Paragraph({ spacing: { after: 140 }, indent: { left: 567 }, children: [r(t, { size: 26 })] })),
  new Paragraph({ spacing: { before: 200, after: 140 }, indent: { left: 567 }, children: [r('Ký duyệt và nơi nhận', { size: 26, i: true })] }), brk()];
const body = [
  H1('I. CĂN CỨ LẬP KẾ HOẠCH'),
  P('Kế hoạch được lập trên số liệu thực tế của DAC và thị trường đến tháng 10–11/2026, đối chiếu chéo giữa các nguồn; mọi con số ước tính hoặc giả định đều được ghi rõ ngay tại chỗ sử dụng.', { indent: true }),
  table(['Nguồn dữ liệu', 'Nội dung sử dụng', 'Thời điểm'], [
    ['Báo cáo thị trường DAC (IZ, KAMA) 10T/2026', 'Thị trường 8 phân khúc, thị phần, thứ hạng thương hiệu', '10/2026'],
    ['File đăng ký mới từng xe (DKM)', 'Thị trường và thị phần thực theo tỉnh, 5 phân khúc có sản phẩm', '10/2026'],
    ['File giao dịch bán hàng (ngày TT 100%)', 'Bán lẻ theo tháng, đại lý, model 11/2024–11/2026', '21/11/2026'],
    ['Tồn SR từng xe của đại lý', 'Tồn đại lý, tuổi tồn, loại hợp đồng', '21/11/2026'],
    ['Kho thành phẩm DAC (FILE XE TỔNG HỢP, BC NHẬP–XUẤT–TỒN)', 'Tồn nhà máy, tuổi tồn, bán sỉ theo đại lý', '20/11/2026'],
    ['Báo cáo công nợ trong hạn và quá hạn (Kế toán)', 'Dư nợ, nợ quá hạn theo đại lý, hạn thanh toán', '20/11/2026'],
    ['Kế hoạch ERP 2027, chỉ số mùa vụ ERP', 'Dự báo cơ sở, mùa vụ theo tháng', '11/2026'],
    ['Cục Đăng kiểm Việt Nam', 'UIO xe thương mại 1.951.883 xe; xe tải hết niên hạn 2025 (CV 419/ĐKVN)', '08/2026; 02/2026'],
    ['Báo cáo thưởng DAC 2026; danh mục đại lý', 'Mạng lưới, tư vấn bán hàng, bán lẻ đại lý cấp 2', '19/11/2026'],
    ['File chiến dịch MKT cả nước 2027', '156 sự kiện, 2.118 doanh nghiệp tiềm năng có định vị', '11/2026']], [36, 46, 18]),
  note('Toàn bộ số liệu nền được tổng hợp trên Bản đồ thị trường 3D của DAC; công cụ tính toán lưu trong kho mã của dự án để chạy lại khi có số mới.'),

  H1('II. ĐIỀU KIỆN TIÊN QUYẾT'),
  P('Cải tổ Khối Kinh doanh năm 2027 chỉ thành công khi Ban Tổng Giám đốc DAC thống nhất và thông qua **hai điều kiện** dưới đây trước khi triển khai. Thiếu một trong hai, chỉ tiêu 5.000 xe, thẻ điểm KPI và cơ chế thưởng không có số liệu đáng tin để đo và kiểm soát; khi đó đề nghị chỉ duyệt mức cam kết 4.200 xe và chưa áp dụng cơ chế KPI mới.', { indent: true }),
  H2('1. Số hóa, tự động hóa toàn bộ quy trình từ kho thành phẩm đến giao xe và chăm sóc sau bán'),
  P('Mọi giao dịch gắn với **số khung** từ khi xe nhập kho thành phẩm đến khi khách mua xong và quay lại xưởng. Hệ thống tự khóa bước sau khi bước trước chưa đủ điều kiện theo nguyên tắc chống sai (Poka-Yoke): làm đúng thì dễ, làm sai thì hệ thống không cho đi tiếp.', { indent: true }),
  P('**Lỗi đã quan sát trên dữ liệu 2026** – căn cứ của điều kiện này:'),
  bul('File tổng hợp bán hàng ghi dồn bán sỉ nhiều tháng, thiếu tháng 10; phải lấy lại theo kho nhà máy.'),
  bul('File giao dịch còn 790 xe ghi cọc 10% chưa thanh toán đủ, trong khi kế toán chỉ còn 282 xe HĐMB đang nợ.'),
  bul('4 đại lý báo tồn bằng số tổng, không có từng số khung; cùng một số khung xuất hiện ở hai đại lý trong hồ sơ thưởng.'),
  bul('Tên đại lý giữa các file không khớp (Nhất Tín, Môi Trường Sống chưa có trong danh mục).'),
  table(['Bước', 'Số hóa', 'Khóa chặn tự động', 'Chỉ số đo'], [
    ['1. Kho thành phẩm', 'Nhập, xuất quét mã số khung; tồn, tuổi tồn cập nhật 8h30 hằng ngày', 'Không xuất xe cho đại lý vượt hạn mức dư nợ hoặc có nợ trên 90 ngày', 'Tồn nhà máy (tháng bán)'],
    ['2. Hợp đồng sỉ (HĐMB, MBTB)', 'Hợp đồng điện tử, số khung gắn hợp đồng', 'Một số khung chỉ thuộc một hợp đồng, một đại lý', 'Xe trùng số khung = 0'],
    ['3. Công nợ', 'Hạn thanh toán tự tính (30 / 95 ngày), nhắc trước hạn 7 ngày', 'Quá 90 ngày tự khóa giao xe mới', 'Nợ quá hạn / dư nợ'],
    ['4. Tồn đại lý', 'Đại lý báo từng số khung qua ứng dụng', 'Tự đối chiếu kho nhà máy, lệch thì mở phiếu xử lý', 'Tỷ lệ khớp tồn'],
    ['5. Bán lẻ, PDI, giao xe', 'Hóa đơn gắn số khung, ngày TT 100%; biên bản giao xe điện tử', 'Thiếu hoặc trùng số khung thì không ghi nhận bán lẻ, không tính thưởng', 'Bán lẻ tháng'],
    ['6. Dữ liệu khách', 'Vào hệ thống quản lý khách hàng trong 7 ngày', 'Không chuyển thì không tính thưởng bán lẻ', 'Hồ sơ đủ trong 7 ngày'],
    ['7. Sau bán, dịch vụ, phụ tùng', 'Khảo sát 30 ngày, nhắc bảo dưỡng tự động', 'Phàn nàn quá 48 giờ tự chuyển cấp quản lý', 'Hài lòng; xe quay lại xưởng'],
    ['8. Báo cáo, KPI', 'Bảng điều hành, bản đồ thị trường tự cập nhật', 'Số chưa chốt không được tính KPI', 'Báo cáo làm tay còn lại']], [18, 30, 32, 20]),
  P('**Lộ trình:** Q1/2027 thí điểm tại ĐT Đông Nam và Trường Vũ, chạy song song cách làm cũ để đối chiếu; Q2/2027 mở rộng 10 đại lý lớn; Q3/2027 toàn hệ thống. Phòng CNTT/ERP lập dự toán và chọn giải pháp trước 31/12/2026.', { before: 120 }),
  P('**Mục đích cuối cùng: số liệu và dòng tiền chạy theo thời gian thực.** Mỗi giao dịch được ghi nhận ngay khi xảy ra, không chờ báo cáo cuối tháng; Ban Tổng Giám đốc nhìn thấy cùng một số liệu chính xác bất kỳ lúc nào. Dòng tiền (xuất xe, cọc, thanh toán, nợ đến hạn) cập nhật theo từng số khung, từ đó hệ thống tự đo độ trễ giữa các bước và chỉ ra điểm nghẽn của dòng tiền và của mọi hoạt động.', { before: 120, indent: true }),
  table(['Đoạn trong chuỗi', 'Độ trễ đo theo thời gian thực', 'Hiện trạng (đã quan sát)', 'Ngưỡng cảnh báo đề xuất'], [
    ['Kho thành phẩm → xuất cho đại lý', 'Số ngày xe nằm kho nhà máy', '966 xe; toàn hệ thống 8,2 tháng bán', 'Trên 30 ngày'],
    ['Xuất xe → đại lý thanh toán đủ', 'Số ngày từ xuất kho đến tiền về (HĐMB 30, MBTB 95 ngày)', 'Nợ quá hạn 85,9 tỷ; 36 tỷ quá 90 ngày', 'Quá hạn 1 ngày: nhắc; 30 ngày: báo vùng; 90 ngày: khóa giao xe'],
    ['Xe tại đại lý → bán lẻ', 'Tuổi tồn từng xe', '957 xe = 4,1 tháng bán; 107 xe trên 180 ngày', 'Trên 90 ngày: kế hoạch xả; trên 180 ngày: báo Ban TGĐ'],
    ['Bán lẻ → ghi nhận đủ hồ sơ', 'Số ngày từ thanh toán 100% đến khi đủ số khung, khách', '790 xe treo cọc 10% trên file giao dịch so với 282 xe kế toán', 'Trên 2 ngày'],
    ['Khách tiềm năng → lái thử → chốt', 'Số ngày và tỷ lệ rớt mỗi bước phễu', 'Chưa đo được', 'Khách chưa được liên hệ sau 24 giờ'],
    ['Giao xe → khảo sát, quay lại xưởng', 'Số ngày đến lần chăm sóc, bảo dưỡng đầu', 'Chưa đo được', 'Chưa khảo sát sau 30 ngày']], [22, 26, 28, 24]),
  note('Điểm nghẽn hiển thị trên bảng điều hành theo đại lý, vùng, model; mỗi cảnh báo có người chịu trách nhiệm, hạn xử lý và cấp báo cáo khi quá hạn.'),
  H2('2. Rà soát toàn bộ mô tả công việc và lập KPI mới cho mọi bộ phận'),
  P('Mỗi vị trí có mô tả công việc mới nêu rõ việc chính, quyền quyết định, đầu mối phối hợp và đầu ra. KPI mỗi bộ phận = **60% thẻ điểm khối + 40% chỉ số riêng**, tối đa 5 chỉ số riêng mỗi vị trí; mỗi chỉ số có công thức, nguồn số, người cung cấp và tần suất. Lịch: dự thảo 15/12/2026 → Ban Tổng Giám đốc duyệt 31/12/2026 → áp dụng 01/01/2027; tháng 1/2027 chấm thử, không ảnh hưởng thu nhập; chính thức từ tháng 2/2027.', { indent: true }),

  H1('III. TÓM TẮT ĐIỀU HÀNH'),
  P('Năm 2027 Khối Kinh doanh **cam kết 4.200 xe bán lẻ (thị phần 5,9%)** và **phấn đấu 5.000 xe (7,0%)**, tăng 54–83% so với ước 2026 (2.732 xe; thị phần 4,1%, hạng 9). Hai mức tính trên thị trường 5 phân khúc Đô Thành có sản phẩm, không gồm xe điện, khoảng 71.600 xe/năm nếu đi ngang.', { indent: true }),
  P('Chỉ tiêu được kiểm chứng bằng mô hình **SARIMAX** và **hồi quy đa biến** chạy trên số bán lẻ thật của DAC: không làm gì thêm thì 2027 chỉ khoảng 2.871 xe; mở điểm bán và tăng tư vấn đúng lịch thì đạt 3.835–4.559 xe; phần còn lại do chiến dịch marketing, đội xe doanh nghiệp và khách cũ mang lại.', { indent: true }),
  table(['Chỉ tiêu chính 2027', 'Cam kết', 'KPI 100%'], [
    ['Bán lẻ (xe)', '4.200', '5.000'], ['Thị phần 5 phân khúc', '5,9%', '7,0%'], ['Doanh thu xe (tỷ đồng, 450 triệu/xe)', '1.890', '2.250'],
    ['Đại lý cấp 1', '30', '34'], ['Tư vấn bán hàng', '181', '231'], ['Lượt xe vào xưởng ủy quyền', '12.000', '22.000'], ['Doanh thu phụ tùng (tỷ đồng)', '25', '45'],
    ['Tỷ lệ khách mua lại', '6%', '8%'], ['Tồn đại lý cuối năm', '≤ 2,5 tháng bán', '≤ 2 tháng bán'], ['Nợ quá hạn trên 90 ngày', '0 từ 31/03/2027', '0 từ 31/01/2027']], [52, 24, 24], { num: [1, 2] }),
  note('Doanh thu dịch vụ, phụ tùng là mức đề xuất theo giả định; Phòng Dịch vụ cung cấp số thực hiện 2026 trước 15/12/2026 để chốt.'),

  H1('IV. HIỆN TRẠNG 2026 VÀ SỐ LIỆU NỀN'),
  P('Bộ số liệu nền dưới đây được chốt tại 30/11/2026 và khóa sau 15/12/2026; ngày 31/12/2027 đánh giá mức phát triển bằng chính bộ số này, cùng cách đo. Chỉ số chưa có số nền thì không được tính vào đánh giá phát triển.', { indent: true }),
  table(['Mảng', 'Chỉ số', 'Số nền 2026', 'Nguồn, thời điểm', 'KPI 2027'], [
    ['Kinh doanh xe', 'Bán lẻ cả năm', '2.732 xe (ước; T1–T10 thực 2.262)', 'Giao dịch bán hàng', '5.000 xe'],
    ['', 'Thị phần, thứ hạng', '4,1%, hạng 9', 'Báo cáo thị trường 10T/2026', '7,0%'],
    ['', 'Thị phần theo phân khúc', 'Van 2,0%; tải nhỏ I 2,8%; tải nhỏ II 4,1%; tải nhẹ I 12,0%; tải nhẹ II 0,7%', 'Báo cáo thị trường 10T/2026', '4 / 5 / 7 / 15 / 5%'],
    ['Phát triển đại lý', 'Đại lý cấp 1; tỉnh có điểm bán', '21 cấp 1 (sau khi Hùng Tuyến, Cương Nguyễn chuyển cấp 2); 26/34 tỉnh', 'Danh mục đại lý 11/2026', '34 cấp 1; 30/34 tỉnh'],
    ['Đào tạo', 'Tư vấn bán hàng; năng suất', '131 người; ~21 xe/người/năm', 'Danh mục đại lý', '231 người; ~22 xe/người'],
    ['Tồn kho', 'Tồn đại lý; xe trên 180 ngày', '957 xe = 4,1 tháng bán; 107 xe', 'Tồn SR 21/11/2026', '≤ 2 tháng; ≤ 15 xe'],
    ['', 'Tồn nhà máy; toàn hệ thống', '966 xe; 8,2 tháng bán (12 tháng kể cả CKD)', 'Kho thành phẩm 20/11/2026', '≤ 1 tháng; ≤ 3 tháng'],
    ['Dòng tiền', 'Dư nợ; quá hạn; trên 90 ngày', '139,2 tỷ; 85,9 tỷ (212 xe); 36 tỷ (90 xe)', 'Kế toán 20/11/2026', 'Quá hạn ≤ 10%; trên 90 ngày = 0'],
    ['Thị trường', 'UIO xe thương mại cả nước', '1.951.883 xe', 'Cục Đăng kiểm 8/2026', '—'],
    ['Chăm sóc khách hàng', 'Khách đã mua; mua lại', '4.695 khách; 5,3% (251 khách)', 'Dữ liệu TVBH 2023–2026', '8%'],
    ['Dịch vụ, phụ tùng, hài lòng, lợi nhuận khối', 'Lượt xưởng, doanh thu, điểm hài lòng, lợi nhuận gộp', 'Chưa có số', 'Các phòng cung cấp trước 15/12/2026', 'Theo mục VI'],
    ['Dự báo nền', 'Bán lẻ 2027 nếu không làm gì thêm', '2.871 xe (80%: 2.332–3.409)', 'Mô hình SARIMAX', '5.000 xe']], [16, 20, 28, 20, 16]),
  P('**Nhận định:** Đô Thành có lợi thế giá (rẻ hơn JAC 35–80 triệu/xe ở dải 1,9–3,5 tấn) và mạnh ở tải nhẹ I (hạng 4), nhưng điểm nghẽn nằm ở độ phủ mạng lưới (Thaco hơn 450 điểm, TMT 64, Teraco hơn 50), nhận diện thương hiệu, tồn kho hệ thống cao và công nợ quá hạn lớn.', { before: 120, indent: true }),

  H1('V. PHƯƠNG PHÁP DỰ BÁO VÀ CƠ SỞ KHẢ THI'),
  P('Mỗi mức chỉ tiêu được kiểm chứng chéo bằng 5 cách độc lập. Chỉ khi các cách cùng cho ra một mức thì mức đó mới được coi là có cơ sở; cách cho kết quả thấp nhất là điểm nghẽn cần xử lý trước.', { indent: true }),
  table(['Cách tính', 'Dưới 75%', '75% – dưới 85%', '85% – 100%', 'Vượt 100%'], [
    ['Bán lẻ 2027 (xe)', 'dưới 3.750', '3.750 – 4.249', '4.250 – 5.000', 'trên 5.000'],
    ['(1) Thị phần, thị trường 71.644 xe', 'dưới 5,2%', '5,2% – 5,9%', '5,9% – 7,0%', 'trên 7,0%'],
    ['(2) Tư vấn × xe/tư vấn/năm', 'dưới 160 người', '160–180 × 23–24', '181–231 × 22', '231 × trên 22'],
    ['(3) Điểm bán × xe/điểm/năm', '50 × dưới 75', '54 × 70–79', '58–62 × 73–81', '62 × trên 81'],
    ['(4) Phễu: khách ghi nhận/năm (chốt 12%)', 'dưới 31.250', '31.250 – 35.400', '35.400 – 41.700', 'trên 41.700'],
    ['(5) Chuỗi thời gian (SARIMAX)', 'trong dải giữ nguyên', 'cần mở 8 điểm', 'cần mở 12 điểm + chương trình', 'cần thị trường tăng']], [30, 17, 18, 18, 17]),
  H2('1. Mô hình SARIMAX'),
  P('SARIMAX(1,0,0) có hằng số và xu hướng, ước lượng trên bán lẻ tháng toàn hệ thống 11/2024–10/2026 (24 tháng, ngày thanh toán 100%). Biến ngoại sinh: chỉ số mùa vụ ERP và số điểm bán có phát sinh bán lẻ trong tháng. Mỗi điểm bán hoạt động thêm ứng với khoảng **20 xe/tháng** (p = 0,003); mùa vụ có ý nghĩa thống kê (p = 0,02). Sai số trong mẫu 14,8%; kiểm tra ngoài mẫu (ước lượng đến 4/2026, dự báo 5–10/2026) 27%.', { indent: true }),
  img('chart_sarimax.png', 600, 280),
  note('Nguồn: giao dịch bán hàng DAC; mô hình tools_forecast_2027.py. Dải tin cậy 80%: giữ nguyên 2.332–3.409; mở 8 điểm 3.297–4.374; mở 12 điểm 4.020–5.098 xe.'),
  H2('2. Mô hình hồi quy đa biến theo tỉnh'),
  P('Bán lẻ 12 tháng theo tỉnh (26 tỉnh có điểm bán) = −8,3 + 0,0296 × thị trường 5 phân khúc/năm − 19,3 × số điểm bán + 15,5 × số tư vấn; **R² = 0,81**. Mỗi tư vấn thêm ứng với khoảng **15,5 xe/năm** (p < 0,001); mỗi 1.000 xe thị trường tỉnh ứng với khoảng 30 xe Đô Thành. Hệ số số điểm bán không có ý nghĩa thống kê khi đã tính số tư vấn: điểm bán mới chỉ tạo thêm xe khi có đủ tư vấn.', { indent: true }),
  table(['Kịch bản 2027', 'SARIMAX (dải 80%)', 'Hồi quy đa biến', 'Chỉ tiêu', 'Phần chương trình phải bù'], [
    ['Giữ nguyên mạng lưới', '2.871 (2.332–3.409)', '2.774', '—', '—'],
    ['Mở 8 điểm, 181 tư vấn', '3.835 (3.297–4.374)', '3.282', '4.200', '365 xe'],
    ['Mở 12 điểm, 231 tư vấn', '4.559 (4.020–5.098)', '3.615', '5.000', '441 xe']], [26, 22, 16, 12, 24]),
  P('**Kết luận:** mức cam kết 4.200 xe và KPI 5.000 xe đều nằm trong dải tin cậy 80% của SARIMAX, KPI 5.000 xe sát mép trên. Phần chênh 365–441 xe tương đương quy mô chiến dịch MKT offline (383 xe) cộng khách cũ, đội xe doanh nghiệp.', { before: 120, indent: true }),
  P('**Giới hạn và cách cập nhật:** chuỗi giao dịch mới có 24 tháng nên mùa vụ lấy từ ERP; sai số ngoài mẫu còn 27%; chưa có biến vĩ mô theo tháng (tín dụng, lãi suất, đầu tư công). Hai mô hình được ước lượng lại hằng quý tại họp S&OP.', { indent: true }),

  H1('VI. MỤC TIÊU VÀ KẾ HOẠCH THEO MẢNG'),
  H2('1. Cầu nối nguồn tăng trưởng'),
  img('chart_bridge.png', 600, 253),
  table(['Nguồn tăng (xe)', 'Cam kết', 'KPI 100%', 'Cách đo'], [
    ['Nền 2026 (bán lẻ ước cả năm)', '2.732', '2.732', 'Ngày thanh toán 100%'], ['Đại lý hiện có nâng năng suất', '+418', '+717', 'Bán lẻ/đại lý/tháng'], ['Chiến dịch MKT offline 2027', '+383', '+383', 'Xe chốt có mã sự kiện'],
    ['Khách cũ mua lại, giới thiệu', '+200', '+300', 'Trùng SĐT, mã giới thiệu'], ['Đội xe doanh nghiệp (fleet)', '+200', '+350', 'Hợp đồng ≥ 5 xe'], ['Điểm bán mới, điểm nâng cấp cấp 1', '+182', '+318', 'Bán lẻ điểm mới'],
    ['JP120, Van mở phân khúc', '+85', '+200', 'Bán lẻ JP120, V56, V65'], ['Cộng', '4.200', '5.000', '']], [40, 15, 15, 30], { totalLast: true, num: [1, 2] }),
  H2('2. Kinh doanh xe theo phân khúc'),
  table(['Phân khúc', 'Sản phẩm', 'Thị trường/năm', '2026 (xe · thị phần)', 'Cam kết', 'KPI 100%'], [
    ['Van (< 1 tấn)', 'V56, V65', '7.738', '158 · 2,0%', '232 · 3,0%', '310 · 4,0%'], ['Tải nhỏ I (< 1,5 tấn)', 'MISSU T26, T33L', '14.011', '387 · 2,8%', '560 · 4,0%', '701 · 5,0%'],
    ['Tải nhỏ II (1,5–2,5 tấn)', 'IZ45S, IZ50S, IZ50M, IZ50M Plus, IZ60SL Plus', '30.157', '1.242 · 4,1%', '1.749 · 5,8%', '2.084 · 6,9%'],
    ['Tải nhẹ I (2,5–3,5 tấn)', 'IZ62M, IZ65M Plus, IZ71SL Plus', '9.177', '1.101 · 12,0%', '1.285 · 14,0%', '1.377 · 15,0%'], ['Tải nhẹ II (3,5–5 tấn)', 'JP120SL, JP120EXL', '10.561', '76 · 0,7%', '374 · 3,5%', '528 · 5,0%'],
    ['Cộng', '', '71.644', '2.964 · 4,1%', '4.200 · 5,9%', '5.000 · 7,0%']], [20, 26, 12, 14, 14, 14], { totalLast: true }),
  note('Số 2026 theo phân khúc là đăng ký mới quy năm (báo cáo thị trường) nên cao hơn số bán lẻ theo ngày thanh toán.'),
  ...numbered(['Giao chỉ tiêu và trả thưởng theo **bán lẻ**, không theo bán sỉ.', 'Tải nhỏ II: bán chassis (sắt si) cho cơ sở đóng thùng đạt chuẩn, vì đối thủ có 65–75% doanh số là sắt si.', 'JP120 và Van: xe mẫu tại 6 đại lý lớn từ tháng 3/2027; chính sách giới thiệu khách logistics, vật liệu xây dựng.', 'TP.HCM và Hà Nội: đội bán hàng doanh nghiệp riêng, nâng thị phần từ 2,3–2,5% lên 4–5%.', 'Thu cũ đổi mới xe hết niên hạn theo danh sách Cục Đăng kiểm từng tỉnh.']),
  H2('3. Dịch vụ'),
  table(['Chỉ tiêu', 'Cam kết', 'KPI 100%', 'Ghi chú'], [['Lượt xe vào xưởng ủy quyền', '12.000', '22.000', '7.774 xe bán 2023–2026 + nửa số xe 2027 × tỷ lệ quay lại × lượt/xe'], ['Tỷ lệ xe quay lại xưởng', '40%', '55%', 'Giả định, chờ số thực 2026'], ['Doanh thu dịch vụ', '30 tỷ', '55 tỷ', 'Giả định 2,5 triệu/lượt'], ['Trạm ủy quyền; xe dịch vụ lưu động', '30; 4', '34; 8', 'Hiện 25 trạm'], ['Sửa xong trong ngày (việc nhỏ)', '80%', '90%', 'Phiếu sửa chữa']], [32, 14, 14, 40]),
  H2('4. Phụ tùng'),
  table(['Chỉ tiêu', 'Cam kết', 'KPI 100%'], [['Doanh thu phụ tùng DAC bán ra', '25 tỷ', '45 tỷ'], ['Đáp ứng ngay tại trạm', '85%', '92%'], ['Giao phụ tùng thiếu đến trạm', '≤ 48 giờ', '≤ 24 giờ'], ['Vòng quay tồn kho phụ tùng', '4 lần/năm', '6 lần/năm'], ['Kho phụ tùng miền; gara liên kết', '2; 60', '3; 150']], [50, 25, 25]),
  H2('5. Đào tạo'),
  table(['Chỉ tiêu', 'Cam kết', 'KPI 100%'], [['Tư vấn bán hàng đạt chứng chỉ DAC', '100% (181 người)', '100% (231 người)'], ['Giờ đào tạo/tư vấn/năm', '24 giờ', '40 giờ'], ['Kỹ thuật viên đạt chuẩn nhà máy', '2/trạm', '3/trạm'], ['Đạt bài kiểm tra so sánh đối thủ', '80%', '95%'], ['Bán lẻ bình quân/tư vấn/năm', '23 xe', '22 xe']], [50, 25, 25]),
  H2('6. Marketing'),
  table(['Chỉ tiêu', 'Cam kết', 'KPI 100%'], [['Buổi lưu động; hội thảo doanh nghiệp', '120; 36', '150; 48'], ['Khách ghi nhận offline; kênh số', '3.659; 1.500', '4.500; 4.000'], ['Lái thử', '1.280', '2.000'], ['Xe bán có mã chiến dịch', '383', '600'], ['Ngân sách; chi phí/xe', '2.622 triệu; ≤ 7 triệu', '4.200 triệu; ≤ 7 triệu']], [50, 25, 25]),
  note('Số offline theo file Chiến dịch MKT cả nước 2027 (20 khách/buổi lưu động, 12 khách/hội thảo, 35% lái thử, 30% chốt).'),
  H2('7. Chăm sóc khách hàng'),
  P('Chuẩn điều hành DAC: 1 khách trung thành kéo theo 250 người tiềm năng; khách mua lần 2 có 75% khả năng thành trung thành; tìm khách mới tốn gấp 7 lần giữ khách cũ.', { indent: true }),
  table(['Chỉ tiêu', 'Cam kết', 'KPI 100%'], [['Xe giao được gọi khảo sát sau 30 ngày', '90%', '100%'], ['Điểm hài lòng sau mua (thang 10)', '≥ 8,0', '≥ 8,5'], ['Phàn nàn xử lý xong trong 48 giờ', '85%', '95%'], ['Tỷ lệ khách mua lại (4.695 khách cũ)', '6%', '8%'], ['Khách theo dõi Zalo OA', '3.000', '6.000']], [50, 25, 25]),
  H2('8. Phát triển đại lý: lộ trình đủ 34 đại lý cấp 1'),
  P('Hiện có 21 đại lý cấp 1. Thêm 13 điểm ở khu vực cảng biển, khu công nghiệp: **5 điểm nâng cấp** từ đại lý cấp 2 đang bán Đô Thành (chủ đầu tư cam kết đạt tiêu chuẩn cấp 1 mới) và **8 điểm mở mới** với đối tác chuyên Đô Thành. Các điểm cấp 2 kinh doanh chủ yếu thương hiệu khác được loại khỏi hệ thống.', { indent: true }),
  table(['#', 'Tỉnh', 'Đại lý / khu vực', 'Cách làm', 'Cảng, KCN', 'Thị phần hiện tại → mục tiêu (+20%)', 'Cấp 1 từ'], [
    ['1', 'Hà Nội', 'Auto Đông Nam – CN Chương Mỹ', 'Nâng cấp', 'KCN Phú Nghĩa', '2,3% → 2,8%', '01/03/2027'], ['2', 'Ninh Bình', 'Auto Đông Nam – CN Nam Định', 'Nâng cấp', 'KCN Hòa Xá', '2,2% → 2,6%', '01/03/2027'],
    ['3', 'Bắc Ninh', 'Quang Phát / Hùng Ngân Phát / Nhật Dương (chọn 1)', 'Nâng cấp', 'KCN Bắc Ninh – Bắc Giang', '3,8% → 4,6%', '01/03/2027'], ['4', 'Khánh Hòa', 'Ô Tô Tây Nguyên – CN Khánh Hòa', 'Nâng cấp', 'Cảng Vân Phong 36 km', '2,4% → 2,9%', '01/05/2027'],
    ['5', 'Phú Thọ', 'Ô Tô Hiền Nhung', 'Nâng cấp', 'KCN Vĩnh Phúc 24 km', '5,5% → 6,6%', '01/05/2027'], ['6', 'TP.HCM', 'Phú Mỹ – Cái Mép (Bà Rịa – Vũng Tàu cũ)', 'Mở mới', 'Cảng Cái Mép – Thị Vải', '2,5% → 3,0%', '01/06/2027'],
    ['7', 'Thanh Hóa', 'Khu kinh tế Nghi Sơn', 'Mở mới', 'Cảng, KKT Nghi Sơn', '1,5% → 1,8%', '01/06/2027'], ['8', 'Gia Lai', 'Khu vực Quy Nhơn', 'Mở mới', 'Cảng Quy Nhơn', '3,2% → 3,8%', '01/06/2027'],
    ['9', 'Quảng Ngãi', 'Khu vực Dung Quất – Chu Lai', 'Mở mới', 'Cảng Dung Quất, KKT Chu Lai', '4,0% → 4,8%', '01/06/2027'], ['10', 'Quảng Ninh', 'Hạ Long – Cẩm Phả', 'Mở mới', 'Cảng Cái Lân', '1,6% → 1,9%', '01/08/2027'],
    ['11', 'Hà Tĩnh', 'Kỳ Anh', 'Mở mới', 'Cảng, KKT Vũng Áng', '4,1% → 4,9%', '01/08/2027'], ['12', 'Huế', 'Khu vực Chân Mây', 'Mở mới', 'Cảng Chân Mây', '4,8% → 5,8%', '01/08/2027'],
    ['13', 'Quảng Trị', 'Khu vực Đồng Hới', 'Mở mới', 'Hướng KKT Vũng Áng', '2,4% → 2,9%', '01/08/2027']], [5, 11, 24, 10, 17, 15, 15]),
  note('Thị trường, thị phần theo đăng ký thực T10/2026 (file DKM); cần đối chiếu thêm 3 tháng trước khi ký. Dự phòng khi chủ đầu tư không đạt chuẩn: VSIP (Bình Dương cũ), Nhơn Trạch – Long Thành, Thái Nguyên – Yên Bình, Hưng Yên (Mỹ An/Thiên Trường), Cà Mau (Trường Vũ CN Cà Mau), XNK TM Ô tô miền Nam (cảng Cát Lái).'),
  P('**Điều kiện nâng cấp cấp 2 lên cấp 1:** chủ đầu tư ký cam kết đạt chuẩn cấp 1 trong 60 ngày, kế hoạch bán lẻ ≥ 48 xe/năm (≥ 96 xe ở Hà Nội, TP.HCM); không nợ quá hạn trên 30 ngày; DAC hỗ trợ 125 triệu/điểm sau nghiệm thu (điểm mở mới 250 triệu); đại lý cấp 1 đang cấp xe được báo trước 30 ngày; quá 90 ngày chưa đạt chuẩn thì giữ cấp 2 và chuyển phương án dự phòng.', { indent: true }),
  table(['Tiêu chuẩn đại lý cấp 1', 'Hà Nội, TP.HCM', 'Tỉnh'], [['Showroom', '≥ 500 m², 10–12 xe trưng bày', '≥ 300 m², 6–8 xe'], ['Xưởng dịch vụ', '≥ 6 khoang, cầu nâng xe tải', '≥ 4 khoang'], ['Phụ tùng', 'Danh mục 200 mã thông dụng', 'Danh mục 200 mã thông dụng'], ['Tư vấn; kỹ thuật viên', '5 khi mở, 8 sau 12 tháng; 4 KTV', '3 khi mở, 6 sau 12 tháng; 3 KTV'], ['Xe lái thử; nhận diện', '2; chuẩn 3S Đô Thành', '1; chuẩn 3S Đô Thành']], [30, 35, 35]),
  H2('9. Tồn kho, công nợ và tài chính bán hàng'),
  table(['Chỉ tiêu', 'Hiện trạng', 'Cam kết', 'KPI 100%'], [['Tồn đại lý', '957 xe; 4,1 tháng bán', '≤ 2,5 tháng từ Q2', '≤ 2 tháng từ Q2'], ['Xe tồn trên 180 ngày', '107 xe', '≤ 30 xe từ 31/03', '≤ 15 xe từ 31/03'], ['Tồn toàn hệ thống', '8,2 tháng bán', '≤ 4 tháng', '≤ 3 tháng'], ['Nợ quá hạn', '85,9 tỷ (212 xe)', '≤ 15% dư nợ', '≤ 10% dư nợ'], ['Nợ quá hạn trên 90 ngày', '36 tỷ (90 xe)', '0 từ 31/03/2027', '0 từ 31/01/2027']], [28, 24, 24, 24]),
  ...numbered(['Dừng giao xe mới cho đại lý có nợ trên 90 ngày đến khi trả xong; lập lịch trả từng xe trước 15/12/2026.', 'Hạn mức dư nợ mỗi đại lý = 2 tháng bán lẻ × giá xe; vượt hạn mức chỉ giao xe có khách cọc.', 'Họp S&OP ngày 5 hằng tháng: nhập CKD theo bán lẻ thực; hoãn nhập model thừa (IZ50M, JP120EXL, V65, IZ50M Plus).']),

  H1('VII. PHÂN BỔ CHỈ TIÊU XUỐNG BỘ PHẬN VÀ PHÒNG BAN'),
  H2('1. Bán lẻ theo vùng và theo quý'),
  table(['Vùng', 'Cam kết', 'KPI 100%', 'Q1', 'Q2', 'Q3', 'Q4'], regRows, [34, 11, 11, 11, 11, 11, 11], { totalLast: true, num: [1, 2, 3, 4, 5, 6] }),
  note('Q1–Q4 theo KPI 100%, chia theo mùa vụ ERP 2027. Vùng theo phân vùng TB 02/2026; gồm cả sản lượng điểm nâng cấp, điểm mới trong vùng.'),
  H2('2. Chỉ tiêu từng phòng ban'),
  table(['Phòng / bộ phận', 'Chỉ số chính', 'Cam kết', 'KPI 100%', 'Mốc kiểm tra'], [
    ['Kinh doanh xe (các vùng)', 'Bán lẻ; thị phần', '4.200 xe; 5,9%', '5.000 xe; 7,0%', 'Q1 1.052 · Q2 1.348 · Q3 1.215 · Q4 1.385 xe'],
    ['Phát triển đại lý', 'Số đại lý cấp 1', '30', '34', '31/03: 24 · 30/06: 30 · 31/08: 34'],
    ['Đào tạo', 'Tư vấn có hợp đồng, đạt chứng chỉ', '181', '231', '31/03: 176 · 30/06: 211 · 31/08: 231'],
    ['Dịch vụ', 'Lượt xe vào xưởng; tỷ lệ quay lại', '12.000; 40%', '22.000; 55%', 'Chấm theo quý'],
    ['Phụ tùng', 'Doanh thu; đáp ứng ngay', '25 tỷ; 85%', '45 tỷ; 92%', 'Chấm theo quý'],
    ['Marketing', 'Khách ghi nhận; xe có mã chiến dịch', '35.400; 383', '41.700; 600', 'Hằng tháng theo lịch sự kiện'],
    ['Chăm sóc khách hàng', 'Gọi khảo sát; mua lại; hài lòng', '90%; 6%; 8,0', '100%; 8%; 8,5', 'Hằng tháng'],
    ['Kế hoạch – Công nợ (S&OP)', 'Nợ quá hạn; tồn đại lý; sai số dự báo', '≤ 15%; ≤ 2,5 th; ≤ 20%', '≤ 10%; ≤ 2 th; ≤ 15%', 'Nợ trên 90 ngày = 0 từ 31/01'],
    ['Quản trị dữ liệu bán hàng (mới)', 'Tỷ lệ khớp kho – kế toán – bán hàng', '≥ 95%', '≥ 99%', 'Chốt số ngày 10 hằng tháng']], [22, 24, 16, 16, 22]),
  H2('3. Chỉ tiêu từng đại lý hiện có và phân bổ 100 tư vấn bán hàng'),
  table(['Đại lý', 'Tỉnh', 'Bán lẻ 12 tháng', 'Tư vấn hiện có', 'Cam kết 2027', 'KPI 2027', 'Tư vấn bổ sung', 'Tư vấn sau bổ sung'], dRows, [20, 14, 11, 10, 11, 11, 11, 12], { totalLast: true, num: [2, 3, 4, 5, 6, 7], zebra: true }),
  note('Chỉ tiêu chia theo tỷ trọng bán lẻ 12 tháng (11/2025–10/2026); khi giao chính thức điều chỉnh theo dư địa tỉnh và tồn, nợ của từng đại lý. 40 tư vấn còn lại của đợt bổ sung 100 người dành cho 13 điểm cấp 1 mới và nâng cấp (5 người/điểm ở Hà Nội, TP.HCM; 3 người/điểm ở tỉnh).'),

  H1('VIII. THẺ ĐIỂM KPI VÀ CƠ CHẾ THƯỞNG'),
  H2('1. Thẻ điểm khối (KPI của Phó Giám đốc Khối Kinh doanh)'),
  table(['Trụ', 'Chỉ số', 'Trọng số', 'Mục tiêu 100%'], [
    ['Doanh số bán xe (40%)', 'Bán lẻ toàn hệ thống so kế hoạch tháng', '25%', '5.000 xe/năm'], ['', 'Thị phần 5 phân khúc', '5%', '7,0%'], ['', 'Đại lý cấp 1 đúng lịch', '5%', '34 đại lý'], ['', 'Tư vấn đủ số, đạt chứng chỉ', '5%', '231 người, 100%'],
    ['Dòng tiền (25%)', 'Nợ quá hạn / dư nợ', '10%', '≤ 10%; trên 90 ngày = 0'], ['', 'Tồn đại lý', '10%', '≤ 2 tháng bán'], ['', 'Xe thanh toán đúng hạn (HĐMB 30 ngày, MBTB 95 ngày)', '5%', '≥ 90%'],
    ['Chất lượng dịch vụ (15%)', 'Điểm hài lòng sau mua, sau dịch vụ', '5%', '≥ 8,5/10'], ['', 'Xe quay lại xưởng ủy quyền', '5%', '≥ 55%'], ['', 'Phụ tùng đáp ứng ngay', '5%', '≥ 92%'],
    ['Lợi nhuận khối (20%)', 'Lợi nhuận gộp Khối Kinh doanh', '10%', 'Theo kế hoạch Tài chính giao'], ['', 'Chi phí bán hàng + thưởng / doanh thu xe', '5%', '≤ 1,5%'], ['', 'Doanh thu dịch vụ + phụ tùng', '5%', '100 tỷ']], [24, 44, 12, 20]),
  P('KPI từng bộ phận = 60% điểm thẻ điểm khối + 40% chỉ số riêng. **Trần theo bán lẻ xe áp cho mọi bộ phận:** bán lẻ dưới 75% → KPI tối đa 74%; 75% – dưới 85% → tối đa 85%; 85% – 100% → tối đa 100%. Phát sinh nợ mới quá 90 ngày → KPI tối đa 90%. Doanh số không đạt thì không bộ phận nào đạt KPI.', { before: 120, indent: true }),
  H2('2. Thưởng đại lý theo mức đạt bán lẻ (đồng/xe, gồm tháng, quý, năm)'),
  table(['Dòng xe', 'Dưới 75%', '75% – dưới 85%', '85% – 100%', 'Vượt 100%'], [['IZ', '0', '1.200.000', '2.500.000', '4.100.000 + 1.500.000/xe vượt'], ['MISSU (T26, T33L, V56, V65)', '0', '1.200.000', '2.300.000', '2.800.000 + 1.000.000/xe vượt'], ['JP120 (mới đưa vào)', '0', '1.500.000', '3.000.000', '3.000.000 + 2.000.000/xe vượt']], [24, 12, 18, 18, 28]),
  note('Kế thừa khung TB 03/2026 (IZ) và TB 009/2026 (MISSU). Điều kiện nhận: không nợ quá hạn trên 90 ngày, tồn ≤ 2,5 tháng bán, bán đúng vùng (TB 02/2026), hồ sơ đúng hạn; vi phạm hạ một bậc thưởng.'),
  H2('3. Thu nhập chính sách hằng tháng của Phó Giám đốc Khối Kinh doanh'),
  P('Thu nhập tháng gồm **65.000.000 đồng thực nhận cố định** (đã hoàn tất BHXH, thuế TNCN) và **quỹ KPI cơ sở 50.000.000 đồng tại mức KPI 85%**, tính tuyến tính **1.500.000 đồng cho mỗi 1 điểm %**:', { indent: true }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120 }, children: [r('Tiền KPI = 50.000.000 + 1.500.000 × (KPI − 85)', { b: true, size: 28, color: NAVY })] }),
  table(['Mã quy tắc', 'Nội dung'], [['KPI-R01', 'KPI từ 75% đến 130%: áp công thức trên'], ['KPI-R02', 'KPI dưới 75%: tiền KPI = 0'], ['KPI-R03', 'KPI trên 130%: tính như 130% (117.500.000)'], ['KPI-R04', 'Trần theo bán lẻ xe: dưới 75% → 74%; 75% – dưới 85% → 85%; 85% – 100% → 100%'], ['KPI-R05', 'Trần dòng tiền: phát sinh nợ mới quá 90 ngày → 90%'], ['KPI-R06', 'Làm tròn KPI 1 chữ số thập phân; tiền đến 1.000 đồng'], ['KPI-R07', '65.000.000 thực nhận cố định luôn chi đủ']], [18, 82]),
  table(['KPI dùng để trả', 'Tiền KPI', 'Tổng thực nhận tháng'], [['Dưới 75%', '0', '65.000.000'], ['75%', '35.000.000', '100.000.000'], ['80%', '42.500.000', '107.500.000'], ['85% (cơ sở)', '50.000.000', '115.000.000'], ['90%', '57.500.000', '122.500.000'], ['100%', '72.500.000', '137.500.000'], ['110%', '87.500.000', '152.500.000'], ['120%', '102.500.000', '167.500.000'], ['130% trở lên', '117.500.000', '182.500.000']], [34, 33, 33], { num: [1, 2] }),
  P('**Ví dụ tháng 4/2027:** kế hoạch 453 xe, thực hiện giả định 420 xe (92,7%); điểm 4 trụ: doanh số 37,3 + dòng tiền 21,5 + chất lượng dịch vụ 14,2 + lợi nhuận 19,4 = **92,4%**; trần 100% không chặn → tiền KPI = 50.000.000 + 1.500.000 × 7,4 = 61.100.000 đồng; tổng tháng = **126.100.000 đồng**. Nếu cùng tháng bán lẻ chỉ 70% thì KPI bị chặn ở 74% → tiền KPI = 0, tổng tháng 65.000.000 đồng.', { before: 120, indent: true }),
  P('**Quyết toán quý:** chấm lại cả thẻ điểm trên số lũy kế quý (không lấy trung bình 3 tháng); quyết toán cao hơn số đã chi thì chi bổ sung, thấp hơn thì không truy thu. **Áp cho bộ phận:** Tiền KPI bộ phận = Quỹ cơ sở × [1 + 0,03 × (KPI − 85)], cùng các quy tắc KPI-R02 đến R06.', { indent: true }),

  H1('IX. NGÂN SÁCH VÀ QUẢN TRỊ RỦI RO'),
  table(['Hạng mục (triệu đồng)', 'Cam kết', 'KPI 100%', 'Cơ sở'], [['Marketing offline và kênh số', '2.622', '4.200', 'File chiến dịch MKT 2027'], ['Phát triển đại lý cấp 1', '1.625', '2.625', '250 triệu/điểm mở mới, 125 triệu/điểm nâng cấp'], ['Xe dịch vụ lưu động', '1.600', '3.200', '4 / 8 xe × 400 triệu'], ['Hỗ trợ xả xe tồn trên 180 ngày', '1.600', '1.600', '107 xe × 15 triệu, có thời hạn'], ['Tổng đài CSKH, Zalo OA', '900', '1.400', '3 / 5 nhân sự, công cụ'], ['Đào tạo', '600', '1.000', 'Giảng viên nội bộ, học trực tuyến'], ['Cộng', '8.947', '14.025', '']], [36, 14, 14, 36], { totalLast: true, num: [1, 2] }),
  note('Chưa gồm: chi phí số hóa (Phòng CNTT lập dự toán), tồn kho phụ tùng ban đầu (Phòng Dịch vụ lập), thưởng đại lý theo mục VIII. Cam kết tính 4 điểm mới và 5 điểm nâng cấp.'),
  table(['Rủi ro', 'Ảnh hưởng', 'Phương án'], [['Thị trường giảm 5%', '5.000 xe cần 7,35% thị phần', 'Giữ mức cam kết; đẩy đội xe doanh nghiệp, khách cũ'], ['Đối thủ giảm giá sâu (JAC 5–20 triệu, Teraco 5–10 triệu/tháng)', 'Mất lợi thế giá', 'Ưu đãi tổng chi phí sở hữu, không đua giảm tiền mặt'], ['Đại lý không trả nợ quá hạn', 'Vốn DAC bị chôn', 'Dừng giao xe, thu hồi xe, tìm đối tác thay thế'], ['Cung ứng sai cơ cấu model, thùng', 'Tồn tăng, thiếu xe bán chạy', 'S&OP tháng, nhập theo bán lẻ thực'], ['Điểm mới mở chậm, chủ đầu tư không đạt chuẩn', 'Thiếu 182–318 xe', 'Phương án dự phòng, hỗ trợ 6 tháng đầu']], [30, 26, 44]),

  brk(), H1('X. PHƯƠNG THỨC TRIỂN KHAI VÀ HIỆU LỰC'),
  ...numbered([
    '**Hiệu lực:** kế hoạch có hiệu lực kể từ ngày Ban Tổng Giám đốc phê duyệt, áp dụng cho kỳ 01/01/2027 – 31/12/2027. Hai điều kiện tiên quyết và các việc xử lý tồn kho, công nợ được triển khai ngay từ 01/12/2026.',
    '**Ban hành và giao chỉ tiêu:** trong 10 ngày làm việc sau phê duyệt, Khối Kinh doanh ban hành quyết định giao chỉ tiêu tới từng phòng, vùng; ký kế hoạch bán lẻ với từng đại lý trước 15/01/2027; ban hành thông báo chính sách đại lý 2027 thay TB 03 và TB 009/2026 trước 31/12/2026.',
    '**Nhịp điều hành:** báo cáo tuần sáng thứ Hai; họp S&OP ngày 5 hằng tháng; chốt số liệu ngày 10 hằng tháng; chấm KPI tháng; rà soát quý trong 10 ngày đầu quý sau; đánh giá giữa năm 15/07/2027.',
    '**Trách nhiệm:** Phó Giám đốc Khối Kinh doanh chịu trách nhiệm chung; trưởng các phòng chịu trách nhiệm chỉ tiêu được giao tại mục VII; Phòng Tài chính – Kế toán, Nhân sự, CNTT phối hợp theo điều kiện tiên quyết.',
    '**Điều chỉnh:** mọi thay đổi chỉ tiêu, chính sách, ngân sách phải bằng văn bản và được Ban Tổng Giám đốc phê duyệt; số liệu nền đã khóa không sửa trong năm.',
    '**Bảo mật:** tài liệu lưu hành nội bộ; dữ liệu khách hàng xử lý theo quy định bảo vệ dữ liệu cá nhân.']),
  new Paragraph({ spacing: { before: 240, after: 0 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 200 }, children: [r('…………, ngày …… tháng …… năm 2026', { i: true })] }),
  new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [4535, 4535], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [['NGƯỜI LẬP KẾ HOẠCH', 'PHÓ GIÁM ĐỐC PHỤ TRÁCH|KHỐI KINH DOANH', 'Phạm Văn Duy'], ['PHÊ DUYỆT', 'PHÓ TỔNG GIÁM ĐỐC|THƯỜNG TRỰC', 'Huỳnh Cao Minh']].map(([a, b, n]) => new TableCell({ width: { size: 4535, type: WidthType.DXA },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r(a, { b: true })] }), ...b.split('|').map(x => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r(x, { b: true, size: 22 })] })),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1400 }, children: [r('(Ký, ghi rõ họ tên)', { i: true, size: 22 })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [r(n, { b: true })] })] })) })] }),
  new Paragraph({ spacing: { before: 400, after: 60 }, children: [r('Nơi nhận:', { b: true, i: true, size: 22 })] }),
  ...['Ban Tổng Giám đốc DAC (để phê duyệt);', 'Các phòng thuộc Khối Kinh doanh (để thực hiện);', 'Phòng Tài chính – Kế toán, Phòng Nhân sự, Phòng CNTT/ERP (để phối hợp);', 'Lưu: Khối Kinh doanh.'].map(s => new Paragraph({ spacing: { after: 0 }, children: [r('– ' + s, { size: 22 })] }))
];

const doc = new Document({
  creator: 'Khối Kinh doanh DAC', title: 'Kế hoạch phát triển Khối Kinh doanh DAC 2027',
  styles: { default: { document: { run: { font: FONT, size: 26 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 30, bold: true, color: NAVY }, paragraph: { spacing: { before: 360, after: 160 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 27, bold: true, color: NAVY }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, bold: true, italics: true }, paragraph: { spacing: { before: 200, after: 100 }, keepNext: true, outlineLevel: 2 } }] },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } }] },
    ...Array.from({ length: 20 }, (_, i) => ({ reference: 'num' + i, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 340 } } } }] }))] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } }, children: cover },
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 }, pageNumbers: { start: 1 } } },
      headers: { default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } }, tabStops: [{ type: TabStopType.RIGHT, position: W }],
        children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(DIR, 'logo.png')), transformation: { width: 40, height: 32 } }), r('   Kế hoạch phát triển Khối Kinh doanh DAC năm 2027', { size: 18, color: '555555' }), r('\tLưu hành nội bộ', { size: 18, i: true, color: '555555' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ font: FONT, size: 18, children: ['Trang ', PageNumber.CURRENT] })] })] }) },
      children: [...toc, ...body] }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(path.join(DIR, 'KeHoach_PhatTrien_KhoiKinhDoanh_DAC_2027.docx'), b); console.log('ok', b.length); });
