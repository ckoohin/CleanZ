'use client';

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

interface CalendarProps {
  events?: any[];
  onEventClick?: (info: any) => void;
  onDateSelect?: (selectInfo: any) => void;
}

/**
 * Component Calendar sử dụng FullCalendar.
 * Tích hợp sẵn các plugin: dayGrid, timeGrid, interaction (để select/drag), list.
 */
export default function Calendar({
  events = [],
  onEventClick,
  onDateSelect,
}: CalendarProps) {
  return (
    <div className="calendar-container p-4 bg-card rounded-xl border shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={events}
        select={onDateSelect}
        eventClick={onEventClick}
        height="auto"
        locale="vi" // Cần cài đặt moment hoặc cấu hình locale nếu muốn tiếng Việt hoàn chỉnh
        buttonText={{
          today: 'Hôm nay',
          month: 'Tháng',
          week: 'Tuần',
          day: 'Ngày',
          list: 'Lịch biểu',
        }}
      />
      <style jsx global>{`
        .fc {
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--primary));
          --fc-button-border-color: hsl(var(--primary));
          --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
          --fc-button-active-bg-color: hsl(var(--primary));
          --fc-event-bg-color: hsl(var(--primary));
          --fc-event-border-color: hsl(var(--primary));
          --fc-page-bg-color: transparent;
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        .fc .fc-button {
          font-weight: 500;
          text-transform: capitalize;
        }
        .fc .fc-daygrid-day-number, .fc .fc-col-header-cell-cushion {
          color: hsl(var(--foreground));
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
