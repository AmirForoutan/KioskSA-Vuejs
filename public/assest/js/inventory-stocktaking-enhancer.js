(function () {
  if (window.__inventoryStocktakingEnhancerInstalled) return;
  window.__inventoryStocktakingEnhancerInstalled = true;

  function todayFa() {
    try {
      return new Date().toLocaleDateString('fa-IR-u-nu-latn').replace(/-/g, '/');
    } catch (_) {
      return '';
    }
  }

  function normalizeDate(value) {
    return String(value || '').trim().replace(/-/g, '/');
  }

  function getDateYear(value) {
    var normalized = normalizeDate(value);
    var year = parseInt((normalized.split('/')[0] || '').trim(), 10);
    return isNaN(year) ? 0 : year;
  }

  function getSelectedFiscalYear() {
    var select = document.querySelector('.stocktaking-filter select');
    if (!select) return 0;
    var option = select.options[select.selectedIndex];
    var text = option ? option.textContent || '' : '';
    var match = text.match(/\d{4}/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function getStocktakingDateInput() {
    return document.querySelector('[data-stocktaking-date-input="1"]');
  }

  function getStocktakingDate() {
    var input = getStocktakingDateInput();
    return normalizeDate(input && input.value ? input.value : todayFa());
  }

  function fakeJsonResponse(message) {
    return Promise.resolve(new Response(JSON.stringify({ status: false, message: message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    }));
  }

  function toAnalysisStocktakingUrl(originalUrl) {
    try {
      var url = new URL(originalUrl, window.location.href);
      var port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
      url.port = String(port + 1);
      url.pathname = '/inventory-analysis/stocktaking-document/save';
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch (_) {
      return String(originalUrl).replace('/inventory/document/save', '/inventory-analysis/stocktaking-document/save');
    }
  }

  function injectStocktakingDate() {
    var filter = document.querySelector('.stocktaking-filter');
    if (!filter || getStocktakingDateInput()) return;

    var label = document.createElement('label');
    label.className = 'stocktaking-date-label';
    label.innerHTML = 'تاریخ انبارگردانی<input data-stocktaking-date-input="1" data-jdp placeholder="تاریخ انبارگردانی" />';
    filter.appendChild(label);

    var input = label.querySelector('input');
    input.value = todayFa();

    if (window.jalaliDatepicker && typeof window.jalaliDatepicker.startWatch === 'function') {
      window.setTimeout(function () {
        try {
          window.jalaliDatepicker.startWatch({ selector: '[data-jdp]', time: false, autoHide: true, hideAfterChange: true });
        } catch (_) { }
      }, 100);
    }
  }

  function validateStocktakingDate() {
    var selectedFiscalYear = getSelectedFiscalYear();
    var documentDate = getStocktakingDate();
    var documentYear = getDateYear(documentDate);

    if (!documentDate || !documentYear) {
      return 'تاریخ انبارگردانی را مشخص کنید';
    }

    if (selectedFiscalYear && documentYear !== selectedFiscalYear) {
      return 'سال تاریخ انبارگردانی باید با دوره مالی انتخاب شده یکی باشد';
    }

    return '';
  }

  var nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    if (url && url.indexOf('/inventory/document/save') >= 0) {
      var requestInit = init || {};
      var body = requestInit.body;

      try {
        if (!body && input && typeof input.clone === 'function') {
          return nativeFetch.apply(this, arguments);
        }

        var data = typeof body === 'string' ? JSON.parse(body) : null;
        var documentType = Number(data && data.DocumentType);
        if (data && (documentType === 6 || documentType === 8)) {
          var validationMessage = validateStocktakingDate();
          if (validationMessage) return fakeJsonResponse(validationMessage);

          data.DocumentDate = getStocktakingDate();
          var newUrl = toAnalysisStocktakingUrl(url);
          var newInit = Object.assign({}, requestInit, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, requestInit.headers || {}),
            body: JSON.stringify(data)
          });
          return nativeFetch.call(this, newUrl, newInit);
        }
      } catch (_) {
        return nativeFetch.apply(this, arguments);
      }
    }

    return nativeFetch.apply(this, arguments);
  };

  var scheduled = false;
  function scheduleInject() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      injectStocktakingDate();
    }, 120);
  }

  var observer = new MutationObserver(scheduleInject);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInject);
  } else {
    scheduleInject();
  }
})();
