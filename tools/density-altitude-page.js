// Page script for the density altitude calculator. The formulas are in flight.js.
(function () {
  var F = window.Flight, $ = function (id) { return document.getElementById(id); };
  var result = $('result'), msg = $('msg');
  var last = { altUnit: 'ft', pressUnit: 'inHg', tempUnit: 'c' };
  var clean = function (v, d) { return String(Number(v.toFixed(d))); };
  var alt = function (feet, u) { return Math.round(F.toUnit(feet, u)).toLocaleString('en-US').replace('-', '−') + ' ' + u; };
  var signed = function (v, d) { return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d); };

  // Switching a unit converts what is already in the field.
  function convert(id, selectId, key, digits) {
    $(selectId).addEventListener('change', function () {
      var v = F.parseInput($(id).value), now = $(selectId).value;
      if (v !== null && v === v) $(id).value = clean(F.toUnit(F.fromUnit(v, last[key]), now), digits);
      last[key] = now;
      update();
    });
  }

  function update() {
    var au = $('altUnit').value, pu = $('pressUnit').value, tu = $('tempUnit').value;
    var e = F.parseInput($('elev').value), q = F.parseInput($('qnh').value), o = F.parseInput($('oat').value);
    var problem = null;
    if (e === null || e !== e) problem = 'Enter the field elevation.';
    else if (q === null || q !== q) problem = 'Enter the altimeter setting.';
    else if (o === null || o !== o) problem = 'Enter the outside air temperature.';
    var ef, qi, oc;
    if (!problem) {
      ef = F.fromUnit(e, au); qi = F.fromUnit(q, pu); oc = F.fromUnit(o, tu);
      if (ef < -2000 || ef > 30000) problem = 'That elevation is out of range. This calculator takes −2,000 to 30,000 ft.';
      else if (qi < 25 || qi > 33) problem = 'That altimeter setting looks wrong for ' + (pu === 'hPa' ? 'hPa' : 'inHg') + '. Check the value and the unit.';
      else if (oc < -60 || oc > 60) problem = 'That temperature looks wrong for ' + (tu === 'f' ? '°F' : '°C') + '. Check the value and the unit.';
    }
    msg.hidden = !problem; msg.textContent = problem || '';
    result.hidden = !!problem;
    if (problem) return;

    var pa = F.pressureAltitude(ef, qi), da = F.densityAltitude(pa, oc), isa = F.isaTemp(pa), dev = oc - isa;
    var tl = tu === 'f' ? '°F' : '°C', isaShown = F.toUnit(isa, tu), devShown = tu === 'f' ? dev * 9 / 5 : dev;
    result.innerHTML =
      '<div class="big"><b>' + alt(da, au) + '</b><span>Density altitude</span></div>' +
      '<div class="big"><b>' + alt(pa, au) + '</b><span>Pressure altitude</span></div>' +
      '<div class="small"><b>' + (isaShown < 0 ? '−' : '') + Math.abs(isaShown).toFixed(1) + ' ' + tl + '</b><span>Standard temperature at that altitude</span></div>' +
      '<div class="small"><b>' + signed(devShown, 1) + ' ' + tl + '</b><span>Difference from standard</span></div>' +
      '<div class="small wide"><b>' + alt(F.pressureAltitudeRule(ef, qi), au) + ' · ' + alt(F.densityAltitudeRule(pa, oc), au) + '</b><span>Rule of thumb: pressure altitude · density altitude</span></div>';
  }

  ['elev', 'qnh', 'oat'].forEach(function (id) { $(id).addEventListener('input', update); });
  convert('elev', 'altUnit', 'altUnit', 1);
  convert('qnh', 'pressUnit', 'pressUnit', 2);
  convert('oat', 'tempUnit', 'tempUnit', 1);
  document.querySelectorAll('button.sign').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = $(b.getAttribute('data-for')), v = F.parseInput(f.value);
      if (v !== null && v === v) { f.value = String(-v); update(); }
    });
  });
  update();
})();
