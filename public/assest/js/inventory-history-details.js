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

  async function getConfiguredApiBase() {
    var response = await fetch('./config.json', { cache: 'no-store' });
    var config = await response.json();
    return config.ServiceAPIAddress || config.ServiceAddress || '';
  }

  function buildInventoryBase(serviceUrl) {
    try {
      var url = new URL(serviceUrl, window.location.href);
      var port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
      url.port = String(port + 1);
      url.pathname = '/inventory';
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch (_) {
      return String(serviceUrl).replace(/:(\d+)(\/?$)/, function (_match, port) {
        return ':' + (Number(port) + 1) + '/inventory';
      }).replace(/\/$/, '');
    }
  }

  function normalizeKardexRow(row) {
    return {
      DocumentNumber: row.DocumentNumber || row.documentNumber || '',
      DocumentType: Number(row.DocumentType || row.documentType || 0),
      DocumentDate: row.DocumentDate || row.documentDate || '',
      WarehouseTitle: row.WarehouseTitle || row.warehouseTitle || '',
      GoodsId: Number(row.GoodsId || row.goodsId || 0),
      GoodsName: row.GoodsName || row.goodsName || '',
      InQuantity: Number(row.InQuantity || row.inQuantity || 0),
      OutQuantity: Number(row.OutQuantity || row.outQuantity || 0),
      BalanceAfter: Number(row.BalanceAfter || row.balanceAfter || 0),
      UnitPrice: Number(row.UnitPrice || row.unitPrice || 0),
      Amount: Number(row.Amount || row.amount || 0),
      Description: row.Description || row.description || ''
    };
  }

  function saveFetchedDetail(detail) {
    try {
      var key = 'pargas_inventory_document_details';
      var list = getDetails().filter(function (item) { return String(item.DocumentNumber) !== String(detail.DocumentNumber); });
      list.unshift(detail);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 300)));
    } catch (_) { }
  }

  async function fetchDetailFromKardex(docNumber) {
    var serviceUrl = await getConfiguredApiBase();
    var base = buildInventoryBase(serviceUrl);
    var bootstrapResponse = await fetch(base + '/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: '{}'
    });
    var bootstrap = await bootstrapResponse.json();
    var fiscalYears = Array.isArray(bootstrap.fiscalYears) ? bootstrap.fiscalYears : [];
    if (!fiscalYears.length) fiscalYears = [{ FiscalYearId: 0 }];

    for (var i = 0; i < Math.min(fiscalYears.length, 4); i++) {
      var fy = fiscalYears[i];
      var response = await fetch(base + '/report/kardex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ FiscalYearId: Number(fy.FiscalYearId || fy.fiscalYearId || 0), WarehouseId: 0, GoodsId: 0, FromDate: '', ToDate: '' })
      });
      var result = await response.json();
      var rows = (result.rows || result.Rows || []).map(normalizeKardexRow).filter(function (row) {
        return String(row.DocumentNumber).trim() === String(docNumber).trim();
      });
      if (rows.length) {
        var first = rows[0];
        var detail = {
          DocumentNumber: first.DocumentNumber,
          DocumentId: 0,
          DocumentDate: first.DocumentDate,
          DocumentType: first.DocumentType,
          WarehouseTitle: first.WarehouseTitle,
          PersonTitle: '',
          Description: 'جزئیات از کاردکس انبار خوانده شد',
          Items: rows.map(function (row) {
            return {
              GoodsId: row.GoodsId,
              GoodsName: row.GoodsName,
              Quantity: row.InQuantity > 0 ? row.InQuantity : row.OutQuantity,
              Direction: row.InQuantity > 0 ? 'ورود' : 'خروج',
              UnitPrice: row.UnitPrice,
              Description: row.Description,
              BalanceAfter: row.BalanceAfter
            };
          }),
          SavedAt: new Date().toISOString()
        };
        saveFetchedDetail(detail);
        return detail;
      }
    }

    return null;
  }

  function renderDetail(detail) {
    var rows = (detail.Items || []).map(function (item) {
      return '<tr><td>' + escapeHtml(item.GoodsName || item.GoodsId) + '</td><td>' + escapeHtml(item.Direction || '-') + '</td><td>' + escapeHtml(item.Quantity) + '</td><td>' + escapeHtml(Number(item.UnitPrice || 0).toLocaleString()) + '</td><td>' + escapeHtml(item.BalanceAfter == null ? '-' : item.BalanceAfter) + '</td><td>' + escapeHtml(item.Description || '') + '</td></tr>';
    }).join('');

    var overlay = document.createElement('div');
    overlay.className = 'inventory-history-detail-overlay';
    overlay.innerHTML = '<div class="inventory-history-detail-modal">' +
      '<button type="button" class="inventory-history-detail-close">×</button>' +
      '<h3>جزئیات سند ' + escapeHtml(detail.DocumentNumber) + '</h3>' +
      '<div class="inventory-history-detail-meta">' +
      '<span>نوع: ' + escapeHtml(typeTitle(detail.DocumentType)) + '</span>' +
      '<span>تاریخ: ' + escapeHtml(detail.DocumentDate || '-') + '</span>' +
      '<span>انبار: ' + escapeHtml(detail.WarehouseTitle || detail.WarehouseId || '-') + '</span>' +
      '</div>' +
      '<p>' + escapeHtml(detail.Description || '') + '</p>' +
      '<table><thead><tr><th>کالا</th><th>جهت</th><th>تعداد</th><th>قیمت</th><th>مانده بعد سند</th><th>شرح</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.querySelector('.inventory-history-detail-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.remove(); });
  }

  async function showDetail(docNumber) {
    var detail = getDetails().find(function (item) { return String(item.DocumentNumber) === String(docNumber); });
    if (!detail) {
      if (window.pargasToast && window.pargasToast.info) window.pargasToast.info('در حال دریافت جزئیات سند از کاردکس...');
      try {
        detail = await fetchDetailFromKardex(docNumber);
      } catch (error) {
        console.error('خطا در دریافت جزئیات سابقه انبار:', error);
      }
    }

    if (!detail) {
      if (window.pargasToast && window.pargasToast.error) window.pargasToast.error('جزئیات این سند از کاردکس هم پیدا نشد. یک بار بازسازی موجودی یا بروزرسانی سابقه را بزنید.');
      return;
    }

    renderDetail(detail);
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
