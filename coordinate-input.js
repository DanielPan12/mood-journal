// Keep the two-dimensional input independent of how the page renders its marker.
export function bindCoordinateInput({ onChange }) {
  if (typeof onChange !== 'function') throw new TypeError('onChange must be a function');

  let active = null;
  const clamp = value => Math.max(1, Math.min(5, value));
  const valueOf = value => Number.isFinite(Number(value)) && value !== ''
    ? clamp(Math.round(Number(value))) : 3;
  const planeOf = event => event.target?.closest?.('[data-coordinate-plane]')
    ?? event.target?.parentElement?.closest?.('[data-coordinate-plane]');

  function reportPointer(event, force = false) {
    const drag = active;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const rect = drag.plane.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const mood = clamp(Math.round(1 + (((event.clientX - rect.left) / rect.width - 0.1) / 0.8) * 4));
    const energy = clamp(Math.round(5 - (((event.clientY - rect.top) / rect.height - 0.1) / 0.8) * 4));
    if (!force && mood === drag.mood && energy === drag.energy) return;
    drag.mood = mood;
    drag.energy = energy;
    onChange({ mood, energy, source: 'pointer' });
  }

  function release() {
    const drag = active;
    active = null;
    if (!drag) return;
    try {
      if (drag.plane.hasPointerCapture(drag.pointerId)) drag.plane.releasePointerCapture(drag.pointerId);
    } catch { /* The plane may have been removed while a callback updated the page. */ }
  }

  function pointerDown(event) {
    if (active || event.isPrimary === false || event.button !== 0) return;
    const plane = planeOf(event);
    if (!plane) return;
    event.preventDefault();
    active = { plane, pointerId: event.pointerId, mood: null, energy: null };
    plane.focus({ preventScroll: true });
    try { plane.setPointerCapture(event.pointerId); } catch { /* Document listeners still handle the gesture. */ }
    reportPointer(event, true);
  }

  function pointerMove(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    event.preventDefault();
    reportPointer(event);
  }

  function pointerUp(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    reportPointer(event);
    release();
  }

  function pointerCancel(event) {
    if (active && event.pointerId === active.pointerId) release();
  }

  function keyDown(event) {
    const plane = planeOf(event);
    if (!plane) return;
    let mood = valueOf(plane.dataset.mood);
    let energy = valueOf(plane.dataset.energy);
    switch (event.key) {
      case 'ArrowLeft': mood = clamp(mood - 1); break;
      case 'ArrowRight': mood = clamp(mood + 1); break;
      case 'ArrowUp': energy = clamp(energy + 1); break;
      case 'ArrowDown': energy = clamp(energy - 1); break;
      case 'Home': mood = 3; energy = 3; break;
      default: return;
    }
    event.preventDefault();
    onChange({ mood, energy, source: 'keyboard' });
  }

  const listeners = [
    ['pointerdown', pointerDown], ['pointermove', pointerMove],
    ['pointerup', pointerUp], ['pointercancel', pointerCancel],
    ['lostpointercapture', pointerCancel], ['keydown', keyDown],
  ];
  listeners.forEach(([name, handler]) => document.addEventListener(name, handler, { passive: false }));
  return function cleanup() {
    listeners.forEach(([name, handler]) => document.removeEventListener(name, handler));
    release();
  };
}
