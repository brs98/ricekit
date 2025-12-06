// Test with timezone offset
function calculateSunTimes(lat, lon, date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  const lat_rad = lat * Math.PI / 180;
  const cos_ha = (Math.cos(90.833 * Math.PI / 180) / (Math.cos(lat_rad) * Math.cos(decl)))
    - (Math.tan(lat_rad) * Math.tan(decl));

  if (cos_ha > 1 || cos_ha < -1) {
    return { sunrise: '06:00', sunset: '18:00' };
  }

  const ha = Math.acos(cos_ha);
  const sunrise_time = 720 - 4 * (lon + ha * 180 / Math.PI) - eqtime;
  const sunset_time = 720 - 4 * (lon - ha * 180 / Math.PI) - eqtime;

  const timezoneOffset = date.getTimezoneOffset();
  const sunrise_local = sunrise_time - timezoneOffset;
  const sunset_local = sunset_time - timezoneOffset;

  let sunrise_hours = Math.floor(sunrise_local / 60);
  let sunrise_mins = Math.floor(sunrise_local % 60);
  if (sunrise_hours < 0) sunrise_hours += 24;
  if (sunrise_hours >= 24) sunrise_hours -= 24;

  let sunset_hours = Math.floor(sunset_local / 60);
  let sunset_mins = Math.floor(sunset_local % 60);
  if (sunset_hours < 0) sunset_hours += 24;
  if (sunset_hours >= 24) sunset_hours -= 24;

  return {
    sunrise: `${sunrise_hours.toString().padStart(2, '0')}:${sunrise_mins.toString().padStart(2, '0')}`,
    sunset: `${sunset_hours.toString().padStart(2, '0')}:${sunset_mins.toString().padStart(2, '0')}`
  };
}

const date = new Date();
console.log(`Date: ${date.toDateString()}`);
console.log(`Timezone offset: ${date.getTimezoneOffset()} minutes`);
console.log('');

console.log('San Francisco (37.7749, -122.4194):');
const sf = calculateSunTimes(37.7749, -122.4194);
console.log(`  Sunrise: ${sf.sunrise}`);
console.log(`  Sunset: ${sf.sunset}`);

console.log('\nNew York (40.7128, -74.0060):');
const ny = calculateSunTimes(40.7128, -74.0060);
console.log(`  Sunrise: ${ny.sunrise}`);
console.log(`  Sunset: ${ny.sunset}`);
