(function () {
  if (window.__inventoryDocumentSafeRouteInstalled) return;
  window.__inventoryDocumentSafeRouteInstalled = true;

  function normalizeDate(value) {
    return String(value || '').trim().replace(/-/g, '/');
  }

  function todayFa() {
    try {
      return new Date().toLocaleDateString('fa-IR-u-nu-latn').replace(/-/g, '/');
    } catch (_) {
      return '';
    }
  }

  function getDateYear(value) {
    var year = parseInt((normalizeDate(value).split('/')[0] || '').trim(), 10);
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

  function getStocktakingDate() {
    var input = document.querySelector('[data-stocktaking-date-input="1"]');
    return normalizeDate(input && input.value ? input.value : todayFa());
  }

  function makeUrl(originalUrl, path) {
    try {
      var url = new URL(originalUrl, window.location.href);
      var port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
      url.port = String(port + 1);
      url.pathname = path;
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch (_) {
      return String(originalUrl).replace('/inventory/document/save', path);
    }
  }

  function fakeJsonResponse(message) {
    return Promise.resolve(new Response(JSON.stringify({ status: false, message: message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    }));
  }

  function saveDocumentDetail(data, responseData) {
    try {
      var key = 'pargas_inventory_document_details';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      var docNumber = responseData && responseData.DocumentNumber ? responseData.DocumentNumber : (data.DocumentNumber || '-');
      var row = {
        DocumentNumber: docNumber,
        DocumentId: responseData && responseData.DocumentId ? responseData.DocumentId : 0,
        DocumentDate: data.DocumentDate,
        DocumentType: data.DocumentType,
        WarehouseId: data.WarehouseId,
        PersonTitle: data.PersonTitle || '',
        Description: data.Description || '',
        Items: data.Items || [],
        SavedAt: new Date().toISOString()
      };
      list = list.filter(function (item) { return item.DocumentNumber !== docNumber; });
      list.unshift(row);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 300)));
      window.dispatchEvent(new CustomEvent('pargas-inventory-document-detail-saved', { detail: row }));
    } catch (_) { }
  }

  var nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    if (url && url.indexOf('/inventory/document/save') >= 0) {
      try {
        var requestInit = init || {};
        var body = requestInit.body;
        var data = typeof body === 'string' ? JSON.parse(body) : null;
        if (data) {
          var documentType = Number(data.DocumentType || data.documentType || 0);
          if (documentType === 6 || documentType === 8) {
            data.DocumentDate = getStocktakingDate();
            var selectedYear = getSelectedFiscalYear();
            var dateYear = getDateYear(data.DocumentDate);
            if (!dateYear) return fakeJsonResponse('تاریخ انبارگردانی را مشخص کنید');
            if (selectedYear && dateYear !== selectedYear) return fakeJsonResponse('سال تاریخ انبارگردانی باید با دوره مالی انتخاب شده یکی باشد');
          }

          var newInit = Object.assign({}, requestInit, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, requestInit.headers || {}),
            body: JSON.stringify(data)
          });
          return nativeFetch.call(this, makeUrl(url, '/inventory-analysis/document/save'), newInit).then(function (response) {
            try {
              response.clone().json().then(function (result) {
                if (result && result.status) saveDocumentDetail(data, result);
              }).catch(function () { });
            } catch (_) { }
            return response;
          });
        }
      } catch (_) {
        return nativeFetch.apply(this, arguments);
      }
    }

    return nativeFetch.apply(this, arguments);
  };
})();
