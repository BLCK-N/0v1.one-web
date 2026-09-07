(function () {
  "use strict";

  function enterFullscreen(event) {
    var target = event.currentTarget;
    var request = document.documentElement.requestFullscreen;

    if (!request) {
      return;
    }

    event.preventDefault();
    request.call(document.documentElement).then(function () {
      window.setTimeout(function () {
        window.location.href = target.href;
      }, 250);
    }).catch(function () {
      window.location.href = target.href;
    });
  }

  document.querySelectorAll("a[href]").forEach(function (link) {
    link.addEventListener("click", enterFullscreen);
  });
}());
