// Run with: node --test tools/flight.test.js
// The vectors come from the Headwind app's test/flight_test.dart, plus the
// worked examples the app shows in its screenshots and the numbers quoted on
// this site's own pages.
const test = require('node:test');
const assert = require('node:assert');
const F = require('./flight.js');

function close(actual, expected, tol, msg) {
  assert.ok(Math.abs(actual - expected) <= tol, `${msg || ''} got ${actual}, expected ${expected} +/- ${tol}`);
}

test('wind triangle: crosswind from the left, correct left, slightly slower', () => {
  const w = F.windTriangle(90, 120, 360, 20);
  close(w.wca, -9.59, 0.01);
  close(w.heading, 80.41, 0.01);
  close(w.groundSpeed, 118.32, 0.01);
  close(w.crosswind, -20, 0.001);
  close(w.headwind, 0, 0.001);
});

test('wind triangle: straight headwind and tailwind', () => {
  close(F.windTriangle(360, 100, 360, 30).groundSpeed, 70, 1e-9);
  close(F.windTriangle(360, 100, 180, 30).groundSpeed, 130, 1e-9);
  assert.strictEqual(F.windTriangle(360, 100, 180, 30).heading, 360);
});

test('wind triangle: textbook example TC 345, TAS 120, wind 030/15', () => {
  const w = F.windTriangle(345, 120, 30, 15);
  assert.strictEqual(Math.round(w.heading), 350);
  assert.strictEqual(Math.round(w.groundSpeed), 109);
});

test('wind triangle: no solution when the crosswind beats the airspeed', () => {
  assert.strictEqual(F.windTriangle(90, 20, 360, 30), null);
});

test('wind triangle: the app screenshot, TC 60, TAS 105, wind 330/30', () => {
  const w = F.windTriangle(60, 105, 330, 30);
  assert.strictEqual(Math.round(w.heading), 43);
  assert.strictEqual(Math.round(w.groundSpeed), 101);
  assert.strictEqual(Math.round(w.wca), -17);
  assert.strictEqual(Math.round(w.crosswind), -30);
});

test('finding the wind reverses the triangle', () => {
  const w = F.findWind(80.41, 120, 90, 118.32);
  assert.ok(Math.abs(F.signedAngle(w.direction - 360)) < 0.2);
  close(w.speed, 20, 0.05);
});

test('runway wind components', () => {
  const r = F.runwayWind(270, 300, 20);
  close(r.headwind, 17.32, 0.01);
  close(r.crosswind, 10, 0.01);
  close(F.runwayWind(90, 270, 10).headwind, -10, 1e-9);
  assert.strictEqual(F.runwayToHeading('27L'), 270);
  assert.strictEqual(F.runwayToHeading('09'), 90);
  assert.strictEqual(F.runwayToHeading('36'), 360);
  assert.strictEqual(F.runwayToHeading('37'), null);
  assert.strictEqual(F.runwayToHeading('275'), 275);
});

test('runway wind: the app screenshot, 27L, wind 300 at 18 gusting 26', () => {
  const rh = F.runwayToHeading('27L');
  const r = F.runwayWind(rh, 300, 18), g = F.runwayWind(rh, 300, 26);
  assert.strictEqual(Math.round(r.headwind), 16);
  assert.strictEqual(Math.round(r.crosswind), 9);
  assert.strictEqual(Math.round(g.crosswind), 13);
});

test('pressure altitude', () => {
  close(F.pressureAltitude(5000, 29.92), 5000, 5);
  close(F.pressureAltitude(1000, 30.42), F.pressureAltitudeRule(1000, 30.42), 60);
  close(F.pressureAltitudeRule(1000, 30.42), 500, 1e-9);
});

test('density altitude: ISA gives the pressure altitude, heat raises it', () => {
  close(F.densityAltitude(5000, F.isaTemp(5000)), 5000, 60);
  close(F.densityAltitude(5000, 25), F.densityAltitudeRule(5000, 25), 300);
  close(F.densityAltitude(0, 15), 0, 40);
  close(F.isaTemp(10000), -4.8, 0.05);
});

test('density altitude: the app screenshot, 5355 ft, 30.12 inHg, 31 C', () => {
  const pa = F.pressureAltitude(5355, 30.12);
  assert.strictEqual(Math.round(pa), 5178);
  close(F.densityAltitude(pa, 31), 8140, 5);
  close(F.isaTemp(pa), 4.7, 0.05);
  close(31 - F.isaTemp(pa), 26.3, 0.05);
  close(F.pressureAltitudeRule(5355, 30.12), 5155, 1e-6);
  close(F.densityAltitudeRule(pa, 31), 8330, 5);
});

test('units and angles', () => {
  close(F.toUnit(100, 'mph'), 115.08, 0.01);
  close(F.toUnit(30, 'f'), 86, 1e-9);
  close(F.fromUnit(1013.25, 'hPa'), 29.92, 0.005);
  close(F.fromUnit(F.toUnit(1234.5, 'm'), 'm'), 1234.5, 1e-9);
  assert.strictEqual(F.heading360(0), 360);
  assert.strictEqual(F.heading360(-10), 350);
  assert.strictEqual(F.signedAngle(350), -10);
});

test('field input parsing', () => {
  assert.strictEqual(F.parseInput('5,355'), 5355);
  assert.strictEqual(F.parseInput('30,12'), 30.12);
  assert.strictEqual(F.parseInput('\u22125'), -5);
  assert.strictEqual(F.parseInput(''), null);
  assert.ok(Number.isNaN(F.parseInput('abc')));
});
