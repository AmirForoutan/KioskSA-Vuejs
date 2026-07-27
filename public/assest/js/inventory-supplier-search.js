(function () {
  if (window.__inventorySupplierSearchInstalled) return;
  window.__inventorySupplierSearchInstalled = true;

  var SEARCH_DELAY_MS = 3000;
  var MIN_SEARCH_LENGTH = 3;
  var activeWrapper = null;

  function isSupplierSelect(select) {
    if (!select || select.dataset.supplierSearchEnhanced === '1') return false;
    var first = select.options && select.options[0] ? select.options[0].textContent || '' : '';
    return first.indexOf('تأمین‌کننده') >= 0 || first.indexOf('تامين‌کننده') >= 0 || first.indexOf('تامین‌کننده') >= 0;
  }

  function getOptions(select) {
    return Array.prototype.slice.call(select.options || [])
      .filter(function (option) { return option.value && option.value !== '0'; })
      .map(function (option) {
        return {
          value: option.value,
          text: (option.textContent || '').trim(),
        };
      });
  }

  function dispatchVueChange(select) {
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function closeAllExcept(wrapper) {
    Array.prototype.slice.call(document.querySelectorAll('.inventory-supplier-search-dropdown')).forEach(function (dropdown) {
      if (!wrapper || !wrapper.contains(dropdown)) {
        dropdown.style.display = 'none';
      }
    });
  }

  function enhanceSelect(select) {
    if (!isSupplierSelect(select)) return;
    select.dataset.supplierSearchEnhanced = '1';

    var wrapper = document.createElement('div');
    wrapper.className = 'inventory-supplier-search-enhancer';

    var input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = 'جستجوی تأمین‌کننده؛ حداقل ۳ کاراکتر';
    input.className = 'inventory-supplier-search-input';

    var helper = document.createElement('div');
    helper.className = 'inventory-supplier-search-helper';
    helper.textContent = 'نام، کد یا تلفن تأمین‌کننده را بنویس';

    var dropdown = document.createElement('div');
    dropdown.className = 'inventory-supplier-search-dropdown';
    dropdown.style.display = 'none';

    var clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'inventory-supplier-search-clear';
    clearButton.textContent = '×';
    clearButton.style.display = 'none';

    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(input);
    wrapper.appendChild(clearButton);
    wrapper.appendChild(helper);
    wrapper.appendChild(dropdown);

    select.style.display = 'none';

    var timer = null;

    function syncFromSelect() {
      var selected = select.options[select.selectedIndex];
      if (selected && selected.value && selected.value !== '0') {
        input.value = (selected.textContent || '').trim();
        clearButton.style.display = 'block';
        helper.textContent = 'تأمین‌کننده انتخاب شده است';
      } else if (!input.value) {
        clearButton.style.display = 'none';
        helper.textContent = 'نام، کد یا تلفن تأمین‌کننده را بنویس';
      }
    }

    function closeDropdown() {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }

    function renderResults(keyword) {
      var q = keyword.trim().toLowerCase();
      var rows = getOptions(select).filter(function (item) {
        return item.text.toLowerCase().indexOf(q) >= 0 || String(item.value).indexOf(q) >= 0;
      }).slice(0, 12);

      activeWrapper = wrapper;
      closeAllExcept(wrapper);
      dropdown.innerHTML = '';

      if (!rows.length) {
        var empty = document.createElement('div');
        empty.className = 'inventory-supplier-search-empty';
        empty.textContent = 'تأمین‌کننده‌ای پیدا نشد.';
        dropdown.appendChild(empty);
        dropdown.style.display = 'block';
        return;
      }

      rows.forEach(function (item) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'inventory-supplier-search-result';
        button.innerHTML = '<strong>' + item.text + '</strong><small>کد/شناسه: ' + item.value + '</small>';
        button.addEventListener('mousedown', function (event) {
          event.preventDefault();
        });
        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          select.value = item.value;
          input.value = item.text;
          clearButton.style.display = 'block';
          helper.textContent = 'تأمین‌کننده انتخاب شده است';
          closeDropdown();
          dispatchVueChange(select);
        });
        dropdown.appendChild(button);
      });

      dropdown.style.display = 'block';
    }

    input.addEventListener('input', function () {
      var value = input.value.trim();
      select.value = '0';
      dispatchVueChange(select);
      clearButton.style.display = value ? 'block' : 'none';
      closeDropdown();

      if (timer) window.clearTimeout(timer);

      if (value.length < MIN_SEARCH_LENGTH) {
        helper.textContent = value ? 'حداقل ۳ کاراکتر وارد کن' : 'نام، کد یا تلفن تأمین‌کننده را بنویس';
        return;
      }

      helper.textContent = '۳ ثانیه بعد جستجو شروع می‌شود...';
      timer = window.setTimeout(function () {
        helper.textContent = 'نتایج جستجو؛ برای انتخاب روی مورد بزن';
        renderResults(value);
      }, SEARCH_DELAY_MS);
    });

    input.addEventListener('focus', function () {
      activeWrapper = wrapper;
      closeAllExcept(wrapper);
      if (input.value.trim().length >= MIN_SEARCH_LENGTH) {
        if (dropdown.children.length) dropdown.style.display = 'block';
        else renderResults(input.value.trim());
      }
    });

    clearButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      input.value = '';
      select.value = '0';
      clearButton.style.display = 'none';
      helper.textContent = 'نام، کد یا تلفن تأمین‌کننده را بنویس';
      closeDropdown();
      if (timer) window.clearTimeout(timer);
      dispatchVueChange(select);
      input.focus();
    });

    wrapper.addEventListener('click', function (event) {
      event.stopPropagation();
    });

    select.addEventListener('change', syncFromSelect);
    syncFromSelect();
  }

  document.addEventListener('click', function (event) {
    if (activeWrapper && event.target && activeWrapper.contains(event.target)) return;
    closeAllExcept(null);
  }, true);

  function scan() {
    var inventory = document.querySelector('.inventory-tab');
    if (!inventory) return;
    Array.prototype.slice.call(inventory.querySelectorAll('select')).forEach(enhanceSelect);
  }

  var observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();
