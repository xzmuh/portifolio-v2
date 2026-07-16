/*
 * Self-hosted replacement for the Webflow IX2 interaction engine.
 * Reads the real interaction parameters extracted from this site's own
 * compiled Webflow bundle (js/interactions-data.json) and replays them
 * with GSAP + ScrollTrigger instead of Webflow's runtime.
 */
(function () {
  "use strict";

  var DATA = window.__INTERACTIONS_DATA__;
  if (!DATA || !window.gsap) return;

  gsap.registerPlugin(ScrollTrigger);

  var EASE_MAP = {
    "": "none",
    "ease": "power1.inOut",
    "outQuart": "quart.out",
    "outExpo": "expo.out",
    "outBack": "back.out(1.7)",
    "inOutSine": "sine.inOut"
  };

  function gsapEase(name) {
    return EASE_MAP[name] || "none";
  }

  function resolveTargets(target, triggerEl) {
    if (!target) return [];
    if (target.useEventTarget === true) return triggerEl ? [triggerEl] : [];
    if (target.useEventTarget === "CHILDREN") {
      var scope = triggerEl || document;
      return Array.prototype.slice.call(scope.querySelectorAll(target.selector));
    }
    if (target.selector) {
      return Array.prototype.slice.call(document.querySelectorAll(target.selector));
    }
    if (target.id) {
      var wid = target.id.indexOf("|") > -1 ? target.id.split("|")[1] : target.id;
      return Array.prototype.slice.call(document.querySelectorAll('[data-w-id="' + wid + '"]'));
    }
    return [];
  }

  function resolveEventTargets(ev) {
    var t = ev.targets && ev.targets[0];
    if (!t) return [];
    if (t.selector) return Array.prototype.slice.call(document.querySelectorAll(t.selector));
    if (t.id) {
      var wid = t.id.indexOf("|") > -1 ? t.id.split("|")[1] : t.id;
      return Array.prototype.slice.call(document.querySelectorAll('[data-w-id="' + wid + '"]'));
    }
    return [];
  }

  // Build a GSAP vars object contributed by one Webflow action item.
  // Mutates `acc` (accumulated per-element transform/style props).
  function applyActionItemToVars(item, vars) {
    var c = item.config;
    switch (item.actionTypeId) {
      case "STYLE_OPACITY":
        vars.opacity = c.value;
        break;
      case "STYLE_BACKGROUND_COLOR":
        vars.backgroundColor = c.globalSwatchId ? undefined : (c.r !== undefined ? "rgba(" + c.r + "," + c.g + "," + c.b + "," + c.a + ")" : undefined);
        break;
      case "STYLE_FILTER":
        if (c.blur !== undefined) vars.filter = "blur(" + c.blur + (c.blurUnit || "px") + ")";
        break;
      case "STYLE_SIZE":
        if (c.widthValue !== undefined) vars.width = c.widthValue + (c.widthUnit || "px");
        if (c.heightValue !== undefined) vars.height = c.heightValue + (c.heightUnit || "px");
        break;
      case "TRANSFORM_MOVE":
        if (c.xValue !== undefined) vars.x = c.xValue + (c.xUnit === "PX" ? "px" : (c.xUnit || "px"));
        if (c.yValue !== undefined) vars.y = c.yValue + (c.yUnit === "PX" ? "px" : (c.yUnit || "px"));
        if (c.zValue !== undefined) vars.z = c.zValue + (c.zUnit === "PX" ? "px" : (c.zUnit || "px"));
        break;
      case "TRANSFORM_SCALE":
        if (c.xValue !== undefined) vars.scaleX = c.xValue;
        if (c.yValue !== undefined) vars.scaleY = c.yValue;
        break;
      case "TRANSFORM_SKEW":
        if (c.xValue !== undefined) vars.skewX = c.xValue + (c.xUnit === "DEG" ? "deg" : "deg");
        if (c.yValue !== undefined) vars.skewY = c.yValue + (c.yUnit === "DEG" ? "deg" : "deg");
        break;
      case "TRANSFORM_ROTATE":
        if (c.zValue !== undefined) vars.rotation = c.zValue;
        break;
    }
  }

  // ---- Discrete (GENERAL_START_ACTION) action lists: play-once sequences ----
  function buildDiscreteTimeline(actionList, triggerEl, opts) {
    var tl = gsap.timeline({ paused: true });
    var groups = actionList.actionItemGroups || [];
    groups.forEach(function (group, gi) {
      var isInitial = gi === 0 && actionList.useFirstGroupAsInitialState;
      // items within a group may each carry their own delay/duration -> treat each as its own tween at its own offset
      group.actionItems.forEach(function (item) {
        var els = resolveTargets(item.config.target, triggerEl);
        if (!els.length) return;
        var vars = { duration: (item.config.duration || 0) / 1000, ease: gsapEase(item.config.easing) };
        applyActionItemToVars(item, vars);
        var delay = (item.config.delay || 0) / 1000;
        if (isInitial) {
          gsap.set(els, (function () { var v = {}; for (var k in vars) if (k !== "duration" && k !== "ease") v[k] = vars[k]; return v; })());
        } else {
          tl.to(els, vars, delay);
        }
      });
    });
    return tl;
  }

  // ---- Continuous (GENERAL_CONTINUOUS_ACTION / SCROLL_PROGRESS) ----
  // Real tweens between consecutive keyframes, not discrete .set() jumps,
  // so ScrollTrigger's scrub produces a smooth in-between motion instead of
  // an abrupt pop the instant a keyframe position is crossed.
  function buildScrollScrubTimeline(actionList, triggerEl) {
    var pg = actionList.continuousParameterGroups && actionList.continuousParameterGroups[0];
    if (!pg) return null;
    var groups = (pg.continuousActionGroups || []).slice().sort(function (a, b) { return a.keyframe - b.keyframe; });
    if (!groups.length) return null;
    var tl = gsap.timeline({ paused: true });

    // establish the first keyframe's values instantly (the resting state)
    groups[0].actionItems.forEach(function (item) {
      var els = resolveTargets(item.config.target, triggerEl);
      if (!els.length) return;
      var vars = {};
      applyActionItemToVars(item, vars);
      gsap.set(els, vars);
    });

    var prevPos = 0;
    for (var i = 1; i < groups.length; i++) {
      var group = groups[i];
      var pos = group.keyframe / 100;
      var segDuration = Math.max(0.001, pos - prevPos);
      group.actionItems.forEach(function (item) {
        var els = resolveTargets(item.config.target, triggerEl);
        if (!els.length) return;
        var vars = { duration: segDuration, ease: gsapEase(item.config.easing) };
        applyActionItemToVars(item, vars);
        tl.to(els, vars, prevPos);
      });
      prevPos = pos;
    }
    return tl;
  }

  function setupScrollTrigger(ev, actionList) {
    var triggerEls = resolveEventTargets(ev);
    if (!triggerEls.length) return;
    var cfg = (ev.config && ev.config[0]) || {};
    // startsEntering: reveal-style effect keyed to the element scrolling up into view.
    // Otherwise (Hero Scroll, false/false): a whole-element scroll-through, keyed to
    // the element's own top/bottom transiting the viewport (correct at scrollY=0 too).
    var enteringStyle = !!cfg.startsEntering;

    triggerEls.forEach(function (triggerEl) {
      var tl = buildScrollScrubTimeline(actionList, triggerEl);
      if (!tl) return;
      var smoothing = cfg.smoothing !== undefined ? cfg.smoothing : 50;
      var scrubVal = Math.max(0.1, (smoothing / 100) * 1.2);
      ScrollTrigger.create({
        trigger: triggerEl,
        start: enteringStyle ? "top 92%" : "top top",
        end: enteringStyle ? "top 35%" : "bottom top",
        scrub: scrubVal,
        animation: tl
      });
    });
  }

  function setupScrollReveal(ev, actionList, once) {
    var triggerEls = resolveEventTargets(ev);
    if (!triggerEls.length) return;
    triggerEls.forEach(function (triggerEl) {
      var tl = buildDiscreteTimeline(actionList, triggerEl);
      ScrollTrigger.create({
        trigger: triggerEl,
        start: "top 88%",
        once: once,
        onEnter: function () { tl.play(0); },
        onLeaveBack: once ? undefined : function () { tl.reverse(); }
      });
    });
  }

  function setupHoverPair(onEvent, offEvent, onList, offList) {
    var triggerEls = resolveEventTargets(onEvent);
    if (!triggerEls.length) return;
    triggerEls.forEach(function (triggerEl) {
      var onTl = buildDiscreteTimeline(onList, triggerEl);
      var offTl = offList ? buildDiscreteTimeline(offList, triggerEl) : null;
      triggerEl.addEventListener("mouseenter", function () { onTl.play(0); });
      triggerEl.addEventListener("mouseleave", function () {
        if (offTl) offTl.play(0); else onTl.reverse();
      });
    });
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function setupMouseParallax(ev, actionList) {
    var triggerEls = resolveEventTargets(ev);
    if (!triggerEls.length) return;
    var paramGroups = actionList.continuousParameterGroups || [];

    triggerEls.forEach(function (triggerEl) {
      var axisState = {}; // paramGroupId -> {current, target, resting, axis}
      var cfgList = ev.config || [];
      paramGroups.forEach(function (pg) {
        var cfg = cfgList.filter(function (c) { return c.continuousParameterGroupId === pg.id; })[0] || {};
        axisState[pg.id] = {
          current: cfg.restingState !== undefined ? cfg.restingState : 0,
          target: cfg.restingState !== undefined ? cfg.restingState : 0,
          resting: cfg.restingState !== undefined ? cfg.restingState : 0,
          smoothing: cfg.smoothing !== undefined ? cfg.smoothing : 80,
          axis: pg.type,
          basedOn: cfg.basedOn || "ELEMENT"
        };
      });

      function onMove(e) {
        var rect = triggerEl.getBoundingClientRect();
        paramGroups.forEach(function (pg) {
          var st = axisState[pg.id];
          var pct;
          if (pg.type === "MOUSE_X") {
            pct = ((e.clientX - rect.left) / rect.width) * 100;
          } else {
            pct = ((e.clientY - rect.top) / rect.height) * 100;
          }
          st.target = Math.max(0, Math.min(100, pct));
        });
      }

      triggerEl.addEventListener("mousemove", onMove);
      triggerEl.addEventListener("mouseleave", function () {
        paramGroups.forEach(function (pg) { axisState[pg.id].target = axisState[pg.id].resting; });
      });

      gsap.ticker.add(function () {
        var changed = false;
        paramGroups.forEach(function (pg) {
          var st = axisState[pg.id];
          var lerpFactor = 1 - Math.min(0.97, st.smoothing / 100);
          var next = lerp(st.current, st.target, lerpFactor);
          if (Math.abs(next - st.current) > 0.01) changed = true;
          st.current = next;
        });
        if (!changed) return;

        paramGroups.forEach(function (pg) {
          var st = axisState[pg.id];
          var frames = pg.continuousActionGroups || [];
          if (!frames.length) return;
          var kf0 = frames[0], kf1 = frames[frames.length - 1];
          var t = Math.max(0, Math.min(1, st.current / 100));
          kf0.actionItems.forEach(function (item0, idx) {
            var item1 = kf1.actionItems[idx];
            if (!item1) return;
            var els = resolveTargets(item0.config.target, triggerEl);
            if (!els.length) return;
            var vars = {};
            var v0 = {}, v1 = {};
            applyActionItemToVars(item0, v0);
            applyActionItemToVars(item1, v1);
            for (var k in v1) {
              var a = parseFloat(v0[k]) || 0;
              var b = parseFloat(v1[k]);
              if (isNaN(b)) continue;
              var unit = String(v1[k]).replace(/[-\d.]/g, "");
              vars[k] = lerp(a, b, t) + unit;
            }
            gsap.set(els, vars);
          });
        });
      });
    });
  }

  function init() {
    var events = DATA.events;
    var actionLists = DATA.actionLists;
    var handledOffEvents = {};

    // pair up hover on/off events sharing "Hover"/"Hover off" naming or MOUSE_OVER/MOUSE_OUT on same trigger
    var byTriggerKey = {};
    Object.keys(events).forEach(function (id) {
      var ev = events[id];
      var t = ev.targets && ev.targets[0];
      var key = t ? (t.id || t.selector) : id;
      byTriggerKey[key] = byTriggerKey[key] || [];
      byTriggerKey[key].push(id);
    });

    Object.keys(events).forEach(function (id) {
      if (handledOffEvents[id]) return;
      var ev = events[id];
      var alId = ev.action.config.actionListId;
      var actionList = actionLists[alId];
      if (!actionList) return;

      if (ev.eventTypeId === "MOUSE_OVER") {
        var t = ev.targets && ev.targets[0];
        var key = t ? (t.id || t.selector) : id;
        var siblings = byTriggerKey[key] || [];
        var offId = siblings.filter(function (sid) { return events[sid].eventTypeId === "MOUSE_OUT"; })[0];
        var offList = offId ? actionLists[events[offId].action.config.actionListId] : null;
        setupHoverPair(ev, offId ? events[offId] : null, actionList, offList);
        if (offId) handledOffEvents[offId] = true;
      } else if (ev.eventTypeId === "MOUSE_OUT") {
        // handled as part of its MOUSE_OVER pair; if orphaned, skip
      } else if (ev.eventTypeId === "MOUSE_MOVE") {
        setupMouseParallax(ev, actionList);
      } else if (ev.eventTypeId === "SCROLLING_IN_VIEW") {
        setupScrollTrigger(ev, actionList);
      } else if (ev.eventTypeId === "SCROLL_INTO_VIEW") {
        setupScrollReveal(ev, actionList, true);
      } else if (ev.eventTypeId === "SCROLL_OUT_OF_VIEW") {
        // paired with a SCROLL_INTO_VIEW on the same trigger for touch fallback; already covered by hover pair's reverse when applicable
      }
    });

    ScrollTrigger.refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
