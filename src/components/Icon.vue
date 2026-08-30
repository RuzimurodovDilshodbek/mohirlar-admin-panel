<script setup>
import { computed } from 'vue';

// One stroked 24×24 icon set for the whole panel. Pages used to paste raw SVG
// `d` strings inline, so the same idea (a chevron, a search glass) existed in
// six slightly different shapes and none of them could be restyled at once.
const PATHS = {
  // navigation
  dashboard: 'M3 11l9-7 9 7M5 10v10h14V10',
  users: 'M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8M12 8a4 4 0 100-8 4 4 0 000 8',
  user: 'M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8M12 8a4 4 0 100-8 4 4 0 000 8',
  briefcase: 'M3 7h18v13H3zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 12h18',
  building: 'M3 21h18M6 21V7l6-4 6 4v14M10 9h.01M14 9h.01M10 13h.01M14 13h.01M10 17h.01M14 17h.01',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  card: 'M3 7h18v10H3zM3 11h18M7 15h3',
  list: 'M7 7h13M7 12h13M7 17h13M3.5 7h.01M3.5 12h.01M3.5 17h.01',
  file: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h5',
  // actions
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.2-4.2',
  plus: 'M12 5v14M5 12h14',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  check: 'M20 6L9 17l-5-5',
  close: 'M6 6l12 12M18 6L6 18',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 5v6h-6',
  download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  // chevrons & arrows
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  more: 'M12 6h.01M12 12h.01M12 18h.01',
  // state
  alert: 'M12 8v5M12 17h.01M10.3 3.9L2.5 17.4A2 2 0 004.2 20.4h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 8h.01M11 12h1v5h1',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 7v5l3 2',
  star: 'M12 2l2.9 6.3 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.3 1.3-6.6L2.5 9.1l6.6-.8z',
  sparkles: 'M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3zM18 15l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z',
  ban: 'M12 22a10 10 0 100-20 10 10 0 000 20zM5 5l14 14',
  offline: 'M2 8.8A16 16 0 0122 8.8M5 12.5a11 11 0 0114 0M8.5 16a6 6 0 017 0M12 20h.01M3 3l18 18',
  // theme
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
  // misc
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  phone: 'M5 3h4l2 5-2.5 1.5a12 12 0 006 6L16 13l5 2v4a2 2 0 01-2.2 2A17 17 0 013 5.2 2 2 0 015 3z',
  calendar: 'M3 6h18v15H3zM3 10h18M8 3v4M16 3v4',
  money: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  chart: 'M3 3v18h18M7 15l3-3 3 3 5-6',
  grid: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  rows: 'M3 5h18M3 12h18M3 19h18',
  command: 'M6 6a3 3 0 113 3H6zM15 6a3 3 0 103 3h-3zM6 18a3 3 0 103-3H6zM15 18a3 3 0 113-3h-3zM9 9h6v6H9z',
  panel: 'M3 4h18v16H3zM9 4v16',
  key: 'M15 7a4 4 0 11-3.5 5.9L7 17.4 4.6 15 9 10.5A4 4 0 0115 7z',
  globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20 15 15 0 010-20',
};

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  stroke: { type: [Number, String], default: 1.7 },
});

const d = computed(() => PATHS[props.name] || '');
const px = computed(() => `${props.size}px`);
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    :style="{ width: px, height: px }"
    class="shrink-0"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="d" />
  </svg>
</template>
