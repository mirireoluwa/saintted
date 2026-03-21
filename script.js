(function () {
  // Hide "Smooth Scroll" notice after first scroll (matches Framer behavior)
  var notice = document.getElementById("smooth-scroll-notice");
  if (notice) {
    var hidden = false;
    function hideNotice() {
      if (!hidden) {
        hidden = true;
        notice.style.display = "none";
      }
    }
    window.addEventListener("scroll", hideNotice, { passive: true });
    window.addEventListener("wheel", hideNotice, { passive: true });
  }
})();
