(function () {
  if (window.__inventoryHistoryDetailsInstalled) return;
  window.__inventoryHistoryDetailsInstalled = true;

  function getDetails() {
    try {
      return JSON.parse(localStorage.getItem('pargas_inventory_document_details') || '[]');
    } catch (_) {
      return [];
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function typeTitle(type) {
    var map = { 1: 'رسید ورود', 2: 'رسید خروج', 3: 'فاکتور خرید', 4: 'اصلاح افزایشی', 5: 'اصلاح کاهشی', 6: 'انبارگردانی افزایشی', 8: 'انبارگردانی کاهشی' };
    return map[Number(type)] || type || '-';
  }

  function showDetail(docNumber) {
    var detail = getDetails().find(function (item) { return String(item.DocumentNumber) === String(docNumber); });
    if (!detail) {
      if (window.pargasToast) window.pargasToast.info('جزئیات این سند در حافظه مرورگر موجود نیست. اسناد جدید از این به بعد ذخیره می‌شوند.');
      return;
    }

    var rows = (detail.Items || []).map(function (item) {
      return '<tr><td>' + escapeHtml(item.GoodsId) + '</td><td>' + escapeHtml(item.Quantity) + '</td><td>' + escapeHtml(Number(item.UnitPrice || 0).toLocaleString()) + '</td><td>' + escapeHtml(item.Description || '') + '</td></tr>';
    }).join('');

    var overlay = document.createElement('div');
    overlay.className = 'inventory-history-detail-overlay';
    overlay.innerHTML = '<div class="inventory-history-detail-modal">' +
      '<button type="button" class="inventory-history-detail-close">×</button>' +
      '<h3>جزئیات سند ' + escapeHtml(detail.DocumentNumber) + '</h3>' +
      '<div class="inventory-history-detail-meta">' +
      '<span>نوع: ' + escapeHtml(typeTitle(detail.DocumentType)) + '</span>' +
      '<span>تاریخ: ' + escapeHtml(detail.DocumentDate || '-') + '</span>' +
      '<span>شخص/تأمین‌کننده: ' + escapeHtml(detail.PersonTitle || '-') + '</span>' +
      '</div>' +
      '<p>' + escapeHtml(detail.Description || '') + '</p>' +
      '<table><thead><tr><th>کالا</th><th>تعداد</th><th>قیمت</th><th>شرح</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.querySelector('.inventory-history-detail-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.remove(); });
  }

  function enhanceHistoryRows() {
    var historyTitle = Array.prototype.slice.call(document.querySelectorAll('.inventory-tab h3')).find(function (h) { return (h.textContent || '').indexOf('سابقه') >= 0; });
    if (!historyTitle) return;
    var card = historyTitle.closest('.inv-card');
    if (!card) return;
    var rows = Array.prototype.slice.call(card.querySelectorAll('tbody tr'));
    rows.forEach(function (tr) {
      if (tr.dataset.historyDetailEnhanced === '1') return;
      var cells = tr.querySelectorAll('td');
      if (cells.length < 4) return;
      var docNumber = (cells[3].textContent || '').trim();
      var td = document.createElement('td');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inventory-history-detail-btn';
      btn.textContent = 'جزئیات';
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        showDetail(docNumber);
      });
      td.appendChild(btn);
      tr.appendChild(td);
      tr.dataset.historyDetailEnhanced = '1';
    });

    var header = card.querySelector('thead tr');
    if (header && !header.dataset.historyDetailHeaderEnhanced) {
      var th = document.createElement('th');
      th.textContent = 'جزئیات';
      header.appendChild(th);
      header.dataset.historyDetailHeaderEnhanced = '1';
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      enhanceHistoryRows();
    }, 120);
  }

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('pargas-inventory-document-detail-saved', schedule);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
})();
