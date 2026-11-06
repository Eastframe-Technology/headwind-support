// Page script for the crosswind calculator. The formulas are in flight.js.
(function () {
  var F = window.Flight, $ = function (id) { return document.getElementById(id); };
  var result = $('result'), msg = $('msg'), dg = $('diagram');

  function num(id) { return F.parseInput($(id).value); }
  function w(v) { return String(Math.round(Math.abs(v))); }
  function one(v) { return Math.abs(v).toFixed(1); }

  function arrow(x1, y1, x2, y2, color, width) {
    var a = Math.atan2(y2 - y1, x2 - x1), s = 8;
    var p1 = (x2 - s * Math.cos(a - 0.45)) + ',' + (y2 - s * Math.sin(a - 0.45));
    var p2 = (x2 - s * Math.cos(a + 0.45)) + ',' + (y2 - s * Math.sin(a + 0.45));
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" style="stroke:' + color + ';stroke-width:' + width + '"/>' +
      '<polygon points="' + x2 + ',' + y2 + ' ' + p1 + ' ' + p2 + '" style="fill:' + color + '"/>';
  }

  function draw(label, rh, wd, speed, r) {
    var cx = 150, cy = 125, R = 100, a = (wd - rh) * Math.PI / 180;
    var x = cx + R * Math.sin(a), y = cy - R * Math.cos(a);
    var parts = ['<rect class="rw" x="128" y="20" width="44" height="210" rx="3"/>',
      '<line class="cl" x1="150" y1="30" x2="150" y2="205"/>',
      '<text x="150" y="222" text-anchor="middle" style="font-weight:700">' + label + '</text>'];
    if (speed > 0) {
      var k = R / speed;
      if (Math.abs(r.headwind) * k > 2) parts.push(arrow(cx, cy - r.headwind * k, cx, cy, 'var(--accent)', 3));
      if (Math.abs(r.crosswind) * k > 2) parts.push(arrow(cx + r.crosswind * k, cy, cx, cy, 'var(--track)', 3));
      parts.push(arrow(x, y, cx, cy, 'var(--wind)', 3));
      var tx = Math.max(38, Math.min(262, x)), ty = Math.max(14, Math.min(250, y + (y < cy ? -6 : 16)));
      parts.push('<text x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" text-anchor="middle" style="fill:var(--wind);font-weight:600">' + F.heading360(wd).toFixed(0) + '° / ' + speed + '</text>');
    }
    dg.innerHTML = parts.join('');
    dg.setAttribute('aria-label', 'Runway ' + label + ' seen from above, pointing up, with the wind arrow blowing from ' + F.heading360(wd).toFixed(0) + ' degrees.');
  }

  function update() {
    var label = $('rwy').value.trim().toUpperCase(), rh = F.runwayToHeading($('rwy').value);
    var wd = num('wdir'), ws = num('wspd'), gust = num('gust'), limit = num('limit'), u = $('unit').value;
    var problem = null;
    if (rh === null) problem = 'Enter a runway number from 01 to 36, such as 27 or 09L, or a heading such as 275.';
    else if (wd === null || wd !== wd || wd < 0 || wd > 360) problem = 'Enter the wind direction in degrees, 0 to 360. It is where the wind blows from.';
    else if (ws === null || ws !== ws || ws < 0) problem = 'Enter the wind speed.';
    else if (gust !== gust || (gust !== null && gust < 0)) problem = 'Check the gust value, or leave it empty.';
    else if (limit !== limit || (limit !== null && limit < 0)) problem = 'Check the crosswind limit, or leave it empty.';
    msg.hidden = !problem; msg.textContent = problem || '';
    result.hidden = !!problem; dg.style.display = problem ? 'none' : '';
    if (problem) return;

    var r = F.runwayWind(rh, wd, ws), g = gust === null ? null : F.runwayWind(rh, wd, gust);
    var angle = Math.abs(F.signedAngle(wd - rh));
    var side = function (c) { return Math.round(Math.abs(c)) === 0 ? '' : c > 0 ? ', from the right' : ', from the left'; };
    var html = '<div class="big"><b>' + w(r.headwind) + ' ' + u + '</b><span>' + (Math.round(r.headwind) >= 0 ? 'Headwind' : 'Tailwind') + '</span></div>' +
      '<div class="big"><b>' + w(r.crosswind) + ' ' + u + '</b><span>Crosswind' + side(r.crosswind) + '</span></div>';
    if (g) html += '<div class="small"><b>' + w(g.crosswind) + ' ' + u + '</b><span>Crosswind in gusts' + side(g.crosswind) + '</span></div>' +
      '<div class="small"><b>' + w(g.headwind) + ' ' + u + '</b><span>' + (Math.round(g.headwind) >= 0 ? 'Headwind' : 'Tailwind') + ' in gusts</span></div>';
    if (limit !== null) {
      var worst = Math.max(Math.abs(r.crosswind), g ? Math.abs(g.crosswind) : 0), over = worst > limit;
      html += '<div class="wide"><span class="' + (over ? 'verdict-over' : 'verdict-ok') + '">' + (over ? 'Over your limit' : 'Within your limit') + ': ' + w(worst) + ' of ' + limit + ' ' + u + '</span></div>';
    }
    html += '<p class="how wide">angle between ' + wd + '° and ' + rh + '° = ' + angle.toFixed(0) + '°<br>' +
      'headwind = ' + ws + ' × cos ' + angle.toFixed(0) + '° = ' + (r.headwind < 0 ? '−' : '') + one(r.headwind) + '<br>' +
      'crosswind = ' + ws + ' × sin ' + angle.toFixed(0) + '° = ' + one(r.crosswind) + '</p>';
    result.innerHTML = html;
    draw(label, rh, wd, ws, r);
  }

  ['rwy', 'wdir', 'wspd', 'gust', 'limit'].forEach(function (id) { $(id).addEventListener('input', update); });
  $('unit').addEventListener('change', update);
  update();
})();
