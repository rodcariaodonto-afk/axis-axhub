import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DashboardFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

export function DashboardFilters({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DashboardFiltersProps) {
  return (
    <div className="flex items-end gap-4 flex-wrap">
      <div className="space-y-1">
        <Label className="text-xs">De</Label>
        <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="h-8 w-40" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Até</Label>
        <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="h-8 w-40" />
      </div>
    </div>
  );
}
