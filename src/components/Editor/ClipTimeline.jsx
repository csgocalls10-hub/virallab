import { useRef, useEffect, useCallback } from 'react';

export default function ClipTimeline({ duration, startTime, endTime, onRangeChange, clips = [], onClipSelect }) {
  const trackRef = useRef(null);
  const dragging = useRef(null);

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const handleMouseDown = useCallback((handle, e) => {
    e.preventDefault();
    dragging.current = handle;

    function onMouseMove(e) {
      if (!trackRef.current || !dragging.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pct * duration;

      if (dragging.current === 'start') {
        onRangeChange(Math.min(time, endTime - 1), endTime);
      } else {
        onRangeChange(startTime, Math.max(time, startTime + 1));
      }
    }

    function onMouseUp() {
      dragging.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [duration, startTime, endTime, onRangeChange]);

  const startPct = (startTime / duration) * 100;
  const endPct = (endTime / duration) * 100;
  const selectedDuration = endTime - startTime;

  return (
    <div className="clip-timeline">
      <div className="timeline-header">
        <span className="timeline-label">✂️ Selecione o trecho</span>
        <span className="timeline-duration">
          {formatTime(startTime)} → {formatTime(endTime)} ({formatTime(selectedDuration)})
        </span>
      </div>

      <div className="timeline-track" ref={trackRef}>
        {/* Time markers */}
        <div className="timeline-markers">
          {Array.from({ length: Math.min(Math.ceil(duration / 10), 20) + 1 }, (_, i) => {
            const t = i * (duration / Math.min(Math.ceil(duration / 10), 20));
            return (
              <span key={i} className="time-marker" style={{ left: `${(t / duration) * 100}%` }}>
                {formatTime(t)}
              </span>
            );
          })}
        </div>

        {/* AI clip suggestions */}
        {clips.map((clip, i) => (
          <div
            key={i}
            className="clip-suggestion"
            style={{
              left: `${(clip.start / duration) * 100}%`,
              width: `${((clip.end - clip.start) / duration) * 100}%`,
            }}
            onClick={() => onClipSelect?.(clip)}
            title={clip.title}
          >
            <span className="clip-label">{clip.title}</span>
          </div>
        ))}

        {/* Selected range */}
        <div
          className="timeline-selected"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* Handles */}
        <div
          className="timeline-handle start"
          style={{ left: `${startPct}%` }}
          onMouseDown={(e) => handleMouseDown('start', e)}
        >
          <div className="handle-grip" />
        </div>
        <div
          className="timeline-handle end"
          style={{ left: `${endPct}%` }}
          onMouseDown={(e) => handleMouseDown('end', e)}
        >
          <div className="handle-grip" />
        </div>
      </div>
    </div>
  );
}
