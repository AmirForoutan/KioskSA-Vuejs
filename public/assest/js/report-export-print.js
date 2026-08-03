(function () {
  if (window.__pargasReportExportPrintInstalled) return;
  window.__pargasReportExportPrintInstalled = true;

  var toolbarClass = 'pargas-report-toolbar';
  var legacyButtonTexts = ['خروجی اکسل/CSV', 'چاپ A4', 'چاپ A5', 'چاپ فیش ۷ سانت'];

  function normalizeText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeFileName(value) {
    return normalizeText(value || 'report')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 90) || 'report';
  }

  function todayFa() {
    try {
      var parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      var year = (parts.find(function (p) { return p.type === 'year'; }) || {}).value || '';
      var month = (parts.find(function (p) { return p.type === 'month'; }) || {}).value || '';
      var day = (parts.find(function (p) { return p.type === 'day'; }) || {}).value || '';
      return year + '/' + month + '/' + day;
    } catch (_) {
      return new Date().toLocaleDateString('fa-IR-u-nu-latn');
    }
  }

  function getElementText(element) {
    if (!element) return '';
    var input = element.querySelector('input, textarea, select');
    if (input) {
      if (input.tagName === 'SELECT') {
        var selected = input.options && input.selectedIndex >= 0 ? input.options[input.selectedIndex] : null;
        return normalizeText(selected ? selected.textContent : input.value);
      }
      if (input.type === 'checkbox') return input.checked ? 'بله' : 'خیر';
      return normalizeText(input.value);
    }
    return normalizeText(element.textContent || '');
  }

  function getTableRows(table) {
    var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead tr:last-child th'));
    if (!headerCells.length) headerCells = Array.prototype.slice.call(table.querySelectorAll('tr:first-child th, tr:first-child td'));
    var headers = headerCells.map(getElementText).filter(function (value) { return value !== ''; });

    var bodyRows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    if (!bodyRows.length) bodyRows = Array.prototype.slice.call(table.querySelectorAll('tr')).slice(1);

    var rows = bodyRows.map(function (tr) {
      return Array.prototype.slice.call(tr.children).map(getElementText);
    }).filter(function (row) {
      return row.some(function (cell) { return normalizeText(cell) !== ''; });
    });

    return { headers: headers, rows: rows };
  }

  function findClosestReportContainer(table) {
    return table.closest('.inv-card, .card, .m-shell, section') || table.parentElement || document.body;
  }

  function findReportTitle(table) {
    var container = findClosestReportContainer(table);
    var previous = table;
    while (previous && previous !== container) {
      previous = previous.previousElementSibling;
      if (previous && /^H[1-6]$/i.test(previous.tagName || '')) return normalizeText(previous.textContent);
    }

    var headings = Array.prototype.slice.call(container.querySelectorAll('h1,h2,h3,h4'));
    if (headings.length) return normalizeText(headings[headings.length - 1].textContent);

    var section = table.closest('.inventory-tab') ? 'گزارش انبار' : table.closest('.analysis-tab') ? 'گزارش آنالیز کالا' : 'گزارش';
    return section;
  }

  function isExcludedTable(table) {
    var title = findReportTitle(table);
    var container = findClosestReportContainer(table);
    var containerText = normalizeText(container.textContent || '');

    if (title.indexOf('ثبت سند انبار') >= 0) return true;
    if (title.indexOf('تنظیمات انبار') >= 0) return true;
    if (title.indexOf('تعریف انبار') >= 0) return true;
    if (containerText.indexOf('ذخیره انبار') >= 0 && containerText.indexOf('کد انبار') >= 0 && title.indexOf('تعریف انبار') >= 0) return true;
    return false;
  }

  function labelForControl(control) {
    var label = control.closest('label');
    if (label) {
      var clone = label.cloneNode(true);
      Array.prototype.slice.call(clone.querySelectorAll('input,select,textarea')).forEach(function (el) { el.remove(); });
      var text = normalizeText(clone.textContent);
      if (text) return text;
    }

    if (control.placeholder) return control.placeholder;
    if (control.previousElementSibling) {
      var previousText = normalizeText(control.previousElementSibling.textContent);
      if (previousText && previousText.length < 80) return previousText;
    }
    return control.name || control.id || '';
  }

  function valueForControl(control) {
    if (control.tagName === 'SELECT') {
      var selected = control.options && control.selectedIndex >= 0 ? control.options[control.selectedIndex] : null;
      return normalizeText(selected ? selected.textContent : control.value);
    }
    if (control.type === 'checkbox') return control.checked ? 'بله' : 'خیر';
    return normalizeText(control.value);
  }

  function collectMeta(table) {
    var container = findClosestReportContainer(table);
    var tab = table.closest('.inventory-tab, .analysis-tab') || container;
    var meta = [];

    meta.push(['تاریخ چاپ', todayFa()]);

    Array.prototype.slice.call(container.querySelectorAll('input, select, textarea')).forEach(function (control) {
      var label = labelForControl(control);
      var value = valueForControl(control);
      if (!label || !value) return;
      if (label.indexOf('جستجو') >= 0) return;
      if (label.indexOf('انتخاب کالا') >= 0 && value === 'انتخاب کالا') return;
      meta.push([label, value]);
    });

    var globalFilter = tab.querySelector('.stocktaking-filter, .inv-form-grid');
    if (globalFilter && !container.contains(globalFilter)) {
      Array.prototype.slice.call(globalFilter.querySelectorAll('input, select, textarea')).forEach(function (control) {
        var label = labelForControl(control);
        var value = valueForControl(control);
        if (label && value) meta.push([label, value]);
      });
    }

    var seen = {};
    return meta.filter(function (item) {
      var key = item[0] + ':' + item[1];
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function metaHtml(meta) {
    if (!meta.length) return '';
    return '<div class="report-meta">' + meta.map(function (item) {
      return '<span><b>' + escapeHtml(item[0]) + ':</b> ' + escapeHtml(item[1]) + '</span>';
    }).join('') + '</div>';
  }

  function tableHtml(headers, rows) {
    var headerHtml = headers.length
      ? '<thead><tr>' + headers.map(function (h) { return '<th>' + escapeHtml(h) + '</th>'; }).join('') + '</tr></thead>'
      : '';
    var bodyHtml = '<tbody>' + rows.map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + escapeHtml(cell) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody>';
    return '<table>' + headerHtml + bodyHtml + '</table>';
  }

  function exportExcel(table) {
    var title = findReportTitle(table);
    var data = getTableRows(table);
    var meta = collectMeta(table);
    var metaRows = meta.map(function (item) {
      return '<tr><td colspan="' + Math.max(data.headers.length, 1) + '"><b>' + escapeHtml(item[0]) + ':</b> ' + escapeHtml(item[1]) + '</td></tr>';
    }).join('');

    var html = '<html><head><meta charset="UTF-8" /></head><body dir="rtl">' +
      '<h2>' + escapeHtml(title) + '</h2>' +
      '<table>' + metaRows + '</table>' +
      tableHtml(data.headers, data.rows) +
      '</body></html>';

    var blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = sanitizeFileName(title) + '.xls';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(function () {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 100);
  }

  function printReport(table, mode) {
    var title = findReportTitle(table);
    var data = getTableRows(table);
    var meta = collectMeta(table);
    var isReceipt = mode === 'receipt';
    var pageSize = isReceipt ? '70mm auto' : mode === 'a5' ? 'A5 landscape' : 'A4 landscape';
    var bodyClass = isReceipt ? 'receipt' : 'paper';
    var fontSize = isReceipt ? '7.4px' : mode === 'a5' ? '10px' : '11px';
    var windowWidth = isReceipt ? 320 : 1000;
    var windowHeight = isReceipt ? 700 : 800;

    var win = window.open('', '_blank', 'width=' + windowWidth + ',height=' + windowHeight);
    if (!win) return;

    win.document.write('<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8" />' +
      '<title>' + escapeHtml(title) + '</title>' +
      '<style>' +
      '*{box-sizing:border-box;}' +
      '@page{size:' + pageSize + ';margin:' + (isReceipt ? '0' : '9mm') + ';}' +
      'html,body{margin:0;padding:0;direction:rtl;}' +
      'body{font-family:Tahoma,Arial,sans-serif;color:#111827;font-size:' + fontSize + ';line-height:' + (isReceipt ? '1.25' : '1.45') + ';}' +
      '.paper{padding:8px;}' +
      '.receipt{width:70mm;max-width:70mm;min-width:70mm;margin:0;padding:1.5mm;overflow:hidden;}' +
      'h2{margin:0 0 ' + (isReceipt ? '3px' : '8px') + ';text-align:center;font-size:' + (isReceipt ? '10px' : '18px') + ';line-height:1.35;}' +
      '.report-meta{display:flex;flex-wrap:wrap;gap:5px 12px;justify-content:center;margin:0 0 10px;color:#374151;line-height:1.7;}' +
      '.receipt .report-meta{display:block;text-align:right;font-size:7px;line-height:1.45;margin:0 0 4px;}' +
      '.receipt .report-meta span{display:block;white-space:normal;margin-bottom:1px;}' +
      '.report-meta span{white-space:nowrap;}' +
      'table{width:100%;border-collapse:collapse;}' +
      '.paper table{table-layout:auto;}' +
      '.receipt table{width:100%;max-width:100%;table-layout:fixed;font-size:6.6px;}' +
      'th,td{border:1px solid #d1d5db;padding:' + (isReceipt ? '1.4px 1px' : '5px') + ';text-align:right;vertical-align:top;}' +
      'th{background:#f3f4f6;font-weight:700;}' +
      '.receipt th,.receipt td{border-left:0;border-right:0;border-top:0;border-bottom:1px dashed #9ca3af;word-break:break-word;overflow-wrap:anywhere;white-space:normal;}' +
      '.receipt th{font-size:6.4px;background:transparent;}' +
      '.receipt td{font-size:6.4px;}' +
      '@media print{.receipt{width:70mm;max-width:70mm;min-width:70mm;}.paper{padding:0;}}' +
      '</style></head><body class="' + bodyClass + '">' +
      '<h2>' + escapeHtml(title) + '</h2>' +
      metaHtml(meta) +
      tableHtml(data.headers, data.rows) +
      '</body></html>');
    win.document.close();
    window.setTimeout(function () {
      win.focus();
      win.print();
    }, 250);
  }

  function makeButton(text, onClick) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  function hideLegacyButtons(container) {
    Array.prototype.slice.call(container.querySelectorAll('button')).forEach(function (button) {
      var text = normalizeText(button.textContent);
      if (legacyButtonTexts.indexOf(text) >= 0) button.style.display = 'none';
    });
  }

  function installToolbarForTable(table) {
    if (!table || table.dataset.reportExportInstalled === '1') return;
    if (!table.closest('.inventory-tab, .analysis-tab')) return;
    if (isExcludedTable(table)) return;

    var rows = getTableRows(table);
    if (!rows.rows.length) return;

    var wrap = table.closest('.inv-table-wrap, .table-wrap') || table.parentElement;
    if (!wrap) return;

    table.dataset.reportExportInstalled = '1';
    hideLegacyButtons(findClosestReportContainer(table));

    var toolbar = document.createElement('div');
    toolbar.className = toolbarClass;
    toolbar.appendChild(makeButton('خروجی اکسل', function () { exportExcel(table); }));
    toolbar.appendChild(makeButton('چاپ A4', function () { printReport(table, 'a4'); }));
    toolbar.appendChild(makeButton('چاپ A5', function () { printReport(table, 'a5'); }));
    toolbar.appendChild(makeButton('چاپ فیش پرینتری', function () { printReport(table, 'receipt'); }));
    wrap.insertAdjacentElement('beforebegin', toolbar);
  }

  function installStyle() {
    if (document.getElementById('pargas-report-export-print-style')) return;
    var style = document.createElement('style');
    style.id = 'pargas-report-export-print-style';
    style.textContent = '.' + toolbarClass + '{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 8px;align-items:center}' +
      '.' + toolbarClass + ' button{min-height:36px;border-radius:999px;padding:7px 12px;border:1px solid rgba(45,212,191,.35);background:rgba(20,184,166,.14);color:#ccfbf1;cursor:pointer;font-weight:850}' +
      '.' + toolbarClass + ' button:hover{background:rgba(20,184,166,.24);border-color:rgba(45,212,191,.55)}';
    document.head.appendChild(style);
  }

  function scan() {
    installStyle();
    Array.prototype.slice.call(document.querySelectorAll('.inventory-tab table, .analysis-tab table')).forEach(installToolbarForTable);
  }

  var scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      scan();
    }, 160);
  }

  var observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleScan);
  else scheduleScan();
})();
