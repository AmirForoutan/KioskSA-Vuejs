(function () {
  if (window.__desktopTabsPermissionsStateInstalled) return;
  window.__desktopTabsPermissionsStateInstalled = true;

  function text(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function isBaseTabButton(btn) {
    if (!btn) return false;
    var value = text(btn);
    return ['کالاها', 'دسته بندیها', 'دسته‌بندی‌ها', 'دسته بندی ها', 'تاپینگ ها', 'تاپینگ‌ها', 'کاربران', 'دسترسی', 'کاربران و دسترسی', 'گروه کالا', 'واحدها'].some(function (word) {
      return value.indexOf(word) >= 0;
    });
  }

  function updateTabGroup(clicked) {
    if (!clicked || !isBaseTabButton(clicked)) return;
    var parent = clicked.parentElement;
    if (!parent) return;
    Array.prototype.slice.call(parent.querySelectorAll('button')).forEach(function (btn) {
      if (isBaseTabButton(btn)) {
        btn.classList.remove('pargas-selected-tab');
        btn.setAttribute('aria-selected', 'false');
      }
    });
    clicked.classList.add('pargas-selected-tab');
    clicked.setAttribute('aria-selected', 'true');
  }

  function inferActiveTabs() {
    Array.prototype.slice.call(document.querySelectorAll('.dw-content button')).forEach(function (btn) {
      var className = String(btn.className || '').toLowerCase();
      if (isBaseTabButton(btn) && (className.indexOf('active') >= 0 || className.indexOf('selected') >= 0 || btn.getAttribute('aria-selected') === 'true')) {
        updateTabGroup(btn);
      }
    });
  }

  function syncPermissionCheckboxes() {
    Array.prototype.slice.call(document.querySelectorAll('.dw-content input[type="checkbox"]')).forEach(function (checkbox) {
      var row = checkbox.closest('tr, li, label, .permission-item, .access-item, .role-permission, .form-check, div');
      if (!row) return;
      row.classList.toggle('pargas-permission-checked', !!checkbox.checked);
      row.classList.toggle('pargas-permission-unchecked', !checkbox.checked);
      checkbox.setAttribute('data-pargas-checked', checkbox.checked ? '1' : '0');
    });
  }

  document.addEventListener('click', function (event) {
    var btn = event.target && event.target.closest ? event.target.closest('.dw-content button') : null;
    if (btn) {
      window.setTimeout(function () { updateTabGroup(btn); inferActiveTabs(); }, 30);
    }
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
