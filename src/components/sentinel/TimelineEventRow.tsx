import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TimelineEvent } from "@/lib/sentinel-mock";

interface TimelineEventRowProps {
  event: TimelineEvent;
  cameraLabel?: string;
}

const EVENT_COLOR: Record<string, string> = {
  perimeter_breach: "text-sentinel-red",
  weapon_detected: "text-sentinel-red",
  fall_detected: "text-sentinel-red",
  loitering: "text-sentinel-amber",
  abandoned_object: "text-sentinel-amber",
  crowd_density_spike: "text-sentinel-amber",
  tailgating: "text-sentinel-amber",
  running_detected: "text-sentinel-amber",
  vehicle_idle: "text-primary",
  person_detected: "text-primary",
  vehicle_detected: "text-primary",
  license_plate_read: "text-primary",
};

/**
 * TimelineEventRow
 * Event type, camera ID, confidence score, timestamp, expandable detail (metadata JSON).
 * Designed for high-density vertical scan-reading.
 */
export function TimelineEventRow({ event, cameraLabel }: TimelineEventRowProps) {
  const [open, setOpen] = useState(false);
  const conf = event.confidence;
  const confColor = conf > 0.85 ? "text-sentinel-green" : conf > 0.7 ? "text-primary" : "text-muted-foreground";
  const eventColor = EVENT_COLOR[event.eventType] ?? "text-foreground";
  const time = new Date(event.timestamp);
  const timeStr = time.toLocaleTimeString("en-US", { hour12: false });

  return (
    <div className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full grid grid-cols-[16px_88px_140px_1fr_72px_80px] items-center gap-3 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-muted-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{timeStr}</span>
        <span className="text-[10px] font-mono text-muted-foreground truncate">
          {cameraLabel ?? event.cameraId}
        </span>
        <span className={`text-xs font-mono ${eventColor} truncate`}>
          {event.eventType.replace(/_/g, " ")}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full ${conf > 0.85 ? "bg-sentinel-green" : conf > 0.7 ? "bg-primary" : "bg-muted-foreground"}`}
              style={{ width: `${conf * 100}%` }}
            />
          </div>
          <span className={`text-[9px] font-mono tabular-nums ${confColor}`}>{(conf * 100).toFixed(0)}</span>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground/60 truncate">{event.eventId}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 ml-7">
          <pre className="text-[10px] font-mono leading-relaxed bg-muted/30 border border-border rounded p-2 overflow-x-auto">
            <code>{JSON.stringify(event.metadata, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
