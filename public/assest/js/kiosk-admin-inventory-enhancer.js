(function () {
  if (window.__kioskAdminInventoryEnhancerInstalled) return;
  window.__kioskAdminInventoryEnhancerInstalled = true;

  var catalog = {
    goodsByCode: new Map(),
    groupsByCode: new Map(),
    loadedAt: 0,
    loading: false
  };

  function normalizeText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function truthy(value) {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  function valueOrZero(value) {
    var number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function readCode(card) {
    var match = normalizeText(card.textContent || '').match(/کد:\s*([^\s]+)/);
    return match ? match[1] : '';
  }

  async function readConfig() {
    var response = await fetch('./config.json', { cache: 'no-store' });
    return response.ok ? response.json() : {};
  }

  function serviceUrlFromConfig(config) {
    return String(config.ServiceAPIAddress || config.ServiceAddress || config.apiAddress || '').replace(/\/$/, '');
  }

  function baseInfoUrl(baseUrl, endpoint) {
    var cleanBase = String(baseUrl || '').replace(/\/$/, '');
    return cleanBase + endpoint + '?catalogContext=baseinfo';
  }

  async function postCatalog(baseUrl, endpoint) {
    var response = await fetch(baseInfoUrl(baseUrl, endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: JSON.stringify({ ConnectionsId: 0, IncludeInactive: true, IncludeAll: true })
    });

    if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + endpoint);
    return response.json();
  }

  function unwrapArray(payload, keys) {
    if (Array.isArray(payload)) return payload;
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(payload && payload[keys[i]])) return payload[keys[i]];
    }
    return [];
  }

  async function loadCatalog() {
    if (catalog.loading) return;
    if (Date.now() - catalog.loadedAt < 45000 && catalog.goodsByCode.size) return;

    catalog.loading = true;
    try {
      var config = await readConfig();
      var serviceUrl = serviceUrlFromConfig(config);
      if (!serviceUrl) return;

      var results = await Promise.all([
        postCatalog(serviceUrl, '/getgoods'),
        postCatalog(serviceUrl, '/getgoodsgroup')
      ]);

      var goods = unwrapArray(results[0], ['Goods', 'Products', 'goods', 'products']);
      var groups = unwrapArray(results[1], ['GoodsGroup', 'Groups', 'Categories', 'categories']);

      catalog.goodsByCode = new Map();
      catalog.groupsByCode = new Map();

      goods.forEach(function (item) {
        catalog.goodsByCode.set(String(item.GoodsCode || ''), item);
      });

      groups.forEach(function (item) {
        catalog.groupsByCode.set(String(item.GroupCode || ''), item);
      });

      catalog.loadedAt = Date.now();
    } catch (error) {
      console.warn('kiosk admin inventory enhancer failed', error);
    } finally {
      catalog.loading = false;
    }
  }

  function badge(text, state) {
    var span = document.createElement('span');
    span.textContent = text;
    if (state === true) span.className = 'ok';
    if (state === false) span.className = 'off';
    return span;
  }

  function productBadges(product) {
    var box = document.createElement('div');
    box.className = 'kiosk-admin-inventory-badges';
    box.appendChild(badge(truthy(product.IsActive) ? 'فعال' : 'غیرفعال', truthy(product.IsActive)));
    box.appendChild(badge(product.IsKioskVisible === false ? 'عدم نمایش در کیوسک' : 'نمایش در کیوسک', product.IsKioskVisible !== false));
    box.appendChild(badge(product.IsSellable === false ? 'فروش PC غیرفعال' : 'فروش PC فعال', product.IsSellable !== false));
    box.appendChild(badge(product.IsPurchasable === false ? 'خرید غیرفعال' : 'قابل خرید', product.IsPurchasable !== false));
    box.appendChild(badge('حداقل: ' + valueOrZero(product.MinStock), null));
    box.appendChild(badge('حداکثر: ' + valueOrZero(product.MaxStock), null));
    box.appendChild(badge('نقطه سفارش: ' + valueOrZero(product.ReorderPoint), null));
    return box;
  }

  function categoryBadges(group) {
    var box = document.createElement('div');
    box.className = 'kiosk-admin-inventory-badges';
    box.appendChild(badge(truthy(group.IsActive) ? 'فعال' : 'غیرفعال', truthy(group.IsActive)));
    box.appendChild(badge(group.IsKioskVisible === false ? 'عدم نمایش در کیوسک' : 'نمایش در کیوسک', group.IsKioskVisible !== false));
    return box;
  }

  function enhanceCards() {
    var root = document.querySelector('.admin-image-upload-container');
    if (!root) return;

    Array.prototype.slice.call(root.querySelectorAll('.item-card')).forEach(function (card) {
      if (card.dataset.kioskInventoryEnhanced === '1') return;
      var code = readCode(card);
      if (!code) return;
      var text = normalizeText(card.textContent || '');
      var isProduct = text.indexOf('قیمت:') >= 0 || text.indexOf('موجودی:') >= 0;
      var isCategory = text.indexOf('وضعیت:') >= 0 && text.indexOf('مالیات:') < 0 && text.indexOf('عوارض:') < 0;

      if (isProduct && catalog.goodsByCode.has(String(code))) {
        card.appendChild(productBadges(catalog.goodsByCode.get(String(code))));
        card.dataset.kioskInventoryEnhanced = '1';
      } else if (isCategory && catalog.groupsByCode.has(String(code))) {
        card.appendChild(categoryBadges(catalog.groupsByCode.get(String(code))));
        card.dataset.kioskInventoryEnhanced = '1';
      }
    });
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(async function () {
      scheduled = false;
      await loadCatalog();
      enhanceCards();
    }, 180);
  }

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
})();
