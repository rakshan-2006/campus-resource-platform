import React from "react";

export interface TimelineSlot {
  id: string | number;
  title: string;
  startTime: string; // YYYY-MM-DD HH:mm or HH:mm
  endTime: string;   // YYYY-MM-DD HH:mm or HH:mm
  status: "CONFIRMED" | "MAINTENANCE" | "PENDING";
  subtitle?: string;
}

interface TimelineProps {
  date: string; // YYYY-MM-DD
  slots: TimelineSlot[];
  className?: string;
  onSlotClick?: (slot: TimelineSlot) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  date,
  slots,
  className = "",
  onSlotClick,
}) => {
  // Hours from 07:00 to 20:00 (13 total hours)
  const startHour = 7;
  const endHour = 20;
  const totalHours = endHour - startHour; // 13 hours
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  // Helper to calculate left % and width % for a slot
  const calculatePosition = (startStr: string, endStr: string) => {
    const parseTime = (timeStr: string) => {
      // Handles both "YYYY-MM-DD HH:mm" and "HH:mm"
      const timePart = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
      const [h, m] = timePart.split(":").map(Number);
      return h + m / 60;
    };

    const s = Math.max(startHour, parseTime(startStr));
    const e = Math.min(endHour, parseTime(endStr));

    if (e <= startHour || s >= endHour || s >= e) {
      return null;
    }

    const left = ((s - startHour) / totalHours) * 100;
    const width = ((e - s) / totalHours) * 100;

    return { left, width };
  };

  const getSlotStyle = (status: TimelineSlot["status"]) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200";
      case "MAINTENANCE":
        return "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200";
      case "PENDING":
        return "bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200";
      default:
        return "bg-slate-100 border-slate-300 text-slate-800";
    }
  };

  return (
    <div className={`w-full bg-white border border-slate-200 rounded-md p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Campus Schedule ({date})
        </span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300 border border-emerald-500" />
            <span className="text-slate-600">Confirmed Booking</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-300 border border-amber-500" />
            <span className="text-slate-600">Maintenance Window</span>
          </span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="relative border-t border-b border-slate-200 py-6 min-h-[90px]">
        {/* Hour markers */}
        <div className="absolute inset-0 flex justify-between pointer-events-none">
          {hours.map((hour, idx) => (
            <div
              key={hour}
              className={`relative flex flex-col items-center h-full ${
                idx === 0 || idx === hours.length - 1 ? "" : "border-r border-slate-100"
              }`}
              style={{ width: `${100 / totalHours}%` }}
            >
              <span className="text-[10px] font-mono text-slate-400 -mt-5">
                {hour.toString().padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {/* Render booked slots */}
        <div className="relative w-full h-10 mt-1">
          {slots.map((slot) => {
            const pos = calculatePosition(slot.startTime, slot.endTime);
            if (!pos) return null;

            return (
              <div
                key={slot.id}
                onClick={() => onSlotClick && onSlotClick(slot)}
                title={`${slot.title} (${slot.startTime.slice(-5)} - ${slot.endTime.slice(-5)})`}
                className={`absolute top-0 h-9 border rounded px-2 py-0.5 text-xs font-medium truncate cursor-pointer transition-colors shadow-sm flex flex-col justify-center ${getSlotStyle(
                  slot.status
                )}`}
                style={{
                  left: `${pos.left}%`,
                  width: `${Math.max(pos.width, 3)}%`,
                }}
              >
                <span className="truncate leading-tight font-semibold text-[11px]">
                  {slot.title}
                </span>
                <span className="text-[10px] font-mono opacity-80 truncate">
                  {slot.startTime.slice(-5)} - {slot.endTime.slice(-5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
