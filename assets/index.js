(function() {
  // cursor sparkle trail
  const sparkleChars = ['\u2728', '\u2605', '\u2726', '\u2727', '\u2740', '\u2663', '\u2660'];
  let lastSpark = 0;
  document.addEventListener('mousemove', function(e) {
    const now = Date.now();
    if (now - lastSpark < 45) return;
    lastSpark = now;
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.textContent = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];
    s.style.left = (e.clientX + (Math.random() - 0.5) * 10) + 'px';
    s.style.top = (e.clientY + (Math.random() - 0.5) * 10) + 'px';
    s.style.color = 'hsl(' + Math.floor(Math.random() * 360) + ',95%,60%)';
    document.body.appendChild(s);
    setTimeout(function() { s.remove(); }, 900);
  });

  // fake incrementing visitor counter
  const visitorEl = document.querySelector('.visitor');
  if (visitorEl) {
    let n = 1 + Math.floor(Math.random() * 7);
    setInterval(function() {
      if (Math.random() < 0.35) {
        n++;
        visitorEl.textContent = String(n).padStart(9, '0');
      }
    }, 2200);
  }

  // konami-ish: press K for more chaos
  document.addEventListener('keydown', function(e) {
    if (e.key === 'k' || e.key === 'K') {
      document.body.style.animation = 'starDrift 0.6s linear infinite';
      setTimeout(function() { document.body.style.animation = ''; }, 1500);
    }
  });
})();
