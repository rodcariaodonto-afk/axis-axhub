
import { CHANNELS } from "@/lib/productUtils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface ChannelConfig {
  channel_name: string;
  channel_sku: string;
  channel_url: string;
  sync_enabled: boolean;
}

interface ChannelSelectorProps {
  channels: ChannelConfig[];
  onChange: (channels: ChannelConfig[]) => void;
}

export default function ChannelSelector({ channels, onChange }: ChannelSelectorProps) {
  const toggleChannel = (channelValue: string) => {
    const exists = channels.find((c) => c.channel_name === channelValue);
    if (exists) {
      onChange(channels.filter((c) => c.channel_name !== channelValue));
    } else {
      onChange([...channels, { channel_name: channelValue, channel_sku: "", channel_url: "", sync_enabled: true }]);
    }
  };

  const updateChannel = (channelName: string, field: keyof ChannelConfig, value: string | boolean) => {
    onChange(channels.map((c) => (c.channel_name === channelName ? { ...c, [field]: value } : c)));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((ch) => {
          const active = channels.some((c) => c.channel_name === ch.value);
          return (
            <Badge
              key={ch.value}
              variant={active ? "default" : "outline"}
              className="cursor-pointer text-sm px-3 py-1.5"
              onClick={() => toggleChannel(ch.value)}
            >
              {ch.icon} {ch.label}
            </Badge>
          );
        })}
      </div>
      {channels.map((ch) => {
        const info = CHANNELS.find((c) => c.value === ch.channel_name);
        return (
          <div key={ch.channel_name} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">{info?.icon} {info?.label || ch.channel_name}</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sync</span>
                <Switch checked={ch.sync_enabled} onCheckedChange={(v) => updateChannel(ch.channel_name, "sync_enabled", v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">SKU do Canal</Label>
                <Input className="h-8 text-sm" value={ch.channel_sku} onChange={(e) => updateChannel(ch.channel_name, "channel_sku", e.target.value)} placeholder="SKU específico" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">URL do Canal</Label>
                <Input className="h-8 text-sm" value={ch.channel_url} onChange={(e) => updateChannel(ch.channel_name, "channel_url", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
