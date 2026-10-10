/* Shared by the presenter screen (index.html) and the phone remote (remote.html).
   The phone and the computer talk through a free public relay (ntfy.sh) over the internet,
   so they do NOT need to be on the same network: mobile data on the phone works. */
window.Deck = (function () {
  var RELAY = 'https://ntfy.sh/';
  var PREFIX = 'oren-lamoatza-shalat-';

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
  // "up" = phone -> screen, "down" = screen -> phone
  function topic(code, dir) { return PREFIX + code + '-' + dir; }

  function send(code, dir, msg) {
    msg.t = Date.now();
    return fetch(RELAY + topic(code, dir), { method: 'POST', body: JSON.stringify(msg) })
      .then(function (r) { if (!r.ok) throw new Error('relay ' + r.status); return true; });
  }

  // Calls onMsg(obj) for each message; onState('open'|'error') for the link.
  // Live push (EventSource) plus pull(): a one-off fetch of recent messages, for phone networks
  // that hold back live streams. Messages are de-duplicated by id, so both can run together.
  function listen(code, dir, onMsg, onState) {
    var seen = {}, closed = false;
    function deliver(d) {
      if (!d || d.event !== 'message' || !d.message || seen[d.id]) return;
      seen[d.id] = 1;
      try {
        var m = JSON.parse(d.message);
        // ignore leftovers from long ago (10 min) but tolerate a phone clock that is a bit off
        if (m && typeof m === 'object' && Math.abs(Date.now() - (m.t || 0)) < 600000) onMsg(m);
      } catch (err) {}
    }
    var es = new EventSource(RELAY + topic(code, dir) + '/sse');
    es.onopen = function () { onState && onState('open'); };
    es.onerror = function () { onState && onState('error'); };
    es.onmessage = function (e) { try { deliver(JSON.parse(e.data)); } catch (err) {} };
    return {
      close: function () { closed = true; es.close(); },
      pull: function (sinceSec) {
        if (closed) return Promise.resolve(false);
        return fetch(RELAY + topic(code, dir) + '/json?poll=1&since=' + (sinceSec || 30) + 's', { cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw new Error('relay ' + r.status); return r.text(); })
          .then(function (t) { t.split('\n').forEach(function (l) { if (l.trim()) { try { deliver(JSON.parse(l)); } catch (e) {} } }); return true; });
      }
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
