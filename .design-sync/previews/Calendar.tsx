import { Calendar } from 'orkestrator';

const selected = new Date(2026, 5, 15); // June 15 2026

export function SingleSelect() {
  return (
    <div style={{ display: 'inline-block' }}>
      <Calendar
        mode="single"
        selected={selected}
        defaultMonth={selected}
      />
    </div>
  );
}

export function NoSelection() {
  return (
    <div style={{ display: 'inline-block' }}>
      <Calendar
        mode="single"
        defaultMonth={new Date(2026, 5, 1)}
      />
    </div>
  );
}
