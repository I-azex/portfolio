/**
 * Dev-only helper: generates the particle-grid markup for the RK monogram.
 *
 * The logo is a 160x160 grid. The particle field occupies a tidy 4x4 lattice
 * (16 cells, the two centre rows flanking the core) which doubles as the
 * "pixel grid" of the brand. Centre cell is dropped because the core register
 * lives there and would collide with it.
 *
 *   node tools/gen-logo-parts.mjs
 */

const VB = 160;
const COLS = 4;
const ROWS = 4;
const SPAN = 88; // lattice width/height in units
const START = (VB - SPAN) / 2; // 36
const STEP = SPAN / (COLS - 1); // 29.333...
const CORE_RADIUS = 16.3; // half-diagonal of the 20x20 core register
const r = (n) => Math.round(n * 100) / 100;

const cells = [];
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const x = r(START + col * STEP);
    const y = r(START + row * STEP);
    const dx = x - 80;
    const dy = y - 80;
    if (Math.hypot(dx, dy) < CORE_RADIUS) continue; // keep the core register clear
    const ring = Math.max(Math.abs(col - 1.5), Math.abs(row - 1.5)); // 1.5 -> 0.5 centre
    cells.push({ x, y, dx: r(dx), dy: r(dy), ring });
  }
}

// Assembly travels from the core outwards: ring 0 first, then 1, then 2.
const order = [...cells].sort((a, b) => a.ring - b.ring || a.y - b.y || a.x - b.x);
order.forEach((c, i) => (c.delay = i));

const lines = order.map(
  (c) =>
    `        <circle class="rk-dot" cx="${c.x}" cy="${c.y}" r="2.6" ` +
    `style="--dx:${c.dx};--dy:${c.dy};--d:${c.delay}"/>`,
);

console.log(`/* lattice: ${cells.length} particles */`);
console.log(lines.join('\n'));
console.log('\n/* cells, assembly order */');
console.log(
  cells
    .slice()
    .sort((a, b) => a.delay - b.delay)
    .map((c) => `${String(c.delay).padStart(2)}  (${c.x}, ${c.y})  dx=${c.dx} dy=${c.dy}`)
    .join('\n'),
);
