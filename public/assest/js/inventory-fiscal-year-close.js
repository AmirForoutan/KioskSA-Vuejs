(function () {
  if (window.__inventoryFiscalYearCloseInstalled) return;
  window.__inventoryFiscalYearCloseInstalled = true;

  function toast(type, message) {
    if (window.pargasToast && window.pargasToast[type]) window.pargasToast[type](message);
    else alert(message);
  }

  function getPermissions() {
    try {
      var user = JSON.parse(sessionStorage.getItem('desktop-auth-user') || 'null');
      return Array.isArray(user && user.permissions) ? user.permissions : [];
    } catch (_) {
      return [];
    }
  }

  function canManageFiscalYears() {
    var perms = getPermissions();
    return perms.indexOf('manage.inventory') >= 0 || perms.indexOf('manage.inventory.settings') >= 0 || perms.indexOf('manage.inventory.fiscalYears') >= 0;
  }

  async function readConfig() {
    var response = await fetch('./config.json', { cache: 'no-store' });
    return await response.json();
  }

  function buildBase(serviceUrl, offset, path) {
    try {
      var url = new URL(serviceUrl, window.location.href);
      var port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
      url.port = String(port + offset);
      url.pathname = path;
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch (_) {
      return String(serviceUrl).replace(/:(\d+)(\/?$)/, function (_match, port) {
        return ':' + (Number(port) + offset) + path;
      }).replace(/\/$/, '');
    }
  }

  async function getBases() {
    var config = await readConfig();
    var service = config.ServiceAPIAddress || config.ServiceAddress || config.apiAddress || '';
    return {
      inventory: buildBase(service, 1, '/inventory'),
      analysis: buildBase(service, 2, '/inventory-analysis')
    };
  }

  function currentPersianYear() {
    try {
      return Number(new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(new Date()).replace(/[^0-9]/g, ''));
    } catch (_) {
      return 0;
    }
  }

  function dateYear(value) {
    var n = Number(String(value || '').split('/')[0]);
    return Number.isFinite(n) ? n : 0;
  }

  function yesNo(value) {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function loadFiscalYears() {
    var bases = await getBases();
    var response = await fetch(bases.inventory + '/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: '{}'
    });
    var result = await response.json();
    return {
      bases: bases,
      fiscalYears: Array.isArray(result.fiscalYears) ? result.fiscalYears : [],
      haveStockLicense: result.haveStockLicense === true
    };
  }

  async function closeFiscalYear(fiscalYearId) {
    var bases = await getBases();
    var auth = null;
    try { auth = JSON.parse(sessionStorage.getItem('desktop-auth-user') || 'null'); } catch (_) { }
    var response = await fetch(bases.analysis + '/fiscal-year/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ FiscalYearId: Number(fiscalYearId), Username: auth && auth.username ? auth.username : 'Desktop' })
    });
    var result = await response.json();
    if (!result.status) throw new Error(result.message || 'خطا در بستن دوره مالی');
    return result;
  }

  function findFiscalYearsCard() {
    var inventory = document.querySelector('.inventory-tab');
    if (!inventory) return null;
    var fiscalTitle = Array.prototype.slice.call(inventory.querySelectorAll('h3')).find(function (h) {
      return (h.textContent || '').indexOf('دوره‌های مالی') >= 0 || (h.textContent || '').indexOf('دوره مالی') >= 0;
    });
    return fiscalTitle ? fiscalTitle.closest('.inv-card') : null;
  }

  async function renderFiscalCloseCard() {
    if (!canManageFiscalYears()) return;
    var fiscalCard = findFiscalYearsCard();
    if (!fiscalCard) return;

    var existing = document.querySelector('.inventory-fiscal-close-card');
    if (existing) return;

    var card = document.createElement('div');
    card.className = 'inv-card wide inventory-fiscal-close-card';
    card.innerHTML = '<h3>بستن دوره‌های مالی</h3>' +
      '<p class="inventory-fiscal-note">دوره مالی سال جاری قابل بستن نیست. دوره بعدی را دستی نسازید؛ هنگام بستن دوره قبلی، نرم‌افزار خودش دوره بعد و سند افتتاحیه را ایجاد می‌کند.</p>' +
      '<div class="inventory-fiscal-close-body">در حال دریافت دوره‌ها...</div>';

    fiscalCard.insertAdjacentElement('afterend', card);
    await refreshCard(card);
  }

  async function refreshCard(card) {
    var body = card.querySelector('.inventory-fiscal-close-body');
    try {
      var data = await loadFiscalYears();
      if (!data.haveStockLicense) {
        body.innerHTML = '<div class="inv-warning">لایسنس انبار فعال نیست.</div>';
        return;
      }

      var currentYear = currentPersianYear();
      var rows = data.fiscalYears.map(function (fy) {
        var id = Number(fy.FiscalYearId || fy.fiscalYearId || 0);
        var title = fy.Title || fy.title || ('دوره ' + id);
        var startDate = fy.StartDate || fy.startDate || '';
        var endDate = fy.EndDate || fy.endDate || '';
        var startYear = dateYear(startDate);
        var closed = yesNo(fy.IsClosed || fy.isClosed);
        var canClose = !closed && startYear > 0 && currentYear > 0 && startYear < currentYear;
        var reason = closed ? 'بسته شده' : (startYear >= currentYear ? 'سال جاری/آینده قابل بستن نیست' : 'قابل بستن');
        return '<tr>' +
          '<td>' + escapeHtml(title) + '</td>' +
          '<td>' + escapeHtml(startDate) + '</td>' +
          '<td>' + escapeHtml(endDate) + '</td>' +
          '<td>' + escapeHtml(reason) + '</td>' +
          '<td><button type="button" class="inv-primary inventory-close-fiscal-btn" data-fiscal-id="' + id + '" ' + (canClose ? '' : 'disabled') + '>بستن دوره</button></td>' +
          '</tr>';
      }).join('');

      body.innerHTML = '<div class="inv-table-wrap"><table><thead><tr><th>دوره</th><th>شروع</th><th>پایان</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>' + rows + '</tbody></table></div>';

      Array.prototype.slice.call(body.querySelectorAll('.inventory-close-fiscal-btn')).forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var fiscalYearId = Number(btn.getAttribute('data-fiscal-id'));
          if (!fiscalYearId) return;
          if (!confirm('با بستن دوره مالی، مانده کالاها به دوره بعد منتقل و سند افتتاحیه ساخته می‌شود. ادامه می‌دهید؟')) return;
          btn.disabled = true;
          btn.textContent = 'در حال بستن...';
          try {
            var result = await closeFiscalYear(fiscalYearId);
            toast('success', result.message || 'دوره مالی بسته شد');
            await refreshCard(card);
            window.dispatchEvent(new CustomEvent('pargas-inventory-fiscal-year-closed', { detail: result }));
          } catch (error) {
            toast('error', error && error.message ? error.message : 'خطا در بستن دوره مالی');
            btn.disabled = false;
            btn.textContent = 'بستن دوره';
          }
        });
      });
    } catch (error) {
      body.innerHTML = '<div class="inv-warning">خطا در دریافت دوره‌های مالی: ' + escapeHtml(error && error.message ? error.message : error) + '</div>';
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      renderFiscalCloseCard();
    }, 150);
  }

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
})();