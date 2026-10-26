(function () {
  var canvases = document.querySelectorAll('canvas[data-net-bg]');
  if (!canvases.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function start(cv) {
    var ctx = cv.getContext('2d');
    var nodes = [], W = 0, H = 0, raf = null, visible = true;
    var LINK = parseFloat(cv.getAttribute('data-link')) || 150;
    var DENSITY = parseFloat(cv.getAttribute('data-density')) || 15000;
    var DM = parseFloat(cv.getAttribute('data-density-mobile'));
    if (DM && window.innerWidth <= 768) DENSITY = DM;

    function size() {
      var r = cv.parentNode.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = Math.min(110, Math.max(14, Math.round((W * H) / DENSITY)));
      while (nodes.length < want) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.4 + 0.8, gold: Math.random() < 0.12
        });
      }
      if (nodes.length > want) nodes.length = want;
      nodes.forEach(function (n) { if (n.x > W) n.x = Math.random() * W; if (n.y > H) n.y = Math.random() * H; });
    }

    function frame(move) {
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b, dx, dy, d, al;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x; dy = a.y - b.y;
          if (dx > LINK || dx < -LINK || dy > LINK || dy < -LINK) continue;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            al = (1 - d / LINK) * 0.32;
            ctx.strokeStyle = (a.gold || b.gold) ? 'rgba(255,215,0,' + (al * 0.9) + ')' : 'rgba(167,243,208,' + al + ')';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.fillStyle = a.gold ? 'rgba(255,215,0,0.85)' : 'rgba(209,250,229,0.8)';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
        if (move) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
        }
      }
    }

    function loop() {
      if (!visible || document.hidden) { raf = null; return; }
      frame(true);
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }

    size();
    frame(false);
    if (reduce) return;
    kick();

    if (window.ResizeObserver) {
      new ResizeObserver(function () { size(); if (reduce || !raf) frame(false); }).observe(cv.parentNode);
    } else {
      window.addEventListener('resize', size, { passive: true });
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) kick(); }).observe(cv.parentNode);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  }

  Array.prototype.forEach.call(canvases, start);
})();
