function inr(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// Sum an array of Prisma Decimal | number safely.
function sum(values) {
  return values.reduce((acc, v) => acc + Number(v || 0), 0);
}

module.exports = { inr, sum };
