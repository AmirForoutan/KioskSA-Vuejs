(function () {
  if (window.__kioskInventoryGuardInstalled) return;
  window.__kioskInventoryGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);
  let cachedBootstrap = null;
  let cachedAt = 0;
  const cacheMs = 15000;

  function isTargetUrl(input, suffix) {
    const url = typeof input === 'string' ? input : input && input.url;
    return typeof url === 'string' && url.toLowerCase().replace(/\/+$/, '').endsWith(suffix);
  }

  function buildInventoryBaseFromServiceUrl(serviceUrl) {
    try {
      const url = new URL(serviceUrl, window.location.href);
      const currentPort = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
      url.port = String(currentPort + 1);
      url.pathname = '/inventory';
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch (_error) {
      return String(serviceUrl).replace(/:(\d+)(\/?$)/, function (_match, port) {
        return ':' + (Number(port) + 1) + '/inventory';
      });
    }
  }

  function jsonResponse(payload, status) {
    return new Response(JSON.stringify(payload), {
      status: status || 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  async function getBootstrap(serviceUrl) {
    const now = Date.now();
    if (cachedBootstrap && now - cachedAt < cacheMs) return cachedBootstrap;

    const inventoryBase = buildInventoryBaseFromServiceUrl(serviceUrl);
    const response = await originalFetch(inventoryBase + '/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const result = await response.json();
    cachedBootstrap = {
      inventoryBase: inventoryBase,
      result: result || {},
    };
    cachedAt = now;
    return cachedBootstrap;
  }

  function shouldBlockOnStock(bootstrap) {
    const data = bootstrap && bootstrap.result ? bootstrap.result : {};
    const settings = data.settings || data.Settings || {};
    return Boolean(data.haveStockLicense) && settings.IsWarehouseEnabled === true && settings.AllowNegativeStockSale !== true;
  }

  function shouldWarnOnly(bootstrap) {
    const data = bootstrap && bootstrap.result ? bootstrap.result : {};
    const settings = data.settings || data.Settings || {};
    return Boolean(data.haveStockLicense) && settings.IsWarehouseEnabled === true && settings.AllowNegativeStockSale === true;
  }

  function getActiveFiscalYearId(bootstrap) {
    const years = bootstrap && bootstrap.result && Array.isArray(bootstrap.result.fiscalYears)
      ? bootstrap.result.fiscalYears
      : [];
    return years[0] && years[0].FiscalYearId ? years[0].FiscalYearId : 0;
  }

  function normalizeItemsFromBody(bodyText) {
    try {
      const body = JSON.parse(bodyText || '{}');
      const items = Array.isArray(body.Items) ? body.Items : [];
      const map = new Map();
      items.forEach(function (item) {
        const goodsId = Number(item.GoodsId || item.goodsId || 0);
        const quantity = Number(item.Quantity || item.quantity || 0);
        if (!goodsId || quantity <= 0) return;
        map.set(goodsId, (map.get(goodsId) || 0) + quantity);
      });
      return Array.from(map.entries()).map(function ([GoodsId, Quantity]) {
        return { GoodsId: GoodsId, Quantity: Quantity };
      });
    } catch (_error) {
      return [];
    }
  }

  async function readRequestBody(input, init) {
    if (init && typeof init.body === 'string') return init.body;
    if (input && typeof input !== 'string' && typeof input.clone === 'function') {
      try { return await input.clone().text(); } catch (_error) { return ''; }
    }
    return '';
  }

  async function loadStockRows(bootstrap) {
    const response = await originalFetch(bootstrap.inventoryBase + '/report/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FiscalYearId: getActiveFiscalYearId(bootstrap),
        WarehouseId: 0,
        FromDate: '',
        ToDate: '',
      }),
    });
    const result = await response.json();
    return result && Array.isArray(result.rows) ? result.rows : [];
  }

  async function handleHaveStock(input, init) {
    const serviceUrl = typeof input === 'string' ? input : input.url;
    try {
      const bootstrap = await getBootstrap(serviceUrl);
      const block = shouldBlockOnStock(bootstrap);
      const warn = shouldWarnOnly(bootstrap);
      return jsonResponse({
        status: block,
        warningOnly: warn,
        inventoryEnabled: Boolean(bootstrap.result && bootstrap.result.settings && bootstrap.result.settings.IsWarehouseEnabled),
        haveStockLicense: Boolean(bootstrap.result && bootstrap.result.haveStockLicense),
        allowNegativeStockSale: Boolean(bootstrap.result && bootstrap.result.settings && bootstrap.result.settings.AllowNegativeStockSale),
        message: block ? 'کنترل موجودی انبار فعال است' : 'کنترل اجباری موجودی انبار غیرفعال است',
      });
    } catch (_error) {
      return originalFetch(input, init);
    }
  }

  async function handleCheckStock(input, init) {
    const serviceUrl = typeof input === 'string' ? input : input.url;
    try {
      const bootstrap = await getBootstrap(serviceUrl);
      if (!shouldBlockOnStock(bootstrap)) {
        return jsonResponse({ status: true, data: [] });
      }

      const requestedItems = normalizeItemsFromBody(await readRequestBody(input, init));
      const stockRows = await loadStockRows(bootstrap);
      const stockMap = new Map();

      stockRows.forEach(function (row) {
        stockMap.set(Number(row.GoodsId), row);
      });

      const data = requestedItems.map(function (item) {
        const row = stockMap.get(Number(item.GoodsId));
        const currentStock = Number(row && row.CurrentQuantity ? row.CurrentQuantity : 0);
        return {
          GoodsId: item.GoodsId,
          GoodsName: row && row.GoodsName ? row.GoodsName : 'کالا',
          CurrentStock: currentStock,
          HaveInventory: currentStock >= Number(item.Quantity || 0),
        };
      });

      return jsonResponse({ status: true, data: data });
    } catch (_error) {
      return originalFetch(input, init);
    }
  }

  window.fetch = function (input, init) {
    if (isTargetUrl(input, '/havestock')) return handleHaveStock(input, init);
    if (isTargetUrl(input, '/checkstock')) return handleCheckStock(input, init);
    return originalFetch(input, init);
  };
})();
