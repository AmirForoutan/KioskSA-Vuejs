(function () {
  if (window.__pcInventoryStockGuardInstalled) return;
  window.__pcInventoryStockGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);
  let bootstrapCache = null;
  let bootstrapCacheAt = 0;
  let analysisCache = null;
  let analysisCacheAt = 0;
  const cacheMs = 10000;
  const warnedAt = new Map();

  function requestUrl(input) {
    return typeof input === 'string' ? input : input && input.url;
  }

  function isTargetUrl(input, suffix) {
    const url = requestUrl(input);
    return typeof url === 'string' && url.toLowerCase().replace(/\/+$/, '').endsWith(suffix);
  }

  function buildServiceBaseFromUrl(serviceUrl, offset, path) {
    try {
      const url = new URL(serviceUrl, window.location.href);
      const currentPort = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
      url.port = String(currentPort + offset);
      url.pathname = path;
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch (_error) {
      return String(serviceUrl).replace(/:(\d+)(\/?$)/, function (_match, port) {
        return ':' + (Number(port) + offset) + path;
      });
    }
  }

  function buildInventoryBase(serviceUrl) {
    return buildServiceBaseFromUrl(serviceUrl, 1, '/inventory');
  }

  function buildAnalysisBase(serviceUrl) {
    return buildServiceBaseFromUrl(serviceUrl, 2, '/inventory-analysis');
  }

  function jsonResponse(payload, status) {
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (payload && (payload.skipGlobalToast === true || payload.SkipGlobalToast === true)) {
      headers['X-Pargas-Skip-Toast'] = '1';
    }
    return new Response(JSON.stringify(payload), {
      status: status || 200,
      headers: headers
    });
  }

  function notify(type, message) {
    if (!message) return;
    try {
      if (window.pargasToast && typeof window.pargasToast[type] === 'function') {
        window.pargasToast[type](message);
        return;
      }
    } catch (_error) { }

    try {
      let container = document.getElementById('pc-inventory-stock-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'pc-inventory-stock-toast-container';
        container.style.position = 'fixed';
        container.style.top = '18px';
        container.style.right = '18px';
        container.style.zIndex = '999999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        document.body.appendChild(container);
      }

      const item = document.createElement('div');
      item.textContent = message;
      item.style.maxWidth = '420px';
      item.style.direction = 'rtl';
      item.style.fontFamily = 'Vazirmatn-FD-Black, Tahoma, sans-serif';
      item.style.fontSize = '13px';
      item.style.lineHeight = '1.8';
      item.style.borderRadius = '14px';
      item.style.padding = '10px 14px';
      item.style.boxShadow = '0 12px 30px rgba(15,23,42,.18)';
      item.style.background = type === 'error' ? '#fee2e2' : '#fff7ed';
      item.style.color = type === 'error' ? '#991b1b' : '#9a3412';
      item.style.border = type === 'error' ? '1px solid #fecaca' : '1px solid #fed7aa';
      container.appendChild(item);
      setTimeout(function () { item.remove(); }, type === 'error' ? 7000 : 5000);
    } catch (_error) {
      console[type === 'error' ? 'error' : 'warn'](message);
    }
  }

  async function readRequestBody(input, init) {
    if (init && typeof init.body === 'string') return init.body;
    if (input && typeof input !== 'string' && typeof input.clone === 'function') {
      try { return await input.clone().text(); } catch (_error) { return ''; }
    }
    return '';
  }

  async function getBootstrap(serviceUrl, force) {
    const now = Date.now();
    if (!force && bootstrapCache && now - bootstrapCacheAt < cacheMs) return bootstrapCache;

    const inventoryBase = buildInventoryBase(serviceUrl);
    const analysisBase = buildAnalysisBase(serviceUrl);
    const response = await originalFetch(inventoryBase + '/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const result = await response.json();
    bootstrapCache = { inventoryBase: inventoryBase, analysisBase: analysisBase, result: result || {} };
    bootstrapCacheAt = now;
    return bootstrapCache;
  }

  async function getAnalysis(serviceUrl, force) {
    const now = Date.now();
    if (!force && analysisCache && now - analysisCacheAt < cacheMs) return analysisCache;

    const response = await originalFetch(buildAnalysisBase(serviceUrl) + '/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    analysisCache = await response.json();
    analysisCacheAt = now;
    return analysisCache || {};
  }

  function stockControlEnabled(bootstrap) {
    const data = bootstrap && bootstrap.result ? bootstrap.result : {};
    const settings = data.settings || data.Settings || {};
    return Boolean(data.haveStockLicense) && settings.IsWarehouseEnabled === true;
  }

  function allowNegativeStock(bootstrap) {
    const data = bootstrap && bootstrap.result ? bootstrap.result : {};
    const settings = data.settings || data.Settings || {};
    return settings.AllowNegativeStockSale === true;
  }

  function normalizeSaleItemsFromInvoiceBody(bodyText) {
    try {
      const body = JSON.parse(bodyText || '{}');
      const source = Array.isArray(body.items) ? body.items :
        Array.isArray(body.Items) ? body.Items :
          Array.isArray(body.InvoiceItems) ? body.InvoiceItems : [];
      const map = new Map();

      source.forEach(function (cartItem) {
        const item = cartItem.item || cartItem.Item || cartItem;
        const goodsId = Number(item.GoodsId || item.goodsId || cartItem.GoodsId || cartItem.goodsId || 0);
        const quantity = Number(cartItem.quantity || cartItem.Quantity || item.Quantity || item.quantity || 0);
        const unitPrice = Number(item.GoodsPrice || item.goodsPrice || cartItem.UnitPrice || cartItem.unitPrice || 0);
        const goodsName = item.GoodsName || item.goodsName || item.Name || cartItem.GoodsName || '';
        if (!goodsId || quantity <= 0) return;

        const current = map.get(goodsId) || { GoodsId: goodsId, Quantity: 0, UnitPrice: unitPrice, GoodsName: goodsName };
        current.Quantity += quantity;
        if (!current.UnitPrice && unitPrice) current.UnitPrice = unitPrice;
        if (!current.GoodsName && goodsName) current.GoodsName = goodsName;
        map.set(goodsId, current);
      });

      return Array.from(map.values());
    } catch (_error) {
      return [];
    }
  }

  function expandSaleItemsByRecipe(saleItems, analysis) {
    const recipes = Array.isArray(analysis && analysis.recipes) ? analysis.recipes : [];
    const byProduct = new Map();

    recipes.forEach(function (recipe) {
      const productGoodsId = Number(recipe.ProductGoodsId || recipe.productGoodsId || 0);
      if (!productGoodsId) return;
      if (!byProduct.has(productGoodsId)) byProduct.set(productGoodsId, []);
      byProduct.get(productGoodsId).push(recipe);
    });

    const map = new Map();
    saleItems.forEach(function (sale) {
      const recipeItems = byProduct.get(Number(sale.GoodsId)) || [];
      if (recipeItems.length) {
        recipeItems.forEach(function (recipe) {
          const ingredientGoodsId = Number(recipe.IngredientGoodsId || recipe.ingredientGoodsId || 0);
          const baseQty = Number(sale.Quantity || 0) * Number(recipe.Quantity || recipe.quantity || 0);
          const waste = Number(recipe.WastePercent || recipe.wastePercent || 0);
          const qty = waste > 0 ? baseQty + (baseQty * waste / 100) : baseQty;
          if (!ingredientGoodsId || qty <= 0) return;
          const current = map.get(ingredientGoodsId) || { GoodsId: ingredientGoodsId, Quantity: 0 };
          current.Quantity += qty;
          map.set(ingredientGoodsId, current);
        });
      } else {
        const current = map.get(Number(sale.GoodsId)) || { GoodsId: Number(sale.GoodsId), Quantity: 0 };
        current.Quantity += Number(sale.Quantity || 0);
        map.set(Number(sale.GoodsId), current);
      }
    });

    return Array.from(map.values()).filter(function (item) { return item.GoodsId > 0 && item.Quantity > 0; });
  }

  function pickFiscalYear(bootstrap) {
    const fiscalYears = bootstrap.result && Array.isArray(bootstrap.result.fiscalYears) ? bootstrap.result.fiscalYears : [];
    return fiscalYears.find(function (fy) { return fy.IsClosed !== true && Number(fy.IsClosed || 0) === 0; }) || fiscalYears[0];
  }

  function pickWarehouse(bootstrap) {
    const warehouses = bootstrap.result && Array.isArray(bootstrap.result.warehouses) ? bootstrap.result.warehouses : [];
    return warehouses.find(function (w) { return w.IsDefault === true && w.IsActive !== false; }) || warehouses.find(function (w) { return w.IsActive !== false; }) || warehouses[0];
  }

  async function fetchStockRows(bootstrap) {
    const fiscalYear = pickFiscalYear(bootstrap);
    const warehouse = pickWarehouse(bootstrap);
    const response = await originalFetch(bootstrap.inventoryBase + '/report/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FiscalYearId: Number(fiscalYear && (fiscalYear.FiscalYearId || fiscalYear.fiscalYearId) || 0),
        WarehouseId: Number(warehouse && (warehouse.WarehouseId || warehouse.warehouseId) || 0)
      })
    });
    const result = await response.json();
    return Array.isArray(result.rows) ? result.rows : Array.isArray(result.Rows) ? result.Rows : [];
  }

  function formatQty(value) {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
  }

  function lowStockThreshold(row) {
    const min = Number(row.MinStock || row.minStock || 0);
    const reorder = Number(row.ReorderPoint || row.reorderPoint || 0);
    if (min > 0) return min;
    if (reorder > 0) return reorder;
    return 0;
  }

  function notifyLowStock(row, afterQuantity) {
    const threshold = lowStockThreshold(row);
    if (threshold <= 0) return;
    if (Number(afterQuantity) > threshold) return;

    const goodsId = Number(row.GoodsId || row.goodsId || 0);
    const key = goodsId + ':' + Math.floor(Date.now() / 120000);
    if (warnedAt.get(goodsId) === key) return;
    warnedAt.set(goodsId, key);

    const name = row.GoodsName || row.goodsName || 'کالا';
    notify('warning', 'موجودی «' + name + '» رو به اتمام است. موجودی: ' + formatQty(afterQuantity) + ' عدد، حداقل: ' + formatQty(threshold) + ' عدد');
  }

  async function warnCurrentLowStocks(serviceUrl, issueItems) {
    try {
      const bootstrap = await getBootstrap(serviceUrl, true);
      if (!stockControlEnabled(bootstrap)) return;
      const rows = await fetchStockRows(bootstrap);
      const issueMap = new Map();
      (issueItems || []).forEach(function (item) {
        issueMap.set(Number(item.GoodsId), (issueMap.get(Number(item.GoodsId)) || 0) + Number(item.Quantity || 0));
      });

      rows.forEach(function (row) {
        const goodsId = Number(row.GoodsId || row.goodsId || 0);
        const current = Number(row.CurrentQuantity || row.currentQuantity || 0);
        const afterQuantity = issueMap.has(goodsId) ? current - Number(issueMap.get(goodsId) || 0) : current;
        notifyLowStock(row, afterQuantity);
      });
    } catch (error) {
      console.warn('خطا در بررسی هشدار حداقل موجودی:', error);
    }
  }

  function buildShortageMessage(shortages) {
    const list = shortages.slice(0, 4).map(function (item) {
      const name = item.GoodsName || item.goodsName || 'کالا';
      const current = item.CurrentQuantity != null ? item.CurrentQuantity : item.CurrentStock;
      return 'امکان ثبت فاکتور وجود ندارد؛ کالای «' + name + '» در انبار موجودی کافی ندارد (موجودی ' + formatQty(current) + ' عدد)';
    });
    if (shortages.length > 4) list.push('و ' + (shortages.length - 4) + ' قلم دیگر موجودی کافی ندارند');
    return list.join('\n');
  }

  async function checkStockBeforeInvoice(serviceUrl, bodyText) {
    const bootstrap = await getBootstrap(serviceUrl, true);
    if (!stockControlEnabled(bootstrap)) return { allow: true, issueItems: [] };

    const saleItems = normalizeSaleItemsFromInvoiceBody(bodyText);
    if (!saleItems.length) return { allow: true, issueItems: [] };

    const analysis = await getAnalysis(serviceUrl, true);
    const issueItems = expandSaleItemsByRecipe(saleItems, analysis);

    let result;
    try {
      const response = await originalFetch(bootstrap.analysisBase + '/check-invoice-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ Items: saleItems })
      });
      result = await response.json();
    } catch (error) {
      if (!allowNegativeStock(bootstrap)) {
        return { allow: false, message: 'خطا در بررسی موجودی انبار؛ ثبت فاکتور انجام نشد' };
      }
      notify('warning', 'خطا در بررسی موجودی انبار؛ چون ثبت با موجودی منفی مجاز است فاکتور ادامه پیدا کرد');
      return { allow: true, issueItems: issueItems };
    }

    if (!result || result.shouldCheck === false) return { allow: true, issueItems: issueItems };

    const shortages = Array.isArray(result.shortages) ? result.shortages : [];
    if (shortages.length && result.warningOnly === true) {
      shortages.forEach(function (item) {
        const name = item.GoodsName || item.goodsName || 'کالا';
        const current = item.CurrentQuantity != null ? item.CurrentQuantity : item.CurrentStock;
        notify('warning', 'موجودی «' + name + '» کافی نیست ولی ثبت با موجودی منفی مجاز است (موجودی ' + formatQty(current) + ' عدد)');
      });
      return { allow: true, issueItems: issueItems };
    }

    if (result.canSubmit === false || (!allowNegativeStock(bootstrap) && shortages.length)) {
      return { allow: false, message: buildShortageMessage(shortages) || result.message || 'موجودی کافی نیست' };
    }

    return { allow: true, issueItems: issueItems };
  }

  async function handleInvoice(input, init) {
    const serviceUrl = requestUrl(input);
    const bodyText = await readRequestBody(input, init);
    let stockGuardResult = { allow: true, issueItems: [] };

    try {
      stockGuardResult = await checkStockBeforeInvoice(serviceUrl, bodyText);
      if (!stockGuardResult.allow) {
        return jsonResponse({ status: false, message: stockGuardResult.message, skipGlobalToast: true }, 200);
      }
    } catch (error) {
      return jsonResponse({ status: false, message: error && error.message ? error.message : 'خطا در کنترل موجودی انبار', skipGlobalToast: true }, 200);
    }

    const response = await originalFetch(input, init);
    try {
      const result = await response.clone().json();
      if (result && result.status) {
        setTimeout(function () {
          warnCurrentLowStocks(serviceUrl, stockGuardResult.issueItems);
        }, 800);
      }
      return jsonResponse(result, response.status);
    } catch (_error) {
      return response;
    }
  }

  async function handleGetGoods(input, init) {
    const response = await originalFetch(input, init);
    const serviceUrl = requestUrl(input);
    setTimeout(function () { warnCurrentLowStocks(serviceUrl); }, 1000);
    return response;
  }

  window.fetch = function (input, init) {
    if (isTargetUrl(input, '/printers') || isTargetUrl(input, '/printersscale')) return handleInvoice(input, init);
    if (isTargetUrl(input, '/getgoods')) return handleGetGoods(input, init);
    return originalFetch(input, init);
  };
})();
