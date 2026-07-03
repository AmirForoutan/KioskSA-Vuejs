export function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: unknown) {
  return Math.round(money(value)).toLocaleString("fa-IR");
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function reportRange(from: string, to: string) {
  const f = from?.trim();
  const t = to?.trim();
  if (f && t) return `${f} تا ${t}`;
  if (f) return `از ${f}`;
  if (t) return `تا ${t}`;
  return "همه بازه";
}

export function pairRow(label: string, value: unknown) {
  return `<div class="pair"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
}

export function moneyPair(label: string, value: unknown) {
  return pairRow(label, formatMoney(value));
}

export function printReceipt(title: string, rangeLabel: string, bodyHtml: string) {
  const win = window.open("", "_blank", "width=330,height=720");
  if (!win) {
    window.print();
    return;
  }

  win.document.open();
  win.document.write(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: 70mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body {
    width: 70mm;
    margin: 0 auto;
    padding: 2mm;
    color: #000;
    background: #fff;
    direction: rtl;
    font-family: Tahoma, Arial, sans-serif;
    font-size: 10px;
    line-height: 1.55;
  }
  h1 { margin: 0 0 4px; text-align: center; font-size: 13px; font-weight: 900; }
  .meta { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 6px; }
  .section { margin: 6px 0; padding-top: 5px; border-top: 1px dashed #000; }
  .section-title { margin-bottom: 4px; font-size: 11px; font-weight: 900; text-align: center; }
  .pair { display: flex; justify-content: space-between; gap: 6px; padding: 2px 0; border-bottom: 1px dotted #999; }
  .pair b { font-weight: 900; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { padding: 2px 1px; border-bottom: 1px dotted #999; vertical-align: top; }
  th { font-weight: 900; text-align: right; }
  .num { text-align: left; white-space: nowrap; }
  .center { text-align: center; }
  .footer { margin-top: 8px; padding-top: 5px; border-top: 1px dashed #000; text-align: center; font-size: 9px; }
  @media print { body { width: 70mm; } }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">بازه گزارش: ${escapeHtml(rangeLabel)}<br/>زمان چاپ: ${escapeHtml(new Date().toLocaleString("fa-IR"))}</div>
  ${bodyHtml}
  <div class="footer">گزارش چاپی سیستم فروش</div>
<script>
  window.onload = function () { setTimeout(function () { window.print(); }, 250); };
<\/script>
</body>
</html>`);
  win.document.close();
  win.focus();
}
