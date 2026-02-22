import { BLOCK_TYPES, BLOCK_CATEGORIES, type BlockCategory } from "./funnelBlockTypes";

export function FunnelSidebarPalette() {
  const onDragStart = (event: React.DragEvent, tipo: string) => {
    event.dataTransfer.setData("application/funnel-block-type", tipo);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-56 border-r bg-card overflow-y-auto p-3 space-y-4 flex-shrink-0">
      <h3 className="text-sm font-semibold text-foreground">Blocos</h3>
      {BLOCK_CATEGORIES.map((cat) => {
        const blocks = BLOCK_TYPES.filter((b) => b.category === cat.key);
        return (
          <div key={cat.key}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <cat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {cat.label}
              </span>
            </div>
            <div className="space-y-1">
              {blocks.map((block) => {
                const Icon = block.icon;
                return (
                  <div
                    key={block.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, block.type)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border bg-background cursor-grab hover:border-primary hover:bg-accent transition-colors text-sm"
                    title={block.description}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: block.color }} />
                    <span className="text-foreground truncate">{block.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
