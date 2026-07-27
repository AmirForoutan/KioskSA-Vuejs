(function () {
  if (window.__kioskInventoryGuardInstalled) return;
  window.__kioskInventoryGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);
  let cachedBootstrap = null;
  let cachedAnalysis = null;
  let cachedAt = 0;
  let cachedAnalysisAt = 0;
  const cacheMs = 15000;

  function isTargetUrl(input, suffix) {
    const url = typeof input === 'string' ? input : input && input.url;
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

  function buildInventoryBaseFromServiceUrl(serviceUrl) {
    return buildServiceBaseFromUrl(serviceUrl, 1, '/inventory');
  }

  function buildAnalysisBaseFromServiceUrl(serviceUrl) {
    return buildServiceBaseFromUrl(serviceUrl, 2, '/inventory-analysis');
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
    const analysisBase = buildAnalysisBaseFromServiceUrl(serviceUrl);
    const response = await originalFetch(inventoryBase + '/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const result = await response.json();
    cachedBootstrap = {
      inventoryBase: inventoryBase,
      analysisBase: analysisBase,
      result: result || {},
    };
    cachedAt = now;
    return cachedBootstrap;
  }

  async function getAnalysis(serviceUrl) {
    const now = Date.now();
    if (cachedAnalysis && now - cachedAnalysisAt < cacheMs) return cachedAnalysis;

    const response = await originalFetch(buildAnalysisBaseFromServiceUrl(serviceUrl) + '/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    cachedAnalysis = await response.json();
    cachedAnalysisAt = now;
    return cachedAnalysis;
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

  function normalizeSaleItemsFromInvoiceBody(bodyText) {
    try {
      const body = JSON.parse(bodyText || '{}');
      const source = Array.isArray(body.items) ? body.items : (Array.isArray(body.Items) ? body.Items : []);
      const map = new Map();
      source.forEach(function (cartItem) {
        const item = cartItem.item || cartItem.Item || cartItem;
        const goodsId = Number(item.GoodsId || item.goodsId || cartItem.GoodsId || cartItem.goodsId || 0);
        const quantity = Number(cartItem.quantity || cartItem.Quantity || item.Quantity || item.quantity || 0);
        const unitPrice = Number(item.GoodsPrice || item.goodsPrice || cartItem.UnitPrice || cartItem.unitPrice || 0);
        const goodsName = item.GoodsName || item.goodsName || item.Name || '';
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

  async function readRequestBody(input, init) {
    if (init && typeof init.body === 'string') return init.body;
    if (input && typeof input !== 'string' && typeof input.clone === 'function') {
      try { return await input.clone().text(); } catch (_error) { return ''; }
    }
    return '';
  }

  function shouldFilterKioskGoods() {
    const path = (window.location.pathname || '').toLowerCase();
    return !path.includes('/desktop') && !path.includes('/admin');
  }

  function filterGoodsPayload(payload, usageMap) {
    function isVisible(item) {
      const usage = usageMap.get(Number(item.GoodsId || item.goodsId || 0));
      return !usage || usage.IsKioskVisible !== false;
    }

    if (Array.isArray(payload)) return payload.filter(isVisible);
    if (payload && Array.isArray(payload.goods)) return { ...payload, goods: payload.goods.filter(isVisible) };
    if (payload && Array.isArray(payload.Goods)) return { ...payload, Goods: payload.Goods.filter(isVisible) };
    return payload;
  }

  function todayFa() {
    try {
      return new Date().toLocaleDateString('fa-IR-u-nu-latn').replace(/-/g, '/');
    } catch (_error) {
      return new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    }
  }

  function dateYear(dateText) {
    const year = parseInt(String(dateText || '').split('/')[0], 10);
    return isNaN(year) ? 0 : year;
  }

  function pickFiscalYear(bootstrap, documentDate) {
    const fiscalYears = bootstrap.result && Array.isArray(bootstrap.result.fiscalYears) ? bootstrap.result.fiscalYears : [];
    const year = dateYear(documentDate);
    return fiscalYears.find(function (fy) {
      return Number(fy.IsClosed ? 1 : 0) === 0 && dateYear(fy.StartDate) === year;
    }) || fiscalYears.find(function (fy) { return Number(fy.IsClosed ? 1 : 0) === 0; }) || fiscalYears[0];
  }

  function pickWarehouse(bootstrap) {
    const warehouses = bootstrap.result && Array.isArray(bootstrap.result.warehouses) ? bootstrap.result.warehouses : [];
    return warehouses.find(function (w) { return w.IsDefault === true && w.IsActive !== false; }) || warehouses.find(function (w) { return w.IsActive !== false; }) || warehouses[0];
  }

  function hasInvoiceBeenIssued(invoiceKey) {
    try {
      const list = JSON.parse(localStorage.getItem('pargas_inventory_sale_issue_invoices') || '[]');
      return list.indexOf(String(invoiceKey)) >= 0;
    } catch (_error) {
      return false;
    }
  }

  function rememberIssuedInvoice(invoiceKey) {
    try {
      const key = 'pargas_inventory_sale_issue_invoices';
      const list = JSON.parse(localStorage.getItem(key) || '[]').map(String);
      if (list.indexOf(String(invoiceKey)) < 0) list.unshift(String(invoiceKey));
      localStorage.setItem(key, JSON.stringify(list.slice(0, 500)));
    } catch (_error) { }
  }

  function saveDocumentDetail(data, responseData) {
    try {
      const key = 'pargas_inventory_document_details';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      const docNumber = responseData && responseData.DocumentNumber ? responseData.DocumentNumber : (data.DocumentNumber || '-');
      const row = {
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
    } catch (_error) { }
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
          const current = map.get(ingredientGoodsId) || { GoodsId: ingredientGoodsId, Quantity: 0, UnitPrice: 0, Description: '' };
          current.Quantity += qty;
          current.Description = 'خروج مواد اولیه فروش - ' + (recipe.IngredientGoodsName || recipe.ingredientGoodsName || '');
          map.set(ingredientGoodsId, current);
        });
      } else {
        const current = map.get(Number(sale.GoodsId)) || { GoodsId: Number(sale.GoodsId), Quantity: 0, UnitPrice: Number(sale.UnitPrice || 0), Description: '' };
        current.Quantity += Number(sale.Quantity || 0);
        if (!current.UnitPrice && sale.UnitPrice) current.UnitPrice = Number(sale.UnitPrice || 0);
        current.Description = 'خروج خودکار فروش - ' + (sale.GoodsName || '');
        map.set(Number(sale.GoodsId), current);
      }
    });

    return Array.from(map.values()).filter(function (item) { return item.GoodsId > 0 && item.Quantity > 0; });
  }

  async function saveSaleStockIssue(serviceUrl, invoiceBodyText, invoiceResult) {
    const bootstrap = await getBootstrap(serviceUrl);
    const data = bootstrap.result || {};
    const settings = data.settings || data.Settings || {};
    if (!data.haveStockLicense || settings.IsWarehouseEnabled !== true || settings.AutoCreateStockIssueFromSaleInvoice === false) return;

    const invoiceKey = invoiceResult && (invoiceResult.SID || invoiceResult.InvoiceId || invoiceResult.SaleInvoiceId || invoiceResult.DocumentNumber || invoiceResult.message);
    if (invoiceKey && hasInvoiceBeenIssued(invoiceKey)) return;

    const saleItems = normalizeSaleItemsFromInvoiceBody(invoiceBodyText);
    if (!saleItems.length) return;

    const analysis = await getAnalysis(serviceUrl);
    const issueItems = expandSaleItemsByRecipe(saleItems, analysis);
    if (!issueItems.length) return;

    const documentDate = todayFa();
    const fiscalYear = pickFiscalYear(bootstrap, documentDate);
    const warehouse = pickWarehouse(bootstrap);
    if (!fiscalYear || !warehouse) throw new Error('دوره مالی یا انبار پیش‌فرض برای خروج فروش پیدا نشد');

    const request = {
      DocumentType: 2,
      DocumentNumber: '',
      DocumentDate: documentDate,
      FiscalYearId: Number(fiscalYear.FiscalYearId || fiscalYear.fiscalYearId || 0),
      WarehouseId: Number(warehouse.WarehouseId || warehouse.warehouseId || 0),
      PersonId: 0,
      PersonTitle: 'فروش',
      Description: 'خروج خودکار انبار بابت فاکتور فروش' + (invoiceKey ? ' شماره ' + invoiceKey : ''),
      Username: 'Kiosk',
      Items: issueItems
    };

    const response = await originalFetch(bootstrap.analysisBase + '/document/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(request)
    });
    const result = await response.json();
    if (!result || !result.status) throw new Error((result && result.message) || 'خطا در ثبت خروج خودکار انبار');

    if (invoiceKey) rememberIssuedInvoice(invoiceKey);
    saveDocumentDetail(request, result);
  }

  async function handleGetGoods(input, init) {
    const response = await originalFetch(input, init);
    if (!shouldFilterKioskGoods()) return response;

    try {
      const serviceUrl = typeof input === 'string' ? input : input.url;
      const analysis = await getAnalysis(serviceUrl);
      const goodsUsage = Array.isArray(analysis.goods) ? analysis.goods : [];
      const usageMap = new Map();
      goodsUsage.forEach(function (item) {
        usageMap.set(Number(item.GoodsId), item);
      });

      const payload = await response.clone().json();
      return jsonResponse(filterGoodsPayload(payload, usageMap), response.status);
    } catch (_error) {
      return response;
    }
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
      const requestedItems = normalizeItemsFromBody(await readRequestBody(input, init));
      const response = await originalFetch(bootstrap.analysisBase + '/check-invoice-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Items: requestedItems }),
      });
      const result = await response.json();
      const shortages = Array.isArray(result.shortages) ? result.shortages : [];

      if (!result.shouldCheck) {
        return jsonResponse({ status: true, data: [] });
      }

      const data = shortages.map(function (item) {
        return {
          GoodsId: item.GoodsId,
          GoodsName: item.GoodsName,
          CurrentStock: item.CurrentQuantity,
          RequiredQuantity: item.RequiredQuantity,
          ShortageQuantity: item.ShortageQuantity,
          HaveInventory: false,
        };
      });

      if (result.canSubmit) {
        return jsonResponse({ status: true, warningOnly: result.warningOnly === true, data: data, message: result.message });
      }

      return jsonResponse({ status: true, data: data, message: result.message });
    } catch (_error) {
      return originalFetch(input, init);
    }
  }

  async function handleSendInvoice(input, init) {
    const response = await originalFetch(input, init);
    try {
      const serviceUrl = typeof input === 'string' ? input : input.url;
      const bodyText = await readRequestBody(input, init);
      const result = await response.clone().json();
      if (result && result.status) {
        try {
          await saveSaleStockIssue(serviceUrl, bodyText, result);
        } catch (issueError) {
          console.error('خطا در خروج خودکار انبار بعد از فروش:', issueError);
          if (window.pargasToast && window.pargasToast.error) {
            window.pargasToast.error(issueError && issueError.message ? issueError.message : 'فاکتور ثبت شد ولی خروج انبار ثبت نشد');
          }
        }
      }
      return jsonResponse(result, response.status);
    } catch (_error) {
      return response;
    }
  }

  window.fetch = function (input, init) {
    if (isTargetUrl(input, '/havestock')) return handleHaveStock(input, init);
    if (isTargetUrl(input, '/checkstock')) return handleCheckStock(input, init);
    if (isTargetUrl(input, '/getgoods')) return handleGetGoods(input, init);
    if (isTargetUrl(input, '/printers') || isTargetUrl(input, '/printersscale')) return handleSendInvoice(input, init);
    return originalFetch(input, init);
  };
})();
