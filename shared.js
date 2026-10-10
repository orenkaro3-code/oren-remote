/* Shared by the presenter screen (index.html) and the phone remote (remote.html).
   The phone and the computer talk over the internet through the campaign site's small relay server,
   so they do NOT need to be on the same network: mobile data on the phone works. */
window.Deck = (function () {

  function slideEl(i) {
    var wrap = document.createElement('div');
    wrap.innerHTML = window.SLIDES[i].html;
    var s = wrap.firstElementChild;
    s.classList.add('slide');
    s.removeAttribute('id');
    s.setAttribute('dir', 'ltr');
    return s;
  }
  // Put slide i into `box`, scaled to fit and centered.
  function mount(box, i) {
    box.textContent = '';
    var s = slideEl(i);
    box.appendChild(s);
    function fit() {
      var w = box.clientWidth, h = box.clientHeight, k = Math.min(w / 1920, h / 1080);
      s.style.transform = 'translate(' + ((w - 1920 * k) / 2) + 'px,' + ((h - 1080 * k) / 2) + 'px) scale(' + k + ')';
    }
    fit();
    return { el: s, fit: fit };
  }
  function newCode() {
    var a = new Uint32Array(1); crypto.getRandomValues(a);
    return String(100000 + (a[0] % 900000));
  }

  /* ---- relay: two one-way channels per code ---- */
  // "up" = phone -> screen, "down" = screen -> phone.
  // Messages go through the campaign site's own small server (no daily limits from a public service).
  var RELAY = 'https://oren-lamoatza.vercel.app/api/relay';
  function url(code, dir) { return RELAY + '?code=' + code + '&dir=' + dir; }

  function send(code, dir, msg) {
    msg.t = Date.now();
    // plain-text body keeps this a "simple" request, so the browser sends it straight away
    return fetch(url(code, dir), { method: 'POST', body: JSON.stringify(msg) })
      .then(function (r) { if (!r.ok) throw new Error('relay ' + r.status); return true; });
  }

  // Calls onMsg(obj) for each new message; onState('open'|'error') for the link.
  // Checks for new messages several times a second while active, slower when nothing happens.
  function listen(code, dir, onMsg, onState) {
    var after = -1, closed = false, timer = null, busy = false, lastMsg = Date.now(), state = '';
    function setState(s) { if (s !== state) { state = s; onState && onState(s); } }
    function delay() {
      if (document.visibilityState !== 'visible') return 4000;
      var idle = Date.now() - lastMsg;
      return idle < 120000 ? 450 : idle < 600000 ? 1500 : 4000;
    }
    function schedule(ms) { clearTimeout(timer); if (!closed) timer = setTimeout(poll, ms); }
    function poll() {
      if (closed || busy) return Promise.resolve(false);
      busy = true;
      return fetch(url(code, dir) + '&after=' + after, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('relay ' + r.status); return r.json(); })
        .then(function (d) {
          busy = false;
          var first = after < 0;
          after = d.seq;
          setState('open');
          if (!first) (d.msgs || []).forEach(function (x) {
            lastMsg = Date.now();
            if (x && x.m && typeof x.m === 'object') { try { onMsg(x.m); } catch (e) {} }
          });
          schedule(delay());
          return true;
        })
        .catch(function () { busy = false; setState('error'); schedule(2000); return false; });
    }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { lastMsg = Date.now(); schedule(0); } });
    poll();
    return {
      close: function () { closed = true; clearTimeout(timer); },
      pull: function () { lastMsg = Date.now(); return poll(); }
    };
  }

  return {
    mount: mount,
    count: function () { return window.SLIDES.length; },
    newCode: newCode,
    send: send,
    listen: listen
  };
})();
