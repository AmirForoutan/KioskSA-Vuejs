(function () {
  if (window.__desktopTabsPermissionsStateInstalled) return;
  window.__desktopTabsPermissionsStateInstalled = true;

  var BASE_TAB_WORDS = [
    'کالاها', 'کالا', 'دسته بندیها', 'دسته‌بندی‌ها', 'دسته بندی ها', 'دسته',
    'تاپینگ ها', 'تاپینگ‌ها', 'تاپینگ', 'مشتری', 'مشتریان',
    'کاربران', 'دسترسی', 'کاربران و دسترسی', 'گروه کالا', 'واحدها', 'واحد'
  ];

  function text(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function isBaseTabButton(btn) {
    if (!btn || !btn.closest || btn.closest('.inventory-tab')) return false;
    var value = text(btn);
    if (!value || value.length > 40) return false;
    return BASE_TAB_WORDS.some(function (word) { return value.indexOf(word) >= 0; });
  }

  function isInventoryTabButton(btn) {
    return !!(btn && btn.closest && btn.closest('.inventory-tab .inv-tabs'));
  }

  function updateBaseTabGroup(clicked) {
    if (!clicked || !isBaseTabButton(clicked)) return;
    var scope = clicked.closest('.base-info-tab, .desktop-tab, section, .dw-content') || document;
    Array.prototype.slice.call(scope.querySelectorAll('button')).forEach(function (btn) {
      if (isBaseTabButton(btn)) {
        btn.classList.remove('pargas-selected-tab');
        btn.setAttribute('aria-selected', 'false');
      }
    });
    clicked.classList.add('pargas-selected-tab');
    clicked.setAttribute('aria-selected', 'true');
  }

  function syncInventoryTabs() {
    Array.prototype.slice.call(document.querySelectorAll('.inventory-tab .inv-tabs')).forEach(function (nav) {
      var active = nav.querySelector('button.active');
      Array.prototype.slice.call(nav.querySelectorAll('button')).forEach(function (btn) {
        var selected = btn === active;
        btn.classList.toggle('pargas-selected-tab', selected);
        btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
    });
  }

  function inferActiveTabs() {
    syncInventoryTabs();
    Array.prototype.slice.call(document.querySelectorAll('.dw-content button')).forEach(function (btn) {
      var className = String(btn.className || '').toLowerCase();
      if (isBaseTabButton(btn) && (className.indexOf('active') >= 0 || className.indexOf('selected') >= 0 || btn.getAttribute('aria-selected') === 'true')) {
        updateBaseTabGroup(btn);
      }
    });
  }

  function isPermissionArea(el) {
    if (!el || !el.closest || el.closest('.inventory-tab')) return false;
    var area = el.closest('[class*="permission" i], [class*="access" i], [class*="role" i], [class*="user" i], [class*="auth" i], section, .dw-content');
    if (!area) return false;
    var areaText = text(area).slice(0, 500);
    return areaText.indexOf('دسترسی') >= 0 || areaText.indexOf('نقش') >= 0 || areaText.indexOf('کاربر') >= 0 || String(area.className || '').toLowerCase().match(/permission|access|role|user|auth/);
  }

  function clearInventoryPermissionMarks() {
    Array.prototype.slice.call(document.querySelectorAll('.inventory-tab .pargas-permission-checked, .inventory-tab .pargas-permission-unchecked')).forEach(function (el) {
      el.classList.remove('pargas-permission-checked', 'pargas-permission-unchecked');
    });
    Array.prototype.slice.call(document.querySelectorAll('.inventory-tab input[type="checkbox"][data-pargas-checked]')).forEach(function (el) {
      el.removeAttribute('data-pargas-checked');
    });
  }

  function syncPermissionCheckboxes() {
    clearInventoryPermissionMarks();
    Array.prototype.slice.call(document.querySelectorAll('.dw-content input[type="checkbox"]')).forEach(function (checkbox) {
      if (!isPermissionArea(checkbox)) return;
      var row = checkbox.closest('tr, li, label, .permission-item, .access-item, .role-permission, .form-check, div');
      if (!row || row.closest('.inventory-tab')) return;
      row.classList.toggle('pargas-permission-checked', !!checkbox.checked);
      row.classList.toggle('pargas-permission-unchecked', !checkbox.checked);
      checkbox.setAttribute('data-pargas-checked', checkbox.checked ? '1' : '0');
    });
  }

  document.addEventListener('click', function (event) {
    var btn = event.target && event.target.closest ? event.target.closest('.dw-content button') : null;
    if (!btn) return;
    window.setTimeout(function () {
      if (isInventoryTabButton(btn)) syncInventoryTabs();
      else updateBaseTabGroup(btn);
      inferActiveTabs();
    }, 30);
  }, true);

  document.addEventListener('change', function (event) {
    if (event.target && event.target.matches && event.target.matches('.dw-content input[type="checkbox"]')) {
      syncPermissionCheckboxes();
    }
  }, true);

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      inferActiveTabs();
      syncPermissionCheckboxes();
    }, 100);
  }

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'checked', 'aria-selected'] });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }
})();
