// Flight computer formulas, ported from the Headwind app (lib/logic/flight.dart
// and lib/logic/units.dart) so the site and the app give the same answers.
// Internal units: knots, feet, degrees Celsius, inches of mercury. Angles in
// degrees. Wind direction is where it blows FROM. Runs in a browser (as
// window.Flight) and under node (require). Nothing here touches the network.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Flight = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }

  // Dart's % never returns a negative number for a positive divisor; JS's does.
  function mod360(d) {
    var r = d % 360;
    return r < 0 ? r + 360 : r;
  }

  // 0 to 360, with 0 shown as 360 like a compass heading.
  function heading360(d) {
    var h = mod360(d);
    return h <= 0.0000001 ? 360 : h;
  }

  // -180 to 180.
  function signedAngle(d) {
    var a = mod360(d);
    return a > 180 ? a - 360 : a;
  }

  // Heading and ground speed to fly a course at a true airspeed in a wind.
  // Null when the crosswind is stronger than the airspeed, or the headwind
  // stops all progress. crosswind > 0: from the right. headwind < 0: tailwind.
  function windTriangle(course, tas, windDir, windSpeed) {
    if (tas <= 0) return null;
    var a = rad(windDir - course);
    var cross = windSpeed * Math.sin(a);
    if (Math.abs(cross) > tas) return null;
    var wca = deg(Math.asin(cross / tas));
    var head = windSpeed * Math.cos(a);
    var gs = tas * Math.cos(rad(wca)) - head;
    if (gs <= 0) return null;
    return { heading: heading360(course + wca), wca: wca, groundSpeed: gs, crosswind: cross, headwind: head };
  }

  // The wind found from what was flown (heading, TAS) and what happened over
  // the ground (track, ground speed).
  function findWind(heading, tas, track, groundSpeed) {
    var an = tas * Math.cos(rad(heading)), ae = tas * Math.sin(rad(heading));
    var gn = groundSpeed * Math.cos(rad(track)), ge = groundSpeed * Math.sin(rad(track));
    var wn = gn - an, we = ge - ae; // wind blowing TO
    var speed = Math.sqrt(wn * wn + we * we);
    if (speed < 0.05) return { direction: 360, speed: 0 };
    return { direction: heading360(deg(Math.atan2(we, wn)) + 180), speed: speed };
  }

  // headwind > 0: headwind, < 0: tailwind. crosswind > 0: from the right.
  function runwayWind(runwayHeading, windDir, windSpeed) {
    var a = rad(windDir - runwayHeading);
    return { headwind: windSpeed * Math.cos(a), crosswind: windSpeed * Math.sin(a) };
  }

  // "27" and "27L" mean 270, "09" means 90; a 3-digit value is a heading.
  function runwayToHeading(s) {
    var m = /^\s*(\d{1,3})\s*[LRC]?\s*$/i.exec(s);
    if (!m) return null;
    var n = parseInt(m[1], 10);
    if (m[1].length <= 2) return n >= 1 && n <= 36 ? n * 10 : null;
    return n >= 1 && n <= 360 ? n : null;
  }

  var STD_INHG = 29.92126;

  // ISA temperature (C) at a pressure altitude.
  function isaTemp(pressureAlt) { return 15 - 0.0019812 * pressureAlt; }

  // Station pressure (inHg) from the altimeter setting at a field elevation.
  function stationPressure(altimeter, elevation) {
    return altimeter * Math.pow(1 - 6.8755856e-6 * elevation, 5.2558797);
  }

  // Pressure altitude from field elevation and altimeter setting, standard atmosphere.
  function pressureAltitude(elevation, altimeter) {
    return (1 - Math.pow(stationPressure(altimeter, elevation) / STD_INHG, 0.190263)) * 145442.16;
  }

  // The rule of thumb: 1,000 ft per inch of mercury.
  function pressureAltitudeRule(elevation, altimeter) {
    return elevation + (29.92 - altimeter) * 1000;
  }

  // Density altitude from pressure altitude and outside air temperature (dry air).
  function densityAltitude(pressureAlt, oatC) {
    var p = STD_INHG * Math.pow(1 - 6.8755856e-6 * pressureAlt, 5.2558797);
    var tf = oatC * 9 / 5 + 32;
    return 145442.16 * (1 - Math.pow(17.326 * p / (459.67 + tf), 0.235));
  }

  // Rule of thumb: 120 ft per degree C above ISA.
  function densityAltitudeRule(pressureAlt, oatC) {
    return pressureAlt + 120 * (oatC - isaTemp(pressureAlt));
  }

  // Unit factors from the internal unit, as in the app.
  var FACTOR = { kt: 1, mph: 1.150779, kmh: 1.852, ft: 1, m: 0.3048, inHg: 1, hPa: 33.863886 };

  function toUnit(v, u) {
    if (u === 'c') return v;
    if (u === 'f') return v * 9 / 5 + 32;
    return v * FACTOR[u];
  }

  function fromUnit(v, u) {
    if (u === 'c') return v;
    if (u === 'f') return (v - 32) * 5 / 9;
    return v / FACTOR[u];
  }

  // What a person typed in a field. '' gives null, nonsense gives NaN. Takes
  // 5,355 as thousands, 6,5 as a decimal comma, and a real minus sign.
  function parseInput(text) {
    var s = String(text).trim().replace(/[\s\u00a0\u202f]/g, '').replace(/\u2212/g, '-');
    if (s === '') return null;
    if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    else if (/^[-+]?\d*,\d+$/.test(s)) s = s.replace(',', '.');
    var v = Number(s);
    return isFinite(v) ? v : NaN;
  }

  return {
    parseInput: parseInput,
    heading360: heading360, signedAngle: signedAngle, windTriangle: windTriangle, findWind: findWind,
    runwayWind: runwayWind, runwayToHeading: runwayToHeading, isaTemp: isaTemp, stationPressure: stationPressure,
    pressureAltitude: pressureAltitude, pressureAltitudeRule: pressureAltitudeRule, densityAltitude: densityAltitude,
    densityAltitudeRule: densityAltitudeRule, toUnit: toUnit, fromUnit: fromUnit
  };
});
