export function getNextNumero(prefix: string, existingNumeros: string[]) {
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`);
  let max = 0;
  for (const numero of existingNumeros) {
    const match = numero.match(re);
    if (match && Number(match[1]) === year) {
      max = Math.max(max, Number(match[2]));
    }
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
}
