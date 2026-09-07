(function () {
  "use strict";

  var entered = false;

  document.addEventListener("click", function () {
    if (entered || !document.documentElement.requestFullscreen) {
      return;
    }

    entered = true;
    document.documentElement.requestFullscreen().catch(function () {
      entered = false;
    });
  }, { once: true });
}());
