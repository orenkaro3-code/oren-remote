/* Shared by the presenter screen (index.html) and the phone remote (remote.html).
   No server: the phone connects straight to the computer over WebRTC (PeerJS free broker). */
window.Deck = (function () {
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
  return {
    mount: mount,
    count: function () { return window.SLIDES.length; },
    peerId: function (code) { return PREFIX + code; },
    newCode: newCode
  };
})();
