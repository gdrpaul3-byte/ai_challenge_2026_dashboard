/* Pressure-gauge SVG renderer.
   Draws a brass-rimmed dial with tick marks and a needle that swings
   to the given proportion (0..1). Used by the summary strip.
*/

export function renderGauge(container, { ratio = 0, color = '#3d2817', max = 100 } = {}) {
  const clamped = Math.max(0, Math.min(1, ratio || 0));
  // needle sweeps from -120° (left) to +120° (right)
  const angle = -120 + clamped * 240;

  container.innerHTML = `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="bezel-${container.dataset.gid}" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#f5d896"/>
          <stop offset="50%" stop-color="#b8860b"/>
          <stop offset="85%" stop-color="#6b4612"/>
          <stop offset="100%" stop-color="#3d2410"/>
        </radialGradient>
        <radialGradient id="face-${container.dataset.gid}" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stop-color="#f0e0b8"/>
          <stop offset="65%" stop-color="#d8c089"/>
          <stop offset="100%" stop-color="#a07a3e"/>
        </radialGradient>
        <filter id="glass-${container.dataset.gid}">
          <feGaussianBlur stdDeviation="0.3"/>
        </filter>
      </defs>

      <!-- outer brass bezel -->
      <circle cx="100" cy="100" r="96" fill="url(#bezel-${container.dataset.gid})"/>
      <circle cx="100" cy="100" r="92" fill="none" stroke="#3d2410" stroke-width="1.2" opacity="0.6"/>

      <!-- bezel rivets -->
      ${[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const r = 88;
        const x = 100 + Math.cos(deg * Math.PI / 180) * r;
        const y = 100 + Math.sin(deg * Math.PI / 180) * r;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#3d2410"/>
                <circle cx="${(x - 0.6).toFixed(1)}" cy="${(y - 0.6).toFixed(1)}" r="1" fill="#f5d896" opacity="0.7"/>`;
      }).join('')}

      <!-- inner face -->
      <circle cx="100" cy="100" r="80" fill="url(#face-${container.dataset.gid})" filter="url(#glass-${container.dataset.gid})"/>

      <!-- arc tick guide -->
      <path d="M 30 138 A 80 80 0 1 1 170 138"
            fill="none" stroke="#3d2410" stroke-width="1.2" opacity="0.5"/>

      <!-- major tick marks -->
      ${Array.from({ length: 11 }).map((_, i) => {
        const t = i / 10;
        const a = (-120 + t * 240) * Math.PI / 180;
        const inner = 64;
        const outer = 76;
        const x1 = 100 + Math.cos(a - Math.PI / 2) * inner;
        const y1 = 100 + Math.sin(a - Math.PI / 2) * inner;
        const x2 = 100 + Math.cos(a - Math.PI / 2) * outer;
        const y2 = 100 + Math.sin(a - Math.PI / 2) * outer;
        const major = i % 5 === 0;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
                      stroke="#3d2410" stroke-width="${major ? 2.4 : 1.2}" opacity="${major ? 0.95 : 0.55}"/>`;
      }).join('')}

      <!-- minor ticks -->
      ${Array.from({ length: 41 }).map((_, i) => {
        if (i % 4 === 0) return '';
        const t = i / 40;
        const a = (-120 + t * 240) * Math.PI / 180;
        const x1 = 100 + Math.cos(a - Math.PI / 2) * 70;
        const y1 = 100 + Math.sin(a - Math.PI / 2) * 70;
        const x2 = 100 + Math.cos(a - Math.PI / 2) * 76;
        const y2 = 100 + Math.sin(a - Math.PI / 2) * 76;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
                      stroke="#3d2410" stroke-width="0.6" opacity="0.4"/>`;
      }).join('')}

      <!-- danger arc (last 30%) -->
      <path d="M ${100 + Math.cos((-120 + 0.7 * 240 - 90) * Math.PI / 180) * 70} ${100 + Math.sin((-120 + 0.7 * 240 - 90) * Math.PI / 180) * 70}
               A 70 70 0 0 1 ${100 + Math.cos((120 - 90) * Math.PI / 180) * 70} ${100 + Math.sin((120 - 90) * Math.PI / 180) * 70}"
            fill="none" stroke="${color}" stroke-width="4" opacity="0.55" stroke-linecap="round"/>

      <!-- needle -->
      <g class="gauge-needle" style="transform: rotate(${angle}deg);">
        <polygon points="100,30 96,108 104,108" fill="${color}" stroke="#1a0d04" stroke-width="0.6"/>
        <circle cx="100" cy="100" r="9" fill="#3d2410"/>
        <circle cx="100" cy="100" r="6" fill="url(#bezel-${container.dataset.gid})"/>
        <circle cx="100" cy="100" r="2" fill="#1a0d04"/>
      </g>

      <!-- glass highlight -->
      <ellipse cx="80" cy="60" rx="50" ry="22" fill="white" opacity="0.18"/>
      <ellipse cx="120" cy="160" rx="36" ry="10" fill="white" opacity="0.08"/>
    </svg>
  `;
}

let gid = 0;
export function nextGid() { return ++gid; }
