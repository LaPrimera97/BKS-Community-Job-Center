function validDate(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function luhnValid(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function isValidSouthAfricanId(value) {
  const id = String(value || '').replace(/\D/g, '');
  if (!/^\d{13}$/.test(id)) return false;
  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  if (!validDate(1900 + yy, mm, dd) && !validDate(2000 + yy, mm, dd)) return false;
  if (id[10] !== '0' && id[10] !== '1') return false;
  return luhnValid(id);
}

module.exports = { isValidSouthAfricanId };
