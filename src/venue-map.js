// Browser SDK identifier, not a secret. Restrict allowed web URLs in Naver Cloud.
const NAVER_CLIENT_ID = "sffg6ukgp6";
// Venue's official Naver directions destination, converted from EPSG:3857.
// https://www.botanicparkwedding.com/location
const VENUE = { latitude: 37.5673842, longitude: 126.827051 };

// Temporarily paused. Opt in explicitly when map API requests should resume.
export function setupVenueMap({ enabled = false } = {}) {
  const frame = document.getElementById("venue-map-frame");
  const canvas = document.getElementById("venue-map");
  const fallback = document.getElementById("venue-map-fallback");
  const status = document.getElementById("venue-map-status");
  if (!frame || !canvas || !fallback || !status || frame.dataset.mapMounted === "true") return;

  function showFallback() {
    frame.hidden = false;
    canvas.hidden = true;
    fallback.hidden = false;
    status.hidden = true;
  }

  if (!enabled) {
    frame.dataset.mapState = "paused";
    showFallback();
    return;
  }
  frame.dataset.mapMounted = "true";
  frame.dataset.mapState = "idle";
  frame.hidden = true;
  fallback.hidden = true;
  status.hidden = true;
  let state = "idle";
  let map;
  let timeout;

  function fail(reason) {
    if (state !== "loading" && !(state === "ready" && reason === "authentication")) return;
    state = frame.dataset.mapState = "error";
    frame.dataset.mapError = reason;
    window.clearTimeout(timeout);
    showFallback();
  }

  function initialize() {
    if (state !== "loading" || map) return;
    const maps = window.naver?.maps;
    if (!maps) { fail("sdk-unavailable"); return; }
    try {
      const position = new maps.LatLng(VENUE.latitude, VENUE.longitude);
      canvas.hidden = false;
      map = new maps.Map(canvas, {
        center: position,
        zoom: 16,
        // Keep page scrolling and the existing page-wide gesture protection.
        draggable: false,
        scrollWheel: false,
        pinchZoom: false,
        disableDoubleClickZoom: true,
        disableDoubleTapZoom: true,
        keyboardShortcuts: false,
        zoomControl: true,
        zoomControlOptions: { position: maps.Position.TOP_RIGHT },
        mapDataControl: true,
      });
      new maps.Marker({
        map,
        position,
        title: "보타닉 웨딩파크",
        icon: {
          content: '<div class="venue-marker"><strong>보타닉 웨딩파크</strong><span>마곡나루역 · L층</span></div>',
          size: new maps.Size(172, 60),
          anchor: new maps.Point(86, 60),
        },
      });
      maps.Event.once(map, "tilesloaded", () => {
        if (state !== "loading") return;
        state = frame.dataset.mapState = "ready";
        window.clearTimeout(timeout);
        status.hidden = true;
      });
      const resize = () => {
        if (!frame.clientWidth || !frame.clientHeight || state === "error") return;
        map.setSize(new maps.Size(frame.clientWidth, frame.clientHeight));
        map.setCenter(position);
      };
      if (window.ResizeObserver) new window.ResizeObserver(resize).observe(frame);
      else window.addEventListener("resize", resize);
    } catch (error) {
      console.warn("Naver map initialization failed:", error);
      fail("initialization");
    }
  }

  function load() {
    if (state !== "idle") return;
    state = frame.dataset.mapState = "loading";
    frame.hidden = false;
    window.navermap_authFailure = () => fail("authentication");
    timeout = window.setTimeout(() => fail("timeout"), 12000);
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}`;
    // Initialize after the entire SDK has executed and published naver.maps.
    script.addEventListener("load", initialize, { once: true });
    script.addEventListener("error", () => fail("network"), { once: true });
    document.head.appendChild(script);
  }

  if (window.IntersectionObserver) {
    const observer = new window.IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "300px 0px" });
    // The map starts collapsed; observe the visible Location section instead.
    observer.observe(frame.parentElement);
  } else {
    load();
  }
}
