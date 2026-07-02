type Column<T> = { key: keyof T; title: string };

function xmlEscape(value: any) {
    return (value ?? "")
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function excelCell(value: any) {
    const type = typeof value === "number" && Number.isFinite(value) ? "Number" : "String";
    return `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
}

export function exportToExcel<T extends Record<string, any>>(
    rows: T[],
    columns: Column<T>[],
    fileName: string
) {
    const header = columns.map((c) => excelCell(c.title)).join("");
    const body = rows
        .map((row) => `<Row>${columns.map((c) => excelCell(row[c.key])).join("")}</Row>`)
        .join("");

    const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Font ss:FontName="Tahoma" ss:Size="11"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Font ss:FontName="Tahoma" ss:Size="11" ss:Bold="1"/>
   <Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="گزارش">
  <Table>
   <Row ss:StyleID="Header">${header}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob(["\ufeff", workbook], {
        type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.endsWith(".xls") ? fileName : `${fileName}.xls`;
    a.click();
    URL.revokeObjectURL(url);
}

export function exportToCsv<T extends Record<string, any>>(
    rows: T[],
    columns: Column<T>[],
    fileName: string
) {
    const escape = (v: any) => {
        const s = (v ?? "").toString().replace(/"/g, '""');
        return `"${s}"`;
    };

    const header = columns.map((c) => escape(c.title)).join(",");
    const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(",")).join("\n");
    const csv = header + "\n" + body;

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
