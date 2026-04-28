import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { TimelineEvent } from "@/lib/sentinel-mock";

interface TimelineEventRowProps {
  event: TimelineEvent;
  cameraLabel?: string;
}

/** Shared grid column template — referenced by header in Dashboard. */
export const TIMELINE_GRID = "grid-cols-[18px_92px_148px_minmax(0,1fr)_88px_84px]";

const EVENT_COLOR: Record<string, string> = {
  perimeter_breach:    "text-sentinel-red",
  weapon_detected:     "text-sentinel-red",
  fall_detected:       "text-sentinel-red",
  loitering:           "text-sentinel-amber",
  abandoned_object:    "text-sentinel-amber",
  crowd_density_spike: "text-sentinel-amber",
  tailgating:          "text-sentinel-amber",
  running_detected:    "text-sentinel-amber",
  vehicle_idle:        "text-primary",
  person_detected:     "text-primary",
  vehicle_detected:    "text-primary",
  license_plate_read:  "text-primary",
};

const EVENT_RAIL: Record<string, string> = {
  perimeter_breach:    "bg-sentinel-red",
  weapon_detected:     "bg-sentinel-red",
  fall_detected:       "bg-sentinel-red",
  loitering:           "bg-sentinel-amber",
  abandoned_object:    "bg-sentinel-amber",
  crowd_density_spike: "bg-sentinel-amber",
  tailgating:          "bg-sentinel-amber",
  running_detected:    "bg-sentinel-amber",
};

/**
 * TimelineEventRow — High-density scannable row.
 * Color rail (left) + tabular timestamp + camera + event + confidence bar + event ID.
 * Expandable for raw metadata JSON.
 */
export function TimelineEventRow({ event, cameraLabel }: TimelineEventRowProps) {
  const [open, setOpen] = useState(false);
  const conf = event.confidence;
  const confColor = conf > 0.85 ? "text-sentinel-green" : conf > 0.7 ? "text-primary" : "text-muted-foreground";
  const confBar   = conf > 0.85 ? "bg-sentinel-green" : conf > 0.7 ? "bg-primary" : "bg-muted-foreground/40";
  const eventColor = EVENT_COLOR[event.eventType] ?? "text-foreground";
  const railColor = EVENT_RAIL[event.eventType] ?? "bg-transparent";
  const time = new Date(event.timestamp);
  const timeStr = time.toLocaleTimeString("en-US", { hour12: false });

  return (
    <div className={`relative border-b border-border/40 transition-colors ${open ? "bg-muted/20" : "hover:bg-muted/15"}`}>
      {/* Severity rail */}
      <span className={`absolute left-0 top-0 bottom-0 w-[2px] ${railColor}`} aria-hidden />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${event.eventType.replace(/_/g, " ")} at ${cameraLabel ?? event.cameraId}, ${(conf * 100).toFixed(0)}% confidence`}
        className={`w-full grid ${TIMELINE_GRID} items-center gap-3 px-3 py-2 text-left outline-none focus-visible:bg-muted/30`}
      >
        <span className="text-muted-foreground/60">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground data-num tabular-nums">{timeStr}</span>
        <span className="text-[10px] font-mono text-foreground/80 truncate">
          {cameraLabel ?? event.cameraId}
        </span>
        <span className={`text-[12px] font-mono ${eventColor} truncate uppercase tracking-wider`}>
          {event.eventType.replace(/_/g, " ")}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="h-[3px] flex-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full ${confBar} transition-all`}
              style={{ width: `${conf * 100}%` }}
              aria-hidden
            />
          </div>
          <span className={`text-[9px] font-mono data-num ${confColor} w-7 text-right`}>{(conf * 100).toFixed(0)}</span>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground/60 truncate tracking-wider">{event.eventId}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 ml-7 animate-fade-in-up">
          <pre className="text-[10px] font-mono leading-relaxed bg-background/60 border border-border/60 rounded-sm p-2.5 overflow-x-auto">
            <code>{JSON.stringify(event.metadata, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
