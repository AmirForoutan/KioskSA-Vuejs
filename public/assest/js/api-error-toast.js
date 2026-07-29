(function () {
  if (window.__pargasApiErrorToastInstalled) return;
  window.__pargasApiErrorToastInstalled = true;

  var lastMessage = '';
  var lastTime = 0;

  function showToast(message) {
    var text = String(message || '').trim();
    if (!text) return;

    var now = Date.now();
    if (text === lastMessage && now - lastTime < 2500) return;
    lastMessage = text;
    lastTime = now;

    if (window.pargasToast && typeof window.pargasToast.error === 'function') {
      window.pargasToast.error(text);
      return;
    }

    window.addEventListener('pargas-toast-ready', function onReady() {
      window.removeEventListener('pargas-toast-ready', onReady);
      if (window.pargasToast && typeof window.pargasToast.error === 'function') {
        window.pargasToast.error(text);
      }
    });
  }

  function shouldWatch(url) {
    var value = String(url || '').toLowerCase();
    return value.indexOf('/inventory/') >= 0 ||
      value.indexOf('/inventory-analysis/') >= 0 ||
      value.indexOf('/auth/') >= 0 ||
      value.indexOf('/settings/') >= 0 ||
      value.indexOf('/printers') >= 0 ||
      value.indexOf('/pay') >= 0 ||
      value.indexOf('/tables') >= 0 ||
      value.indexOf('/getgoods') >= 0 ||
      value.indexOf('/getcustomers') >= 0;
  }

  function extractUrl(input) {
    if (typeof input === 'string') return input;
    if (input && input.url) return input.url;
    return '';
  }

  function shouldSkipToast(data, response) {
    try {
      if (data && (data.skipGlobalToast === true || data.SkipGlobalToast === true)) return true;
      if (response && response.headers && response.headers.get('X-Pargas-Skip-Toast') === '1') return true;
    } catch (_error) { }
    return false;
  }

  var nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = extractUrl(input);
    return nativeFetch.apply(this, arguments)
      .then(function (response) {
        if (!shouldWatch(url)) return response;

        try {
          var cloned = response.clone();
          var contentType = cloned.headers.get('content-type') || '';
          if (contentType.indexOf('application/json') >= 0) {
            cloned.json().then(function (data) {
              if (shouldSkipToast(data, response)) return;
              if (!response.ok) {
                showToast((data && data.message) || ('خطا در ارتباط با سرویس؛ کد ' + response.status));
                return;
              }
              if (data && data.status === false) {
                showToast(data.message || 'عملیات با خطا مواجه شد');
              }
            }).catch(function () {
              if (!response.ok) showToast('خطا در ارتباط با سرویس؛ کد ' + response.status);
            });
          } else if (!response.ok) {
            showToast('خطا در ارتباط با سرویس؛ کد ' + response.status);
          }
        } catch (error) {
          if (!response.ok) showToast('خطا در ارتباط با سرویس؛ کد ' + response.status);
        }

        return response;
      })
      .catch(function (error) {
        if (shouldWatch(url)) {
          showToast(error && error.message ? error.message : 'ارتباط با سرویس برقرار نشد');
        }
        throw error;
      });
  };
})();
