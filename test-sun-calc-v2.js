// Updated calculation test
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
    const sunrise = new Date(date);
    sunrise.setHours(6, 0, 0, 0);
    const sunset = new Date(date);
    sunset.setHours(18, 0, 0, 0);
    return { sunrise, sunset };
  }

  const ha = Math.acos(cos_ha);
  const sunrise_time = 720 - 4 * (lon + ha * 180 / Math.PI) - eqtime;
  const sunset_time = 720 - 4 * (lon - ha * 180 / Math.PI) - eqtime;

  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunrise_time / 60), Math.floor(sunrise_time % 60), 0, 0);

  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunset_time / 60), Math.floor(sunset_time % 60), 0, 0);

  return { sunrise, sunset };
}

const formatTime = (date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

console.log('Testing San Francisco (37.7749, -122.4194):');
const sf = calculateSunTimes(37.7749, -122.4194);
console.log(`  Sunrise: ${formatTime(sf.sunrise)}`);
console.log(`  Sunset: ${formatTime(sf.sunset)}`);

console.log('\nTesting New York (40.7128, -74.0060):');
const ny = calculateSunTimes(40.7128, -74.0060);
console.log(`  Sunrise: ${formatTime(ny.sunrise)}`);
console.log(`  Sunset: ${formatTime(ny.sunset)}`);
