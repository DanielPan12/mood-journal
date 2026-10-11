// Five small ink prints. Geometry stays fixed so a mood has a recognisable mark.
const INKS = ['#3f628c', '#737d87', '#748878', '#bb8a37', '#bd6048'];

const PRINTS = [
  // A shelter-shaped arch, with open channels cut through the ink.
  `<path d="M34 98V71C34 43 54 26 79 26c28 0 48 19 48 46v26h-17V73c0-20-13-32-31-32-17 0-29 12-29 31v26Z" fill="currentColor"/>
   <path d="M60 98V72c0-12 8-21 20-21 13 0 21 9 21 22v25H87V74c0-5-3-8-7-8s-7 3-7 8v24Z" fill="currentColor"/>
   <path d="m39 113-5 13m27-14-6 19m29-19-5 14m27-13-6 19m27-20-5 14" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
   <path d="M42 80v12m76-13v13" stroke="currentColor" stroke-width="1.4"/>`,

  // One low cloud: a single silhouette, lifted by three loose horizontal strokes.
  `<path d="M34 93c-13-1-21-10-21-21 0-12 10-22 22-22 3-16 16-26 32-25 15 0 26 8 31 21 15-5 31 3 34 18 11 1 18 8 18 18 0 11-9 19-21 19H50c-6 0-12-3-16-8Z" fill="currentColor"/>
   <path d="M33 113h91m-80 10h88m-97 11h67" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
   <path d="M41 39c7-8 16-12 26-11m43 23c8 1 14 5 17 12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
   <path d="M24 89h45m7 0h56" stroke="#f6f3ea" stroke-width="1.5" stroke-linecap="round"/>`,

  // A waxing moon meets a quiet horizon. The negative space is real, not a mask.
  `<path d="M96 29c-8 9-11 21-8 32 4 14 16 23 31 24-7 12-20 18-33 15-18-3-30-19-28-37 2-17 18-33 38-34Z" fill="currentColor"/>
   <path d="M23 112h115m-105 9h95m-82 9h66" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
   <path d="M20 103c13-5 24-5 34 0m62 0c9-3 17-3 26 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
   <path d="M65 81c3 8 9 14 16 17m-19-28c-1 2 0 4 0 6" stroke="#f6f3ea" stroke-width="1.4" stroke-linecap="round"/>
   <circle cx="39" cy="63" r="3" fill="currentColor"/>`,

  // A sun with engraved rays, weighted by a broad semicircle below the horizon.
  `<path d="M49 77c-1-19 12-33 30-34 19-1 34 13 34 32 0 18-13 32-32 32-17 0-31-12-32-30Z" fill="currentColor"/>
   <path d="m79 22 1 11m28-5-5 10m27 8-10 6m21 23-16 1m7 28-11-6M51 30l6 10M29 49l12 7M19 78l17-1m-9 29 13-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
   <path d="M41 117h79c-8 16-22 24-40 24-16 0-31-8-39-24Z" fill="currentColor"/>
   <path d="M58 79c0-13 9-23 22-24m-18 38c5 6 11 9 19 9" stroke="#f6f3ea" stroke-width="1.5" stroke-linecap="round"/>
   <path d="M56 128h47" stroke="#f6f3ea" stroke-width="1.4" stroke-linecap="round"/>`,

  // Petals are deliberately a little unequal, like a hand-cut circular stamp.
  `<g fill="currentColor">
     <path d="M80 60C68 46 67 27 80 13c13 14 12 34 0 47Z"/>
     <path d="M96 66c1-20 13-34 31-36 0 19-13 33-31 36Z"/>
     <path d="M102 80c13-14 33-14 46-1-12 14-33 15-46 1Z"/>
     <path d="M96 95c19-1 35 12 36 31-20-1-33-13-36-31Z"/>
     <path d="M80 102c13 13 13 32 1 46-14-12-15-33-1-46Z"/>
     <path d="M64 96c-1 19-14 33-32 35 0-20 13-33 32-35Z"/>
     <path d="M58 80c-13 14-32 14-46 1 12-14 32-14 46-1Z"/>
     <path d="M65 65c-19 0-34-14-35-32 19 0 32 13 35 32Z"/>
     <path d="M80 64c9 0 16 7 16 16s-7 17-16 17-17-7-17-16c0-10 7-17 17-17Z"/>
   </g>
   <path d="M80 26v24m28 5 13-15m-10 39h25m-27 29 13 13m-41-9v23m-26-27-14 14m7-41H26m28-27L41 42" stroke="#f6f3ea" stroke-width="1.4" stroke-linecap="round"/>`,
];

export function moodPrint(score, className = '') {
  const value = Number(score);
  const index = Number.isFinite(value) ? Math.max(0, Math.min(4, Math.round(value) - 1)) : 2;
  const classes = String(className).split(/\s+/).filter(token => /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(token));
  return `<svg class="${['mood-print', ...classes].join(' ')}" viewBox="0 0 160 160" fill="none" color="${INKS[index]}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${PRINTS[index]}</svg>`;
}
