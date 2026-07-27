(function () {
  if (window.__desktopTabsPermissionsStateInstalled) return;
  window.__desktopTabsPermissionsStateInstalled = true;

  function text(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function isBaseTabButton(btn) {
    return !!(btn && btn.matches && btn.matches('.bi-side > .bi-side-btn'));
  }

  function isInventoryTabButton(btn) {
    return !!(btn && btn.closest && btn.closest('.inventory-tab .inv-tabs'));
  }

  function updateBaseTabGroup(clicked) {
    if (!clicked || !isBaseTabButton(clicked)) return;
    var side = clicked.closest('.bi-side');
    if (!side) return;
    Array.prototype.slice.call(side.querySelectorAll(':scope > .bi-side-btn')).forEach(function (btn) {
      var selected = btn === clicked || btn.classList.contains('active');
      btn.classList.toggle('pargas-selected-tab', selected);
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function syncBaseTabs() {
    Array.prototype.slice.call(document.querySelectorAll('.bi-side')).forEach(function (side) {
      var active = side.querySelector(':scope > .bi-side-btn.active');
      Array.prototype.slice.call(side.querySelectorAll(':scope > .bi-side-btn')).forEach(function (btn) {
        var selected = btn === active;
        btn.classList.toggle('pargas-selected-tab', selected);
        btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
    });
  }

  function syncInventoryTabs() {
    Array.prototype.slice.call(document.querySelectorAll('.inventory-tab .inv-tabs')).forEach(function (nav) {
      var active = nav.querySelector(':scope > button.active');
      Array.prototype.slice.call(nav.querySelectorAll(':scope > button')).forEach(function (btn) {
        var selected = btn === active;
        btn.classList.toggle('pargas-selected-tab', selected);
        btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
    });
  }

  function inferActiveTabs() {
    syncBaseTabs();
    syncInventoryTabs();
    cleanupNestedFalseTabs();
  }

  function cleanupNestedFalseTabs() {
    Array.prototype.slice.call(document.querySelectorAll('.m-tools .tabs button.pargas-selected-tab, .m-tools .tabs button[aria-selected]')).forEach(function (btn) {
      btn.classList.remove('pargas-selected-tab');
      btn.removeAttribute('aria-selected');
    });
  }

  function syncPermissionButtons() {
    Array.prototype.slice.call(document.querySelectorAll('.u-perms .perm')).forEach(function (button) {
      var selected = button.classList.contains('on');
      button.classList.toggle('pargas-access-on', selected);
      button.classList.toggle('pargas-access-off', !selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.setAttribute('data-access-state', selected ? 'دسترسی دارد' : 'بدون دسترسی');
    });
  }

  document.addEventListener('click', function (event) {
    var btn = event.target && event.target.closest ? event.target.closest('.dw-content button') : null;
    if (!btn) return;
    window.setTimeout(function () {
      if (isInventoryTabButton(btn)) syncInventoryTabs();
      else if (isBaseTabButton(btn)) updateBaseTabGroup(btn);
      cleanupNestedFalseTabs();
      syncPermissionButtons();
    }, 30);
  }, true);

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      inferActiveTabs();
      syncPermissionButtons();
    }, 100);
  }

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected'] });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }
})();
