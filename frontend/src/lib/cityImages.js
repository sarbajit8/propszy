// City tiles for the home "Explore top cities" rail.
// Prefers a real image an admin has set on the city; otherwise draws a
// distinct, good-looking layered skyline as an inline SVG (zero network).

const rng = (seed) => {
  let s = [...String(seed || 'city')].reduce((a, c) => a * 33 + c.charCodeAt(0), 7) >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};

const skyline = (w, h, rand, baseY, color, op) => {
  let d = `M0 ${h} L0 ${baseY.toFixed(1)}`;
  let x = 0;
  while (x < w) {
    const bw = 14 + rand() * 40;
    const bh = baseY - (rand() * rand()) * baseY * 0.85 - 6;
    d += ` L${x.toFixed(1)} ${bh.toFixed(1)} L${(x + bw).toFixed(1)} ${bh.toFixed(1)}`;
    x += bw + rand() * 8;
  }
  d += ` L${w} ${baseY.toFixed(1)} L${w} ${h} Z`;
  return `<path d='${d}' fill='${color}' opacity='${op}'/>`;
};

export function citySkyline(name, w = 640, h = 820) {
  const r = rng(name);
  const hue = 202 + Math.floor(r() * 74); // blue → indigo → violet
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${hue} 58% 30%)'/>` +
    `<stop offset='.55' stop-color='hsl(${hue} 52% 46%)'/>` +
    `<stop offset='1' stop-color='hsl(${hue + 14} 46% 64%)'/></linearGradient></defs>` +
    `<rect width='100%' height='100%' fill='url(#s)'/>` +
    `<circle cx='${(w * (0.18 + r() * 0.64)).toFixed(0)}' cy='${(h * (0.16 + r() * 0.16)).toFixed(0)}' r='${(w * 0.12).toFixed(0)}' fill='hsl(${hue - 12} 82% 86%)' opacity='.45'/>` +
    skyline(w, h, rng(name + 'a'), h * 0.60, `hsl(${hue} 44% 38%)`, 0.5) +
    skyline(w, h, rng(name + 'b'), h * 0.72, `hsl(${hue} 52% 24%)`, 0.8) +
    skyline(w, h, rng(name + 'c'), h * 0.83, `hsl(${hue} 58% 13%)`, 0.96) +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const isReal = (url) => url && !/picsum\.photos|loremflickr\.com/i.test(url);

export function cityImage(city) {
  return isReal(city.imageUrl) ? city.imageUrl : citySkyline(city.name || city.slug || 'city');
}

// onError — never leave a tile blank.
export function cityImageFallback(e, city) {
  const el = e.currentTarget;
  const fb = citySkyline(city.name || city.slug || 'city');
  if (el.src !== fb) el.src = fb;
}
