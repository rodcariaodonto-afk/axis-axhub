import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export interface WorkHourEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
}

interface WorkHoursTabProps {
  workHours: WorkHourEntry[];
  onChange: (hours: WorkHourEntry[]) => void;
}

export default function WorkHoursTab({ workHours, onChange }: WorkHoursTabProps) {
  const update = (dayOfWeek: number, field: keyof WorkHourEntry, value: any) => {
    onChange(
      workHours.map((wh) =>
        wh.day_of_week === dayOfWeek ? { ...wh, [field]: value } : wh
      )
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Configure os horários de trabalho para cada dia da semana.</p>
      <div className="space-y-2">
        {DAYS.map((day) => {
          const entry = workHours.find((wh) => wh.day_of_week === day.value)!;
          return (
            <div key={day.value} className="flex items-center gap-4 rounded-lg border border-border p-3">
              <div className="w-24">
                <Label className="text-sm font-medium">{day.label}</Label>
              </div>
              <Switch
                checked={entry.is_working_day}
                onCheckedChange={(v) => update(day.value, "is_working_day", v)}
              />
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={entry.start_time}
                  onChange={(e) => update(day.value, "start_time", e.target.value)}
                  disabled={!entry.is_working_day}
                  className="w-32"
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  type="time"
                  value={entry.end_time}
                  onChange={(e) => update(day.value, "end_time", e.target.value)}
                  disabled={!entry.is_working_day}
                  className="w-32"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
