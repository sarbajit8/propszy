// Inline SVG placeholders — zero external network requests.

const hueOf = (s) => [...String(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

export function imgPlaceholder(seed = '', w = 800, h = 600) {
  const hue = hueOf(seed);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${hue} 40% 90%)'/><stop offset='1' stop-color='hsl(${hue} 38% 78%)'/></linearGradient></defs>` +
    `<rect width='100%' height='100%' fill='url(#g)'/>` +
    `<path d='M0 ${h * 0.72} L${w * 0.32} ${h * 0.46} L${w * 0.58} ${h * 0.64} L${w} ${h * 0.38} L${w} ${h} L0 ${h} Z' fill='hsl(${hue} 24% 68%)' opacity='.55'/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function avatarPlaceholder(name = '?', size = 96) {
  const initials =
    String(name).trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const hue = hueOf(name);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<rect width='100%' height='100%' rx='${size}' fill='hsl(${hue} 45% 90%)'/>` +
    `<text x='50%' y='55%' font-family='system-ui,sans-serif' font-size='${size * 0.4}' font-weight='700' ` +
    `fill='hsl(${hue} 45% 40%)' text-anchor='middle' dominant-baseline='middle'>${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
