(function () {
  const ENHANCED_CLASS = 'enhanced-table-picker';
  let activeSelection = null;
  let selectedGroupName = '';

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function stripOccupied(text) {
    return normalizeText(text).replace(/\s*-\s*اشغال\s*$/g, '').trim();
  }

  function parseOption(option) {
    const raw = stripOccupied(option.textContent || option.innerText || '');
    const parts = raw.split(' - ').map(normalizeText).filter(Boolean);
    const firstPart = parts[0] || raw || 'میز';
    const group = parts.length > 1 ? parts[parts.length - 1] : 'همه میزها';
    const codeMatch = firstPart.match(/\((.*?)\)/);
    const code = codeMatch ? codeMatch[1] : '';
    const title = normalizeText(firstPart.replace(/\(.*?\)/g, '')) || firstPart;

    return {
      id: option.value,
      title,
      code,
      group,
      disabled: option.disabled,
      selected: option.selected,
      originalText: raw,
    };
  }

  function getTables(select) {
    return Array.from(select.options || [])
      .filter(option => Number(option.value) > 0)
      .map(parseOption);
  }

  function getGroups(tables) {
    const groups = [];
    tables.forEach(table => {
      if (!groups.includes(table.group)) groups.push(table.group);
    });
    return groups.length ? groups : ['همه میزها'];
  }

  function findSelectedTable(select) {
    const option = select.options[select.selectedIndex];
    if (!option || Number(option.value) <= 0) return null;
    return parseOption(option);
  }

  function ensureUi(selection) {
    if (selection.classList.contains(ENHANCED_CLASS)) return;

    const select = selection.querySelector('select');
    if (!select) return;

    selection.classList.add(ENHANCED_CLASS);

    const title = document.createElement('div');
    title.className = 'kiosk-selected-table-title';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kiosk-table-picker-button';

    selection.insertBefore(title, selection.firstChild);
    selection.insertBefore(button, select.nextSibling);

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      openModal(selection);
    });

    select.addEventListener('change', function () {
      updateSelectionUi(selection);
    });

    updateSelectionUi(selection);
  }

  function updateSelectionUi(selection) {
    const select = selection.querySelector('select');
    const button = selection.querySelector('.kiosk-table-picker-button');
    const title = selection.querySelector('.kiosk-selected-table-title');
    if (!select || !button || !title) return;

    const selected = findSelectedTable(select);
    if (selected) {
      selection.classList.add('has-selected-table');
      title.textContent = `میز انتخاب شده: ${selected.title}${selected.code ? ' - ' + selected.code : ''}`;
      button.textContent = 'تغییر میز';
    } else {
      selection.classList.remove('has-selected-table');
      title.textContent = '';
      button.textContent = 'انتخاب میز';
    }
  }

  function buildModal(selection) {
    const select = selection.querySelector('select');
    const tables = getTables(select);
    const groups = getGroups(tables);
    const selected = findSelectedTable(select);
    const defaultGroup = selected?.group || groups[0] || 'همه میزها';
    selectedGroupName = groups.includes(selectedGroupName) ? selectedGroupName : defaultGroup;

    const overlay = document.createElement('div');
    overlay.className = 'kiosk-table-modal-overlay';
    overlay.innerHTML = `
      <div class="kiosk-table-modal" role="dialog" aria-modal="true">
        <div class="kiosk-table-modal-header">
          <div class="kiosk-table-modal-title-wrap">
            <h3 class="kiosk-table-modal-title">انتخاب میز سالن</h3>
            <div class="kiosk-table-modal-subtitle">ابتدا دسته‌بندی میز را انتخاب کنید، سپس میز مورد نظر را لمس کنید.</div>
          </div>
          <button type="button" class="kiosk-table-modal-close" aria-label="بستن">×</button>
        </div>
        <div class="kiosk-table-group-tabs"></div>
        <div class="kiosk-table-grid-wrap">
          <div class="kiosk-table-grid"></div>
        </div>
      </div>
    `;

    const tabs = overlay.querySelector('.kiosk-table-group-tabs');
    const grid = overlay.querySelector('.kiosk-table-grid');

    function renderTabs() {
      tabs.innerHTML = '';
      groups.forEach(group => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'kiosk-table-group-tab' + (group === selectedGroupName ? ' active' : '');
        tab.textContent = group;
        tab.addEventListener('click', function () {
          selectedGroupName = group;
          renderTabs();
          renderTables();
        });
        tabs.appendChild(tab);
      });
    }

    function renderTables() {
      const currentSelectedId = String(select.value || '0');
      const filtered = tables.filter(table => table.group === selectedGroupName);
      grid.innerHTML = '';

      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'kiosk-table-empty';
        empty.textContent = 'میزی در این دسته‌بندی وجود ندارد';
        grid.appendChild(empty);
        return;
      }

      filtered.forEach(table => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = [
          'kiosk-table-card',
          table.disabled ? 'occupied' : '',
          String(table.id) === currentSelectedId ? 'selected' : '',
        ].filter(Boolean).join(' ');

        card.innerHTML = `
          <div class="kiosk-table-icon">${table.disabled ? '🚫' : '🪑'}</div>
          <div class="kiosk-table-title"></div>
          <div class="kiosk-table-meta"></div>
          <div class="kiosk-table-status">${table.disabled ? 'اشغال' : 'آزاد'}</div>
        `;

        card.querySelector('.kiosk-table-title').textContent = table.title;
        card.querySelector('.kiosk-table-meta').textContent = table.code ? `کد: ${table.code}` : table.group;

        if (!table.disabled) {
          card.addEventListener('click', function () {
            select.value = table.id;
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
            updateSelectionUi(selection);
            closeModal();
          });
        }

        grid.appendChild(card);
      });
    }

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeModal();
    });

    overlay.querySelector('.kiosk-table-modal-close').addEventListener('click', closeModal);

    renderTabs();
    renderTables();

    return overlay;
  }

  function openModal(selection) {
    closeModal();
    activeSelection = selection;
    const modal = buildModal(selection);
    document.body.appendChild(modal);
  }

  function closeModal() {
    const existing = document.querySelector('.kiosk-table-modal-overlay');
    if (existing) existing.remove();
    activeSelection = null;
  }

  function enhanceAll() {
    document.querySelectorAll('.kiosk-table-selection').forEach(ensureUi);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeModal();
  });

  const observer = new MutationObserver(function () {
    enhanceAll();
    document.querySelectorAll('.kiosk-table-selection.enhanced-table-picker').forEach(updateSelectionUi);
  });

  function init() {
    enhanceAll();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
