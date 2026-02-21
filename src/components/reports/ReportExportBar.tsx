import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { ReportData } from "./reportDataGenerators";

interface Props {
  data: ReportData;
  title: string;
}

function exportCSV(data: ReportData, title: string) {
  const rows: string[][] = [];
  const header = ["Nome", ...data.datasets.map((ds) => ds.label)];
  rows.push(header);
  data.labels.forEach((label, i) => {
    const row = [label, ...data.datasets.map((ds) => String(ds.data[i] || 0))];
    rows.push(row);
  });
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExcel(data: ReportData, title: string) {
  const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let rows = "";
  // Header
  rows += "<Row>";
  rows += `<Cell><Data ss:Type="String">${escXml("Nome")}</Data></Cell>`;
  data.datasets.forEach((ds) => {
    rows += `<Cell><Data ss:Type="String">${escXml(ds.label)}</Data></Cell>`;
  });
  rows += "</Row>";
  // Data
  data.labels.forEach((label, i) => {
    rows += "<Row>";
    rows += `<Cell><Data ss:Type="String">${escXml(String(label))}</Data></Cell>`;
    data.datasets.forEach((ds) => {
      rows += `<Cell><Data ss:Type="Number">${ds.data[i] || 0}</Data></Cell>`;
    });
    rows += "</Row>";
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${escXml(title.substring(0, 31))}">
<Table>${rows}</Table>
</Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportPDF(data: ReportData, title: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

  let y = 38;
  if (data.summary.length > 0) {
    doc.setFontSize(12);
    doc.text("Resumo", 14, y);
    y += 8;
    doc.setFontSize(10);
    data.summary.forEach((s) => {
      doc.text(`${s.label}: ${s.value}`, 14, y);
      y += 6;
    });
    y += 4;
  }

  doc.setFontSize(12);
  doc.text("Dados", 14, y);
  y += 8;
  doc.setFontSize(9);

  const cols = ["Nome", ...data.datasets.map((ds) => ds.label)];
  const colWidths = cols.map(() => Math.floor(180 / cols.length));

  let x = 14;
  doc.setFont(undefined!, "bold");
  cols.forEach((col, i) => {
    doc.text(col, x, y);
    x += colWidths[i];
  });
  doc.setFont(undefined!, "normal");
  y += 6;

  data.labels.forEach((label, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    x = 14;
    doc.text(String(label).substring(0, 25), x, y);
    x += colWidths[0];
    data.datasets.forEach((ds, j) => {
      doc.text(String(ds.data[i] || 0), x, y);
      x += colWidths[j + 1];
    });
    y += 5;
  });

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function ReportExportBar({ data, title }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "pdf" | "excel") => {
    setExporting(format);
    try {
      if (format === "csv") exportCSV(data, title);
      else if (format === "excel") exportExcel(data, title);
      else await exportPDF(data, title);
      toast.success(`Exportado como ${format.toUpperCase()}`);
    } catch {
      toast.error("Erro na exportação");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={!!exporting}>
        <Download className="h-4 w-4 mr-1" />{exporting === "csv" ? "Exportando..." : "CSV"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("excel")} disabled={!!exporting}>
        <Download className="h-4 w-4 mr-1" />{exporting === "excel" ? "Exportando..." : "Excel"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={!!exporting}>
        <Download className="h-4 w-4 mr-1" />{exporting === "pdf" ? "Exportando..." : "PDF"}
      </Button>
    </div>
  );
}
