(function () {
  if (window.__pargasTableStatusColorsFixInstalled) return;
  window.__pargasTableStatusColorsFixInstalled = true;

  var STATUS_CLASSES = [
    'pargas-table-status-free',
    'pargas-table-status-occupied',
    'pargas-table-status-reserved',
    'pargas-table-status-disabled'
  ];

  var CONTAINER_CLASSES = [
    'dw-content',
    'dw-shell',
    'sales-tab',
    'tables-tab',
    'sales-panel',
    'tables-panel',
    'table-panel',
    'hall-panel',
    'order-panel',
    'cart-panel',
    'items-panel',
    'products-panel',
    'categories-panel',
    'table-list',
    'tables-list',
    'hall-list',
    'table-grid',
    'tables-grid'
  ];

  function textOf(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function hasClass(el, className) {
    return el && el.classList && el.classList.contains(className);
  }

  function isContainer(el) {
    if (!el || !el.classList) return false;
    return CONTAINER_CLASSES.some(function (className) { return el.classList.contains(className); });
  }

  function isRealTableCandidate(el) {
    if (!el || !el.classList || isContainer(el)) return false;

    var cls = String(el.className || '').toLowerCase();
    var role = String(el.getAttribute('role') || '').toLowerCase();
    var tag = String(el.tagName || '').toLowerCase();
    var text = textOf(el);

    var hasSpecificTableClass =
      cls.indexOf('table-card') >= 0 ||
      cls.indexOf('table-item') >= 0 ||
      cls.indexOf('hall-table') >= 0 ||
      cls.indexOf('tables-card') >= 0 ||
      cls.indexOf('table-box') >= 0 ||
      cls.indexOf('table-cell') >= 0 ||
      cls.indexOf('desk-card') >= 0 ||
      cls.indexOf('table-button') >= 0 ||
      cls.indexOf('tablebtn') >= 0;

    var hasStatusClass =
      cls.indexOf('table-status') >= 0 ||
      cls.indexOf('occupied') >= 0 ||
      cls.indexOf('busy') >= 0 ||
      cls.indexOf('reserved') >= 0 ||
      cls.indexOf('available') >= 0 ||
      cls.indexOf('free') >= 0;

    var isClickable = tag === 'button' || role === 'button' || typeof el.onclick === 'function';
    var looksSmallEnough = text.length <= 90;
    var hasTableWord = text.indexOf('میز') >= 0 || cls.indexOf('table') >= 0 || cls.indexOf('desk') >= 0;

    return hasSpecificTableClass || (isClickable && looksSmallEnough && hasTableWord) || (hasStatusClass && looksSmallEnough && hasTableWord);
  }

  function findStatus(text) {
    if (!text) return '';
    var lower = text.toLowerCase();
    if (text.indexOf('غیرفعال') >= 0 || text.indexOf('غیر فعال') >= 0 || lower.indexOf('disabled') >= 0) return 'disabled';
    if (text.indexOf('اشغال') >= 0 || text.indexOf('مشغول') >= 0 || text.indexOf('دارای سفارش') >= 0 || text.indexOf('درحال سرویس') >= 0 || text.indexOf('در حال سرویس') >= 0 || lower.indexOf('occupied') >= 0 || lower.indexOf('busy') >= 0) return 'occupied';
    if (text.indexOf('رزرو') >= 0 || lower.indexOf('reserved') >= 0) return 'reserved';
    if (text.indexOf('آزاد') >= 0 || text.indexOf('خالی') >= 0 || lower.indexOf('free') >= 0 || lower.indexOf('available') >= 0) return 'free';
    return '';
  }

  function statusFromClass(el) {
    var cls = String(el.className || '').toLowerCase();
    if (cls.indexOf('disabled') >= 0) return 'disabled';
    if (cls.indexOf('occupied') >= 0 || cls.indexOf('busy') >= 0) return 'occupied';
    if (cls.indexOf('reserved') >= 0) return 'reserved';
    if (cls.indexOf('available') >= 0 || cls.indexOf('free') >= 0) return 'free';
    return '';
  }

  function cleanWrongContainers() {
    CONTAINER_CLASSES.forEach(function (className) {
      Array.prototype.slice.call(document.querySelectorAll('.' + className)).forEach(function (el) {
        STATUS_CLASSES.forEach(function (statusClass) { el.classList.remove(statusClass); });
        if (el.getAttribute('data-pargas-table-status-fixed')) {
          el.removeAttribute('data-pargas-table-status-fixed');
        }
      });
    });
  }

  function applyStatus(target, status) {
    if (!target || !status || !isRealTableCandidate(target)) return;
    STATUS_CLASSES.forEach(function (className) {
      target.classList.remove(className);
    });
    target.classList.add('pargas-table-status-' + status);
    target.setAttribute('data-pargas-table-status-fixed', status);
  }

  function scan(root) {
    cleanWrongContainers();

    var scope = root && root.querySelectorAll ? root : document;
    var containers = Array.prototype.slice.call(scope.querySelectorAll('.dw-content, .table-modal, .tables-modal, .itemslist-table-modal, .table-selection-modal, .table-list, .tables-list'));
    if (!containers.length) containers = [scope];

    containers.forEach(function (container) {
      var nodes = Array.prototype.slice.call(container.querySelectorAll('button, [role="button"], .table-card, .table-item, .hall-table, .tables-card, .table-box, .table-cell, .desk-card, .table-button'));
      nodes.forEach(function (node) {
        if (!isRealTableCandidate(node)) return;
        var status = statusFromClass(node) || findStatus(textOf(node));
        if (status) applyStatus(node, status);
      });
    });
  }

  var scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      scan(document);
    }, 120);
  }

  var observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'data-status', 'data-table-status'] });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleScan);
  } else {
    scheduleScan();
  }
})();
