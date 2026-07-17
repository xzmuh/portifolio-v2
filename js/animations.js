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

  // Skewed/transformed text is expensive to rasterize on the CPU unless the
  // browser promotes the element to its own GPU layer first. Force that
  // promotion for every tween instead of letting layer creation happen
  // mid-animation, which is what was causing the frame drops.
  gsap.defaults({ force3D: true });

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
        if (c.rValue !== undefined) vars.backgroundColor = "rgba(" + c.rValue + "," + c.gValue + "," + c.bValue + "," + (c.aValue !== undefined ? c.aValue : 1) + ")";
        break;
      case "STYLE_TEXT_COLOR":
        if (c.rValue !== undefined) vars.color = "rgba(" + c.rValue + "," + c.gValue + "," + c.bValue + "," + (c.aValue !== undefined ? c.aValue : 1) + ")";
        break;
      case "STYLE_FILTER":
        if (c.filters && c.filters.length) {
          vars.filter = c.filters.map(function (f) {
            return f.type + "(" + f.value + (f.unit || "") + ")";
          }).join(" ");
        }
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
  function scaleMoveVars(vars, scale) {
    ["x", "y"].forEach(function (k) {
      if (typeof vars[k] === "string" && vars[k].indexOf("%") > -1) {
        vars[k] = (parseFloat(vars[k]) * scale) + "%";
      }
    });
  }

  function buildScrollScrubTimeline(actionList, triggerEl, scale) {
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
      if (scale !== undefined && scale !== 1) scaleMoveVars(vars, scale);
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
        if (scale !== undefined && scale !== 1) scaleMoveVars(vars, scale);
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
    // The project card parallax (+-50% self move) was tuned for desktop's spaced-out
    // stack layout. At mobile widths the cards sit close together in a single column,
    // so the full amplitude opens up large dead gaps between cards; tone it way down
    // instead of dropping the effect entirely.
    var isMobileProjectCard = window.innerWidth <= 767 && triggerEls[0] && triggerEls[0].classList.contains("project_item");
    var scale = isMobileProjectCard ? 0.15 : 1;

    triggerEls.forEach(function (triggerEl) {
      var tl = buildScrollScrubTimeline(actionList, triggerEl, scale);
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

  function setupScrollReveal(ev, actionList, offList) {
    var triggerEls = resolveEventTargets(ev);
    // .about-stair-item already has its own dedicated, staggered reveal (opacity +
    // directional slide, wired up in the page script). It also carries the generic
    // ".section_body" class, so without this it gets driven by both systems at
    // once: this "skew in" interaction sets an inline transform every time it
    // fires, which fully overrides the CSS-based reveal's transform (inline always
    // wins over a stylesheet), and the skew in particular is a known source of
    // text-clipping compositing bugs in mobile Safari. Exclude it here so only its
    // own reveal drives it.
    triggerEls = triggerEls.filter(function (el) { return !el.classList.contains("about-stair-item"); });
    if (!triggerEls.length) return;
    var once = !offList;
    triggerEls.forEach(function (triggerEl) {
      var tl = buildDiscreteTimeline(actionList, triggerEl);
      var offTl = offList ? buildDiscreteTimeline(offList, triggerEl) : null;
      ScrollTrigger.create({
        trigger: triggerEl,
        start: "top 88%",
        once: once,
        onEnter: function () { tl.play(0); },
        onLeaveBack: once ? undefined : function () { if (offTl) offTl.play(0); else tl.reverse(); }
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
      var axisState = {}; // paramGroupId -> {current, target, resting, axis, tweens: [{els, prop, a, b, unit}]}
      var cfgList = ev.config || [];
      paramGroups.forEach(function (pg) {
        var cfg = cfgList.filter(function (c) { return c.continuousParameterGroupId === pg.id; })[0] || {};

        // resolve elements and from/to values ONCE up front - the ticker below
        // runs every frame and must not touch the DOM or re-parse anything.
        var tweens = [];
        var frames = pg.continuousActionGroups || [];
        if (frames.length) {
          var kf0 = frames[0], kf1 = frames[frames.length - 1];
          kf0.actionItems.forEach(function (item0, idx) {
            var item1 = kf1.actionItems[idx];
            if (!item1) return;
            var els = resolveTargets(item0.config.target, triggerEl);
            if (!els.length) return;
            var v0 = {}, v1 = {};
            applyActionItemToVars(item0, v0);
            applyActionItemToVars(item1, v1);
            for (var k in v1) {
              var a = parseFloat(v0[k]) || 0;
              var b = parseFloat(v1[k]);
              if (isNaN(b)) continue;
              var unit = String(v1[k]).replace(/[-\d.]/g, "");
              tweens.push({ els: els, prop: k, a: a, b: b, unit: unit });
            }
          });
        }

        axisState[pg.id] = {
          current: cfg.restingState !== undefined ? cfg.restingState : 0,
          target: cfg.restingState !== undefined ? cfg.restingState : 0,
          resting: cfg.restingState !== undefined ? cfg.restingState : 0,
          smoothing: cfg.smoothing !== undefined ? cfg.smoothing : 80,
          axis: pg.type,
          tweens: tweens
        };
      });

      function onMove(e) {
        var rect = triggerEl.getBoundingClientRect();
        for (var id in axisState) {
          var st = axisState[id];
          var pct = st.axis === "MOUSE_X"
            ? ((e.clientX - rect.left) / rect.width) * 100
            : ((e.clientY - rect.top) / rect.height) * 100;
          st.target = Math.max(0, Math.min(100, pct));
        }
      }

      triggerEl.addEventListener("mousemove", onMove);
      triggerEl.addEventListener("mouseleave", function () {
        for (var id in axisState) axisState[id].target = axisState[id].resting;
      });

      gsap.ticker.add(function () {
        for (var id in axisState) {
          var st = axisState[id];
          var lerpFactor = 1 - Math.min(0.97, st.smoothing / 100);
          var next = lerp(st.current, st.target, lerpFactor);
          if (Math.abs(next - st.current) < 0.01) continue;
          st.current = next;
          var t = Math.max(0, Math.min(1, st.current / 100));
          for (var i = 0; i < st.tweens.length; i++) {
            var tw = st.tweens[i];
            var vars = {};
            vars[tw.prop] = lerp(tw.a, tw.b, t) + tw.unit;
            gsap.set(tw.els, vars);
          }
        }
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
        var t3 = ev.targets && ev.targets[0];
        var key3 = t3 ? (t3.id || t3.selector) : id;
        var outSiblings = byTriggerKey[key3] || [];
        var outId = outSiblings.filter(function (sid) { return events[sid].eventTypeId === "SCROLL_OUT_OF_VIEW"; })[0];
        var outList = outId ? actionLists[events[outId].action.config.actionListId] : null;
        setupScrollReveal(ev, actionList, outList);
        if (outId) handledOffEvents[outId] = true;
      } else if (ev.eventTypeId === "SCROLL_OUT_OF_VIEW") {
        // handled as part of its SCROLL_INTO_VIEW pair; if orphaned, skip
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
