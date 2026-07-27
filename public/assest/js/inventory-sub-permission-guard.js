(function () {
  if (window.__inventorySubPermissionGuardInstalled) return;
  window.__inventorySubPermissionGuardInstalled = true;

  var TAB_PERMISSIONS = [
    { title: 'تنظیمات و کالاها', view: 'view.inventory.settings', manage: 'manage.inventory.settings' },
    { title: 'اسناد انبار', view: 'view.inventory.documents', manage: 'manage.inventory.documents' },
    { title: 'گزارش موجودی', view: 'view.inventory.reports', manage: 'view.inventory.reports' },
    { title: 'کاردکس کالا', view: 'view.inventory.kardex', manage: 'view.inventory.kardex' },
    { title: 'انبارگردانی', view: 'view.inventory.stocktaking', manage: 'manage.inventory.stocktaking' },
    { title: 'تأمین‌کننده‌ها', view: 'view.inventory.suppliers', manage: 'manage.inventory.suppliers' },
    { title: 'تامین‌کننده‌ها', view: 'view.inventory.suppliers', manage: 'manage.inventory.suppliers' },
    { title: 'سابقه تغییرات', view: 'view.inventory.history', manage: 'view.inventory.history' }
  ];

  function getPermissions() {
    try {
      var user = JSON.parse(sessionStorage.getItem('desktop-auth-user') || 'null');
      return Array.isArray(user && user.permissions) ? user.permissions : [];
    } catch (_) {
      return [];
    }
  }

  function hasAny(perms, keys) {
    if (perms.indexOf('manage.inventory') >= 0 || perms.indexOf('view.inventory') >= 0) return true;
    return keys.some(function (key) { return perms.indexOf(key) >= 0; });
  }

  function findRule(button) {
    var value = (button.textContent || '').replace(/\s+/g, ' ').trim();
    return TAB_PERMISSIONS.find(function (rule) { return value.indexOf(rule.title) >= 0; });
  }

  function guardInventoryTabs() {
    var inventory = document.querySelector('.inventory-tab');
    if (!inventory) return;
    var nav = inventory.querySelector('.inv-tabs');
    if (!nav) return;

    var perms = getPermissions();
    var buttons = Array.prototype.slice.call(nav.querySelectorAll('button'));
    var visibleButtons = [];

    buttons.forEach(function (button) {
      var rule = findRule(button);
      var allowed = !rule || hasAny(perms, [rule.view, rule.manage]);
      button.hidden = !allowed;
      button.style.display = allowed ? '' : 'none';
      button.disabled = !allowed;
      if (allowed) visibleButtons.push(button);
    });

    var activeButton = buttons.find(function (button) { return button.classList.contains('active') && !button.hidden; });
    if (!activeButton && visibleButtons.length) {
      visibleButtons[0].click();
    }

    if (!visibleButtons.length) {
      var msg = inventory.querySelector('.inventory-no-sub-permission');
      if (!msg) {
        msg = document.createElement('div');
        msg.className = 'inventory-no-sub-permission inv-warning';
        msg.textContent = 'برای این نقش، هیچ زیرمجموعه‌ای از انبار فعال نشده است.';
        nav.insertAdjacentElement('afterend', msg);
      }
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      guardInventoryTabs();
    }, 80);
  }

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
})();
