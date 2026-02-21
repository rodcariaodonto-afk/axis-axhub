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
  // Header
  const header = ["Nome", ...data.datasets.map((ds) => ds.label)];
  rows.push(header);
  // Data rows
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

async function exportPDF(data: ReportData, title: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

  // Summary
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

  // Table
  doc.setFontSize(12);
  doc.text("Dados", 14, y);
  y += 8;
  doc.setFontSize(9);

  const cols = ["Nome", ...data.datasets.map((ds) => ds.label)];
  const colWidths = cols.map(() => Math.floor(180 / cols.length));

  // Header row
  let x = 14;
  doc.setFont(undefined!, "bold");
  cols.forEach((col, i) => {
    doc.text(col, x, y);
    x += colWidths[i];
  });
  doc.setFont(undefined!, "normal");
  y += 6;

  // Data rows
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

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(format);
    try {
      if (format === "csv") exportCSV(data, title);
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
      <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={!!exporting}>
        <Download className="h-4 w-4 mr-1" />{exporting === "pdf" ? "Exportando..." : "PDF"}
      </Button>
    </div>
  );
}
