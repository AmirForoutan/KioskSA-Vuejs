(function () {
  if (window.__inventoryCsvToXlsxInstalled) return;
  window.__inventoryCsvToXlsxInstalled = true;

  function crc32(buf) {
    var table = crc32.table || (crc32.table = (function () {
      var c, table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        table[n] = c >>> 0;
      }
      return table;
    })());
    var crc = 0 ^ -1;
    for (var i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    return (crc ^ -1) >>> 0;
  }

  function u16(value) { return [value & 255, (value >>> 8) & 255]; }
  function u32(value) { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }

  function makeZip(files) {
    var encoder = new TextEncoder();
    var chunks = [];
    var central = [];
    var offset = 0;

    files.forEach(function (file) {
      var name = encoder.encode(file.name);
      var data = encoder.encode(file.content);
      var crc = crc32(data);
      var local = new Uint8Array([].concat(
        u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0)
      ));
      chunks.push(local, name, data);

      var centralHeader = new Uint8Array([].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset)
      ));
      central.push(centralHeader, name);
      offset += local.length + name.length + data.length;
    });

    var centralSize = central.reduce(function (sum, item) { return sum + item.length; }, 0);
    var centralOffset = offset;
    var end = new Uint8Array([].concat(
      u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
      u32(centralSize), u32(centralOffset), u16(0)
    ));

    var all = chunks.concat(central).concat([end]);
    var total = all.reduce(function (sum, item) { return sum + item.length; }, 0);
    var out = new Uint8Array(total);
    var pos = 0;
    all.forEach(function (item) { out.set(item, pos); pos += item.length; });
    return out;
  }

  function escapeXml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function parseCsv(text) {
    return text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).map(function (line) {
      return line.split(',').map(function (cell) { return cell.trim(); });
    });
  }

  function colName(index) {
    var name = '';
    index++;
    while (index > 0) {
      var rem = (index - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      index = Math.floor((index - 1) / 26);
    }
    return name;
  }

  function sheetXml(rows) {
    var body = rows.map(function (row, rIndex) {
      var cells = row.map(function (cell, cIndex) {
        var ref = colName(cIndex) + (rIndex + 1);
        var numeric = /^-?\d+(\.\d+)?$/.test(String(cell).replace(/,/g, ''));
        if (numeric) return '<c r="' + ref + '"><v>' + escapeXml(String(cell).replace(/,/g, '')) + '</v></c>';
        return '<c r="' + ref + '" t="inlineStr"><is><t>' + escapeXml(cell) + '</t></is></c>';
      }).join('');
      return '<row r="' + (rIndex + 1) + '">' + cells + '</row>';
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" rightToLeft="1"><sheetData>' + body + '</sheetData></worksheet>';
  }

  function workbookFiles(rows) {
    return [
      { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
      { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="گزارش انبار" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
      { name: 'xl/worksheets/sheet1.xml', content: sheetXml(rows) }
    ];
  }

  document.addEventListener('click', function (event) {
    var a = event.target && event.target.closest ? event.target.closest('a[download$=".csv"]') : null;
    if (!a || !a.href || a.dataset.xlsxConverted === '1') return;
    event.preventDefault();
    event.stopPropagation();

    fetch(a.href).then(function (response) { return response.text(); }).then(function (csv) {
      var rows = parseCsv(csv);
      var zip = makeZip(workbookFiles(rows));
      var blob = new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var xlsx = document.createElement('a');
      xlsx.href = URL.createObjectURL(blob);
      xlsx.download = String(a.download || 'inventory-report.csv').replace(/\.csv$/i, '.xlsx');
      xlsx.dataset.xlsxConverted = '1';
      document.body.appendChild(xlsx);
      xlsx.click();
      window.setTimeout(function () {
        URL.revokeObjectURL(xlsx.href);
        xlsx.remove();
      }, 1000);
    }).catch(function () {
      a.dataset.xlsxConverted = '1';
      a.click();
    });
  }, true);
})();
