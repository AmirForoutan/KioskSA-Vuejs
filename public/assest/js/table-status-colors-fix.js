(function () {
  if (window.__pargasTableStatusColorsFixInstalled) return;
  window.__pargasTableStatusColorsFixInstalled = true;

  var STATUS_CLASSES = [
    'pargas-table-status-free',
    'pargas-table-status-occupied',
    'pargas-table-status-reserved',
    'pargas-table-status-disabled'
  ];

  function textOf(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function hasTableMeaning(el) {
    if (!el) return false;
    var cls = String(el.className || '').toLowerCase();
    var id = String(el.id || '').toLowerCase();
    var text = textOf(el);
    return cls.indexOf('table') >= 0 ||
      cls.indexOf('tables') >= 0 ||
      cls.indexOf('hall') >= 0 ||
      cls.indexOf('desk') >= 0 ||
      id.indexOf('table') >= 0 ||
      id.indexOf('hall') >= 0 ||
      text.indexOf('میز') >= 0 ||
      text.indexOf('سالن') >= 0;
  }

  function findStatus(text) {
    if (!text) return '';
    if (text.indexOf('غیرفعال') >= 0 || text.indexOf('غیر فعال') >= 0 || text.toLowerCase().indexOf('disabled') >= 0) return 'disabled';
    if (text.indexOf('اشغال') >= 0 || text.indexOf('مشغول') >= 0 || text.indexOf('دارای سفارش') >= 0 || text.indexOf('درحال سرویس') >= 0 || text.indexOf('در حال سرویس') >= 0 || text.toLowerCase().indexOf('occupied') >= 0 || text.toLowerCase().indexOf('busy') >= 0) return 'occupied';
    if (text.indexOf('رزرو') >= 0 || text.toLowerCase().indexOf('reserved') >= 0) return 'reserved';
    if (text.indexOf('آزاد') >= 0 || text.indexOf('خالی') >= 0 || text.toLowerCase().indexOf('free') >= 0 || text.toLowerCase().indexOf('available') >= 0) return 'free';
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

  function targetFor(el) {
    if (!el) return null;
    var target = el.closest('button, [role="button"], .table-card, .table-item, .hall-table, .tables-card, .table-box, .table-cell, .desk-card, li, .card');
    if (target && hasTableMeaning(target)) return target;
    return hasTableMeaning(el) ? el : null;
  }

  function applyStatus(target, status) {
    if (!target || !status) return;
    STATUS_CLASSES.forEach(function (className) {
      target.classList.remove(className);
    });
    target.classList.add('pargas-table-status-' + status);
    target.setAttribute('data-pargas-table-status-fixed', status);
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var desktop = document.querySelector('.dw-content');
    var roots = [];

    if (desktop) roots.push(desktop);
    Array.prototype.slice.call(document.querySelectorAll('.table-modal, .tables-modal, .itemslist-table-modal, .table-selection-modal, .table-list, .tables-list')).forEach(function (item) {
      roots.push(item);
    });

    if (!roots.length) roots = [scope];

    roots.forEach(function (container) {
      var nodes = Array.prototype.slice.call(container.querySelectorAll('button, [role="button"], div, li, article, section'));
      nodes.forEach(function (node) {
        if (!hasTableMeaning(node)) return;
        var status = statusFromClass(node) || findStatus(textOf(node));
        var target = targetFor(node);
        if (target && status) applyStatus(target, status);
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
