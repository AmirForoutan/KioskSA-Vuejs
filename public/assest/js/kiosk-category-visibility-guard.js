(function () {
  if (window.__kioskCategoryVisibilityGuardInstalled) return;
  window.__kioskCategoryVisibilityGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);

  function isTargetUrl(input, suffix) {
    const url = typeof input === 'string' ? input : input && input.url;
    return typeof url === 'string' && url.toLowerCase().replace(/\/+$/, '').endsWith(suffix);
  }

  function shouldFilterKioskCatalog() {
    const path = (window.location.pathname || '').toLowerCase();
    return !path.includes('/desktop') && !path.includes('/admin');
  }

  function jsonResponse(payload, status) {
    return new Response(JSON.stringify(payload), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  function isVisibleCategory(item) {
    return !item || item.IsKioskVisible !== false;
  }

  function filterCategoriesPayload(payload) {
    if (Array.isArray(payload)) return payload.filter(isVisibleCategory);
    if (payload && Array.isArray(payload.GoodsGroup)) return { ...payload, GoodsGroup: payload.GoodsGroup.filter(isVisibleCategory) };
    if (payload && Array.isArray(payload.Groups)) return { ...payload, Groups: payload.Groups.filter(isVisibleCategory) };
    if (payload && Array.isArray(payload.Categories)) return { ...payload, Categories: payload.Categories.filter(isVisibleCategory) };
    if (payload && Array.isArray(payload.categories)) return { ...payload, categories: payload.categories.filter(isVisibleCategory) };
    return payload;
  }

  async function handleGetGoodsGroup(input, init) {
    const response = await originalFetch(input, init);
    if (!shouldFilterKioskCatalog()) return response;

    try {
      const payload = await response.clone().json();
      return jsonResponse(filterCategoriesPayload(payload), response.status);
    } catch (_error) {
      return response;
    }
  }

  window.fetch = function (input, init) {
    if (isTargetUrl(input, '/getgoodsgroup') || isTargetUrl(input, '/getscalegoodsgroup')) {
      return handleGetGoodsGroup(input, init);
    }
    return originalFetch(input, init);
  };
})();
