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

  function isVisibleForKiosk(item) {
    return !item || item.IsKioskVisible !== false;
  }

  function filterCategoriesPayload(payload) {
    if (Array.isArray(payload)) return payload.filter(isVisibleForKiosk);
    if (payload && Array.isArray(payload.GoodsGroup)) return { ...payload, GoodsGroup: payload.GoodsGroup.filter(isVisibleForKiosk) };
    if (payload && Array.isArray(payload.Groups)) return { ...payload, Groups: payload.Groups.filter(isVisibleForKiosk) };
    if (payload && Array.isArray(payload.Categories)) return { ...payload, Categories: payload.Categories.filter(isVisibleForKiosk) };
    if (payload && Array.isArray(payload.categories)) return { ...payload, categories: payload.categories.filter(isVisibleForKiosk) };
    return payload;
  }

  function filterGoodsPayload(payload) {
    if (Array.isArray(payload)) return payload.filter(isVisibleForKiosk);
    if (payload && Array.isArray(payload.Goods)) return { ...payload, Goods: payload.Goods.filter(isVisibleForKiosk) };
    if (payload && Array.isArray(payload.goods)) return { ...payload, goods: payload.goods.filter(isVisibleForKiosk) };
    if (payload && Array.isArray(payload.Products)) return { ...payload, Products: payload.Products.filter(isVisibleForKiosk) };
    if (payload && Array.isArray(payload.products)) return { ...payload, products: payload.products.filter(isVisibleForKiosk) };
    return payload;
  }

  async function handleFilteredCatalog(input, init, filterPayload) {
    const response = await originalFetch(input, init);
    if (!shouldFilterKioskCatalog()) return response;

    try {
      const payload = await response.clone().json();
      return jsonResponse(filterPayload(payload), response.status);
    } catch (_error) {
      return response;
    }
  }

  window.fetch = function (input, init) {
    if (isTargetUrl(input, '/getgoodsgroup') || isTargetUrl(input, '/getscalegoodsgroup')) {
      return handleFilteredCatalog(input, init, filterCategoriesPayload);
    }
    if (isTargetUrl(input, '/getgoods')) {
      return handleFilteredCatalog(input, init, filterGoodsPayload);
    }
    return originalFetch(input, init);
  };
})();