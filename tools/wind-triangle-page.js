// Page script for the wind triangle calculator. The formulas are in flight.js.
(function () {
  var F = window.Flight, $ = function (id) { return document.getElementById(id); };
  var hdg = function (v) { var r = Math.round(F.heading360(v)); if (r === 0) r = 360; return ('00' + r).slice(-3) + '°'; };
  var side = function (c) { return Math.round(Math.abs(c)) === 0 ? '' : c > 0 ? ', from the right' : ', from the left'; };

  function line(a, b, color) {
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = 9;
    var p1 = (b[0] - s * Math.cos(ang - 0.42)).toFixed(1) + ',' + (b[1] - s * Math.sin(ang - 0.42)).toFixed(1);
    var p2 = (b[0] - s * Math.cos(ang + 0.42)).toFixed(1) + ',' + (b[1] - s * Math.sin(ang + 0.42)).toFixed(1);
    return '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" style="stroke:' + color + ';stroke-width:3;stroke-linecap:round"/>' +
      '<polygon points="' + b[0].toFixed(1) + ',' + b[1].toFixed(1) + ' ' + p1 + ' ' + p2 + '" style="fill:' + color + '"/>';
  }

  // North up. Air vector (heading at TAS) plus wind vector equals ground vector.
  function draw(svg, heading, tas, windDir, windSpeed) {
    var rad = Math.PI / 180;
    var A = [tas * Math.sin(heading * rad), tas * Math.cos(heading * rad)];
    var to = (windDir + 180) * rad;
    var G = [A[0] + windSpeed * Math.sin(to), A[1] + windSpeed * Math.cos(to)];
    var xs = [0, A[0], G[0]], ys = [0, A[1], G[1]];
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var W = 300, H = 210, pad = 22, spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
    var k = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
    var ox = (W - spanX * k) / 2 - minX * k, oy = (H + spanY * k) / 2 + minY * k;
    var P = function (p) { return [ox + p[0] * k, oy - p[1] * k]; };
    svg.innerHTML = line(P([0, 0]), P(A), 'var(--accent)') + line(P(A), P(G), 'var(--wind)') + line(P([0, 0]), P(G), 'var(--track)') +
      '<line x1="286" y1="34" x2="286" y2="12" style="stroke:var(--muted);stroke-width:1.5"/><text x="286" y="48" text-anchor="middle">N</text>';
  }

  function updateTriangle() {
    var c = F.parseInput($('course').value), t = F.parseInput($('tas').value), d = F.parseInput($('wdir').value), s = F.parseInput($('wspd').value), u = $('unit').value;
    var msg = $('msg'), result = $('result'), dg = $('diagram'), legend = $('legend'), problem = null, w = null;
    if (c === null || c !== c || c < 0 || c > 360) problem = 'Enter the true course in degrees, 0 to 360.';
    else if (t === null || t !== t || t <= 0) problem = 'Enter the true airspeed.';
    else if (d === null || d !== d || d < 0 || d > 360) problem = 'Enter the wind direction in degrees, 0 to 360. It is where the wind blows from.';
    else if (s === null || s !== s || s < 0) problem = 'Enter the wind speed.';
    else {
      w = F.windTriangle(c, t, d, s);
      if (!w) problem = 'No solution: this wind is too strong for that airspeed. The aircraft could not hold the course or would make no progress.';
    }
    msg.hidden = !problem; msg.textContent = problem || '';
    result.hidden = !!problem; dg.style.display = problem ? 'none' : ''; legend.hidden = !!problem;
    if (problem) return;
    var wca = Math.round(w.wca);
    result.innerHTML =
      '<div class="big"><b>' + hdg(w.heading) + '</b><span>True heading</span></div>' +
      '<div class="big"><b>' + Math.round(w.groundSpeed) + ' ' + u + '</b><span>Ground speed</span></div>' +
      '<div class="small"><b>' + (wca > 0 ? '+' : wca < 0 ? '−' : '') + Math.abs(wca) + '°</b><span>Wind correction angle</span></div>' +
      '<div class="small"><b>' + Math.round(Math.abs(w.headwind)) + ' ' + u + '</b><span>' + (Math.round(w.headwind) >= 0 ? 'Headwind' : 'Tailwind') + ' component</span></div>' +
      '<div class="small wide"><b>' + Math.round(Math.abs(w.crosswind)) + ' ' + u + '</b><span>Crosswind component' + side(w.crosswind) + '</span></div>';
    draw(dg, w.heading, t, d, s);
    dg.setAttribute('aria-label', 'Wind triangle: heading ' + hdg(w.heading) + ' at ' + t + ' ' + u + ', wind from ' + hdg(d) + ' at ' + s + ' ' + u + ', track ' + hdg(c) + ' at ' + Math.round(w.groundSpeed) + ' ' + u + '.');
  }

  function updateFind() {
    var h = F.parseInput($('fhdg').value), t = F.parseInput($('ftas').value), r = F.parseInput($('ftrk').value), g = F.parseInput($('fgs').value), u = $('funit').value;
    var msg = $('fmsg'), result = $('fresult'), problem = null;
    if ([h, r].some(function (v) { return v === null || v !== v || v < 0 || v > 360; })) problem = 'Enter heading and track in degrees, 0 to 360.';
    else if ([t, g].some(function (v) { return v === null || v !== v || v <= 0; })) problem = 'Enter the true airspeed and the ground speed.';
    msg.hidden = !problem; msg.textContent = problem || '';
    result.hidden = !!problem;
    if (problem) return;
    var f = F.findWind(h, t, r, g);
    result.innerHTML = '<div class="big"><b>' + hdg(f.direction) + '</b><span>Wind from</span></div><div class="big"><b>' + Math.round(f.speed) + ' ' + u + '</b><span>Wind speed</span></div>';
  }

  ['course', 'tas', 'wdir', 'wspd'].forEach(function (id) { $(id).addEventListener('input', updateTriangle); });
  $('unit').addEventListener('change', updateTriangle);
  ['fhdg', 'ftas', 'ftrk', 'fgs'].forEach(function (id) { $(id).addEventListener('input', updateFind); });
  $('funit').addEventListener('change', updateFind);
  updateTriangle();
  updateFind();
})();
