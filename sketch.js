let maxWidth, maxHeight;
let bg;           //  graphics buffer
let mushrooms = [];
const DESIGN_W = 1200;  // design canvas width
const DESIGN_H = 1000;  // design canvas height
let bigMushroomFlowT = 0; // time parameter for big mushroom cap flow animation

// ================== Background ==================

function buildBackground() {
  
  maxWidth = windowWidth;
  maxHeight = windowHeight;

  stroke("#BC7653");
  strokeWeight(1);
  randomSeed(1);

  bg = createGraphics(maxWidth, maxHeight);
  bg.background("#070C08");

  const density = 40;
  const gap = max(maxWidth, maxHeight) / density;
  const lines = [];
  let odd = false;

  for (let y = 0; y <= maxHeight + gap; y += gap) {
    odd = !odd;
    const rowPoints = [];
    const oddFactor = odd ? gap / 2 : 0;

    for (let x = 0; x <= maxWidth + gap; x += gap) {
      rowPoints.push({
        x: x + (random() * 0.8 - 0.4) * gap + oddFactor,
        y: y + (random() * 0.8 - 0.4) * gap
      });
    }
    lines.push(rowPoints);
  }

  odd = true;
  for (let y = 0; y < lines.length - 1; y++) {
    odd = !odd;
    const dotLine = [];
    for (let i = 0; i < lines[y].length; i++) {
      dotLine.push(odd ? lines[y][i] : lines[y + 1][i]);
      dotLine.push(odd ? lines[y + 1][i] : lines[y][i]);
    }
    for (let i = 0; i < dotLine.length - 2; i++) {
      drawTriangle(bg, dotLine[i], dotLine[i + 1], dotLine[i + 2]);
    }
  }
}

// Triangle for drawing background
function drawTriangle(g, a, b, c) {
  g.fill("#BC7653");
  g.stroke("#BC7653");
  g.bezier(
    a.x,
    a.y,
    (a.x + b.x) / 2 + random(-2, 2),
    (a.y + b.y) / 2 + random(-5, 5),
    (a.x + b.x) / 2 + random(-2, 2),
    (a.y + b.y) / 2 + random(-5, 5),
    b.x,
    b.y
  );
  g.bezier(
    b.x,
    b.y,
    (b.x + c.x) / 2 + random(-2, 2),
    (b.y + c.y) / 2 + random(-5, 5),
    (b.x + c.x) / 2 + random(-2, 2),
    (b.y + c.y) / 2 + random(-5, 5),
    c.x,
    c.y
  );
  g.bezier(
    c.x,
    c.y,
    (c.x + a.x) / 2 + random(-2, 2),
    (c.y + a.y) / 2 + random(-5, 5),
    (c.x + a.x) / 2 + random(-2, 2),
    (c.y + a.y) / 2 + random(-5, 5),
    a.x,
    a.y
  );

  g.fill("#070C08");
  g.stroke("#BC7653");
  g.beginShape();
  g.vertex(a.x, a.y);
  g.vertex(b.x, b.y);
  g.vertex(c.x, c.y);
  g.endShape(CLOSE);
}

// ================== Small mushrooms ---- Pattern / Cap / Stem / Base / Mushroom  ==================

// Cap pattern
// four types of cap patterns:
// circles_multi: multiple colored circles
// circles_mono: single color circles
// noisy_rings: concentric rings with noise
// nested: nested circles
const CAP_PATTERN = {
  NONE: "none",
  CIRCLES_MULTI: "circles_multi",
  NOISY_RINGS: "noisy_rings",
  NESTED: "nested",
  CIRCLES_MONO: "circles_mono"
};

// Stem Pattern
// three types of stem patterns:
// voronoi_cells: Voronoi cell pattern
// dot_tracks: circles arranged in vertical dot tracks
// dot_gradient: circles with size-based gradient
const STEM_PATTERN = {
  NONE: "none",
  VORONOI: "voronoi_cells",
  DOT_TRACKS: "dot_tracks",
  DOT_GRADIENT: "dot_gradient"
};

// Base Pattern
// two types of base patterns:
// tracks_mono: mono colored tracks
// tracks_alt: alternating colored tracks
const BASE_PART_PATTERN = {
  NONE: "none",
  TRACKS_MONO: "tracks_mono",
  TRACKS_ALT: "tracks_alt"
};

// Clip Tool: Only show painterFn’s drawing within areaPathFn area
function withClip(areaPathFn, painterFn) {
  let ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  areaPathFn(ctx);
  ctx.clip();
  painterFn();
  ctx.restore();
}

// Polygon bounding box: find minx, miny, maxx, maxy of polygon points
// When we need to generate random points within a polygon, we first find its bounding box to limit the area for random sampling
function boundingBox(poly) {
  let minx = Infinity,
    miny = Infinity,
    maxx = -Infinity,
    maxy = -Infinity;
  for (let p of poly) {
    minx = min(minx, p.x);
    maxx = max(maxx, p.x);
    miny = min(miny, p.y);
    maxy = max(maxy, p.y);
  }
  return { minx, miny, maxx, maxy };
}

// PatternPainter
// Paint different patterns based on type
const PatternPainter = {
  paint(type, deps, opt = {}) {

    // Early return for NONE type
    if (
      !type ||
      type === CAP_PATTERN.NONE ||
      type === STEM_PATTERN.NONE ||
      type === BASE_PART_PATTERN.NONE
    )
      return;

    // Cap patterns
    if (type === CAP_PATTERN.CIRCLES_MULTI) {
      return this.circles(deps, Object.assign({}, opt, { mono: false }));
    }
    if (type === CAP_PATTERN.CIRCLES_MONO) {
      return this.circles(deps, Object.assign({}, opt, { mono: true }));
    }
    if (type === CAP_PATTERN.NESTED) {
      return this.nested(deps, opt);
    }
    if (type === CAP_PATTERN.NOISY_RINGS) {
      return this.noisyRings(deps, opt);
    }

    // Base patterns
    if (type === BASE_PART_PATTERN.TRACKS_MONO) {
      return this.baseTracks(deps, Object.assign({}, opt, { alt: false }));
    }
    if (type === BASE_PART_PATTERN.TRACKS_ALT) {
      return this.baseTracks(deps, Object.assign({}, opt, { alt: true }));
    }

    // Stem patterns
    if (type === STEM_PATTERN.VORONOI) {
      return this.stemVoronoi(deps, opt);
    }
    if (type === STEM_PATTERN.DOT_TRACKS) {
      return this.stemDotTracks(deps, opt);
    }
    if (type === STEM_PATTERN.DOT_GRADIENT) {
      return this.stemDotGradient(deps, opt);
    }
  },

  // ---------- Cap pattern: circles (multi / mono) ----------
  // Generated by chatgpt5.0 with modifications
  circles(deps, cfg) {
    let poly = deps.poly; // polygon area to fill
    let rx = deps.rx || (deps.w ? deps.w * 0.5 : 40); //  radius on x-axis
    let accent1_default = deps.accent1 || color(0, 0, 0); // default accent1 color
    let accent2_default = deps.accent2 || color(0, 0, 100); // default accent2 color

    let accent1 = accent1_default;
    let accent2 = accent2_default;

    // Override colors if provided in cfg
    if (cfg.accent1) {
      accent1 = color(
        cfg.accent1.h,
        cfg.accent1.s,
        cfg.accent1.b,
        cfg.accent1.a != null ? cfg.accent1.a : 100
      );
    }
    if (cfg.accent2) {
      accent2 = color(
        cfg.accent2.h,
        cfg.accent2.s,
        cfg.accent2.b,
        cfg.accent2.a != null ? cfg.accent2.a : 100
      );
    }

    let placed = [];// Placed circles that successfully drawn
    let count = 0; // Count of placed circles
    let bb = boundingBox(poly); // bounding box of polygon

    let minR = cfg.minR != null ? cfg.minR : rx * 0.03; // min radius of circles
    let maxR = cfg.maxR != null ? cfg.maxR : rx * 0.08; // max radius of circles
    let tries = cfg.tries != null ? cfg.tries : 1200; // prevent Infinite loop
    let maxCount = cfg.maxCount != null ? cfg.maxCount : 100; // max number of circles to place
    let gap = cfg.gap != null ? cfg.gap : rx * 0.03; // gap between circles

    let t = cfg.time != null ? cfg.time : frameCount * 0.1;
    let amp = cfg.noiseAmp != null ? cfg.noiseAmp : 0.3;
    let freq = cfg.noiseFreq != null ? cfg.noiseFreq : 0.015;

    for (let i = 0; i < tries && count < maxCount; i++) {
      let c = createVector(random(bb.minx, bb.maxx), random(bb.miny, bb.maxy));
      let r = random(minR, maxR);

      // Check for overlaps with existing circles
      let ok = true;
      for (let e of placed) {
        if (p5.Vector.dist(c, e.c) < r + e.r + gap) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      // Draw the circle
      noStroke();
      if (cfg.mono) {
        fill(accent1);
      } else {
        fill(random([accent1, accent2]));
      }

      // Use noise to vary circle size
      let n = noise(c.x * freq, c.y * freq, t);
      let s = 1 + amp * (n * 2 - 1);
      let rNow = r * s;
      circle(c.x, c.y, 2 * rNow);

      placed.push({ c, r });
      count++;
    }
  },

  // ---------- Cap pattern: nested ----------
  nested(deps, cfg = {}) {
    let poly = deps.poly; // polygon area to fill
    let rx = deps.rx || (deps.w ? deps.w * 0.5 : 40); //  radius on x-axis

    let accent1 = deps.accent1 || color(0, 0, 0);
    let accent2 = deps.accent2 || color(0, 0, 100);

    if (cfg.accent1) {
      accent1 = color(
        cfg.accent1.h,
        cfg.accent1.s,
        cfg.accent1.b,
        cfg.accent1.a != null ? cfg.accent1.a : 100
      );
    }
    if (cfg.accent2) {
      accent2 = color(
        cfg.accent2.h,
        cfg.accent2.s,
        cfg.accent2.b,
        cfg.accent2.a != null ? cfg.accent2.a : 100
      );
    }

    let placed = [];// Placed circles that successfully drawn
    let count = 0;
    let bb = boundingBox(poly);

    let minR = cfg.minR != null ? cfg.minR : rx * 0.028;
    let maxR = cfg.maxR != null ? cfg.maxR : rx * 0.11;
    let tries = cfg.tries != null ? cfg.tries : 1200;
    let maxCount = cfg.maxCount != null ? cfg.maxCount : 145;
    let nestProb = cfg.nestProb != null ? cfg.nestProb : 0.45; // probability of nesting

    let t = cfg.time != null ? cfg.time : frameCount * 0.1;
    let amp = cfg.noiseAmp != null ? cfg.noiseAmp : 0.6;
    let freq = cfg.noiseFreq != null ? cfg.noiseFreq : 0.015;

    for (let i = 0; i < tries && count < maxCount; i++) {
      let c = createVector(random(bb.minx, bb.maxx), random(bb.miny, bb.maxy));
      let r = random(minR, maxR);

      let ok = true;
      for (let e of placed) {
        if (p5.Vector.dist(c, e.c) < r + e.r + rx * 0.01) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      noStroke();
      fill(accent1);
      
      // Use noise to vary circle size
      let n = noise(c.x * freq, c.y * freq, t);
      let s = 1 + amp * (n * 2 - 1);
      let rNow = r * s;
      circle(c.x, c.y, 2 * rNow);

      if (random() < nestProb) {
        fill(accent2);
        let rr = r * random(0.4, 0.6) * s; // nested circle radius with noise size variation
        circle(c.x, c.y, rr * 2);
      }

      placed.push({ c, r });
      count++;
    }
  },

  // ---------- Cap pattern: noisy rings ----------
  noisyRings(deps, cfg = {}) { 
    let topPts = deps.topPts || []; // array of points sampled from the Bézier curve at the top of the mushroom cap

    let timePhase = cfg.time != null ? cfg.time : frameCount * 0.02;// time parameter for noise animation

    let center = cfg.center || topPts[floor(topPts.length / 2)];// center point for the rings
    noStroke();

    let ringColor;

    if (cfg.ringColor) {
      // cfg.ringColor must be {h, s, b, a} format
      ringColor = color(
        cfg.ringColor.h,
        cfg.ringColor.s,
        cfg.ringColor.b,
        cfg.ringColor.a != null ? cfg.ringColor.a : 100
      );
    } else {
      ringColor = color(random(360), random(40, 85), random(40, 90));
    }

    fill(ringColor);

    //Draw ellipse as center base
    let ellW = random( //first parameter means min width, second means max width
      (cfg.ellWRange && cfg.ellWRange[0]) != null ? cfg.ellWRange[0] : 60,
      (cfg.ellWRange && cfg.ellWRange[1]) != null ? cfg.ellWRange[1] : 160
    );
    let ellH = // ellH = ellW * random aspect ratio within [minRatio, maxRatio]
      ellW *
      random(
        (cfg.ellAspectRange && cfg.ellAspectRange[0]) != null
          ? cfg.ellAspectRange[0]
          : 0.3,
        (cfg.ellAspectRange && cfg.ellAspectRange[1]) != null
          ? cfg.ellAspectRange[1]
          : 0.65
      );
    ellipse(center.x, center.y, ellW, ellH);

    let ellipseOuter = max(ellW, ellH) * 0.5;// Maximum radius of the circumcircle of the ellipse
    let ringCount = floor( //First parameter means min ring count, second means max ring count
      random(
        (cfg.ringCountRange && cfg.ringCountRange[0]) != null
          ? cfg.ringCountRange[0]
          : 5,
        (cfg.ringCountRange && cfg.ringCountRange[1]) != null
          ? cfg.ringCountRange[1]
          : 9
      )
    );
    let ringGap = cfg.ringGap != null ? cfg.ringGap : 22;// gap between rings
    let gapArc = cfg.gapArc != null ? cfg.gapArc : 6;// gap between circles along the arc

    let rings = []; // array of ring radii
    rings[0] = ellipseOuter + ringGap + random(5, 10);
    for (let i = 1; i < ringCount; i++) {
      rings[i] = rings[i - 1] + ringGap + random(8, 14);
    }

    //The dots are larger in the inner circle and smaller towards the outer circle
    //Try to use noise to vary the size of the dots, with chatgpt5.0's help
    let innerMax = (cfg.innerMax != null ? cfg.innerMax : 30) * 1.25;
    let innerMin = (cfg.innerMin != null ? cfg.innerMin : 16) * 1.10;
    let outerMax = (cfg.outerMax != null ? cfg.outerMax : 12) * 0.60;
    let outerMin = (cfg.outerMin != null ? cfg.outerMin : 6) * 0.45;
    let noiseFreq = cfg.noiseFreq != null ? cfg.noiseFreq : random(0.6, 1.2);//Frequency of magnitude variation noise
    let noiseBase = floor(random(1e6));//Base offset for noise function

    for (let idx = 0; idx < rings.length; idx++) {
      const r0 = rings[idx]; //current ring radius
      let th = 0; // current drawing angle
      let firstD = null; //first diameter drawn on this ring

      let t = idx / max(1, rings.length - 1); //lerp perameter
      let maxD = lerp(innerMax, outerMax, t); //max diameter for current ring
      let minD = lerp(innerMin, outerMin, t); //min diameter for current ring

      // Draw circles along the ring until the angle exceeds TWO_PI
      // Use noise to vary the diameter of circles along the ring
      while (th < TWO_PI) {
        let n = noise(
          noiseBase +  cos(th) * noiseFreq, // cos(th) * noiseFreq to create circular noise pattern
          noiseBase +  sin(th) * noiseFreq,// sin(th) * noiseFreq to create circular noise pattern
          timePhase
        );
        let d = map(n, 0, 1, minD, maxD);

        // Ensure circles fit within the ring without overlapping
        if (firstD === null) firstD = d;
        else {
          let need = (d + firstD + gapArc) / r0;
          if (TWO_PI - th < need) break;
        }

        let x = center.x + r0 * cos(th);
        let y = center.y + r0 * sin(th);
        circle(x, y, d);

        th += (d + gapArc) / r0;
      }
    }
  },

  // ---------- Base patterns: tracks ----------
  baseTracks(deps, cfg = {}) {
    let poly = deps.poly; // polygon area to fill
    let bb = boundingBox(poly); // bounding box of polygon

    let center = deps.center ? deps.center.copy
        ? deps.center.copy()
        : createVector(deps.center.x, deps.center.y) : createVector((bb.minx + bb.maxx) * 0.5, bb.maxy);

    // find max radius from center to polygon points
    let maxR = 0;
    for (let p of poly) {
      maxR = max(maxR, p5.Vector.dist(center, p));
    }

    let trackAngleStep = radians(10);
    let angleStart = PI;
    let angleEnd = TWO_PI;
    let circlesPerTrack = 12;
    let circleDiameter = maxR * 0.03;
    let radialStep = maxR / (circlesPerTrack + 1);// +1 to leave some gap at the edge

    let useAlt = cfg.alt ? true : false; // whether to use alternating colors

    noStroke();
    push();

    let c1_default = color(50, 63, 46);
    let c2_default = color(126, 22, 89);

    let c1 = c1_default;
    let c2 = c2_default;

    if (cfg.accent1) {
      const { h, s, b, a = 100 } = cfg.accent1;
      c1 = color(h, s, b, a);
    }

    if (cfg.accent2) {
      const { h, s, b, a = 100 } = cfg.accent2;
      c2 = color(h, s, b, a);
    }

    //
    // make dots flow by radial animation
      let trackIndex = 0;
    let totalSteps = floor((angleEnd - angleStart) / trackAngleStep);

    // New: time control to make dots flow along radius (from outer to inner)
    let tTime = cfg.time != null ? cfg.time : frameCount * 0.02;
    let flowSpeed = cfg.flowSpeed != null ? cfg.flowSpeed : 0.8; // Larger value = faster flow
    let loopRange = maxR; // Radius loop range

    // Draw tracks from angleStart to angleEnd
    for (let step = 0; step <= totalSteps; step++) {
      let angle = angleStart + step * trackAngleStep;
      let trackColor = useAlt
        ? (trackIndex % 2 === 0 ? c1 : c2)
        : c1;
      fill(trackColor);

      for (let i = 1; i <= circlesPerTrack; i++) {
        // Original base radius (arranged from inner to outer)
        let rBase = radialStep * i;

        // Key: make dots 'flow from outer to inner' by decreasing radius over time
        let rAnimated = rBase - tTime * flowSpeed * radialStep;

        // Wrap around: if less than 0, add back into range
        while (rAnimated < 0) {
          rAnimated += loopRange;
        }

        let x = center.x + rAnimated * cos(angle);
        let y = center.y + rAnimated * sin(angle);
        circle(x, y, circleDiameter);
      }

      trackIndex++;
    }
    pop();
  },

  // ---------- Stem pattern: Voronoi ----------
  //Used p5.voronoi library to generate Voronoi pattern
  stemVoronoi(deps, opt = {}) {
    let poly = deps.poly;

    let bb = boundingBox(poly);
    let w = bb.maxx - bb.minx;
    let h = bb.maxy - bb.miny;
    if (w <= 0 || h <= 0) return;

    let siteCount = opt.siteCount ?? 80; // number of Voronoi sites
    let noiseFreq = opt.noiseFreq ?? 0.02; // frequency for noise function
    let satRange = opt.satRange ?? 30;
    let briRange = opt.briRange ?? 40;

    let t = opt.time != null ? opt.time : frameCount * 0.05;// time parameter for noise animation

    // change base color with different formats into p5.Color
    function toP5Color(c, fallback) {
      if (!c) return fallback;
      if (c instanceof p5.Color) return c;
      if (typeof c === "object" && "h" in c && "s" in c && "b" in c) {
        return color(c.h, c.s, c.b, c.a ?? 100);
      }
      return fallback;
    }

    //set base color
    let baseCol = toP5Color(
      opt.baseColor,
      deps.accent1 || color(110, 60, 70)
    );
    let baseH = hue(baseCol);
    let baseS = saturation(baseCol);
    let baseB = brightness(baseCol);
    let edgeCol = toP5Color(
      opt.edgeColor,
      color(baseH, baseS * 0.3, min(baseB + 20, 100))
    );
    let edgeWeight = opt.edgeWeight ?? 1.5;

    // Generate pattern

    voronoiClearSites(); // Clear previous sites
    for (let i = 0; i < siteCount; i++) { // Add random sites
      voronoiSite(random(w), random(h));
    }
    voronoi(w, h, true); //Generate Voronoi diagram segments

    let diagram = voronoiGetDiagram();
    stroke(edgeCol);
    strokeWeight(edgeWeight);

    for (let c of diagram.cells) {
      if (c.halfedges) {

        let site = c.site; // center point of the cell
        let n = noise(site.x * noiseFreq, site.y * noiseFreq, t); // noise value to vary color slightly
        let s = baseS + (n - 0.5) * satRange;
        let b = baseB + (n - 0.5) * briRange;

        fill(baseH, s, b);
        beginShape();
        for (let he of c.halfedges) {
          let v = he.getStartpoint();
          vertex(bb.minx + v.x, bb.miny + v.y);
        }

        endShape(CLOSE); // close the shape
      }
    }

  },

  // ---------- Stem pattern: Dot Tracks ----------
  // Use random instead of noise for jitter
  stemDotTracks(deps, opt = {}) {
    let poly = deps.poly;

    let bb = boundingBox(poly);
    let width = bb.maxx - bb.minx;
    let height = bb.maxy - bb.miny;

    let trackCount = opt.trackCount != null ? opt.trackCount : 9; // number of vertical dot tracks
    let rows = opt.rows != null ? opt.rows : 9; // number of dots per track
    let marginX = opt.marginX != null ? opt.marginX : width * 0.05; // horizontal margin to 2 sides
    //let jitterY = opt.jitterY != null ? opt.jitterY : height * 0.01; // vertical jitter for dot positions
    let edgeScale = opt.edgeScale != null ? opt.edgeScale : 0.5; // scale factor for dots near the edges compared with center

    let baseR =
      opt.baseRadius != null ? opt.baseRadius : (width / trackCount) * 0.3;

    let rawCol = opt.dotColor || deps.accent1 || {
      h: 116,
      s: 35,
      b: 75,
      a: 100
    };

    let dc = color(
      rawCol.h,
      rawCol.s,
      rawCol.b,
      rawCol.a ?? 100
    );

    noStroke();
    fill(dc);

    let stepY = height / rows; 

    // make dots flow by y offset animation over time
    let tTime = opt.time != null ? opt.time : frameCount * 0.02;  
    let flowSpeed = opt.flowSpeed != null ? opt.flowSpeed : 0.8;  // speed of flow

    // Vertical offset accumulated over time and wrapped within height
    let offsetYAnim = (tTime * flowSpeed * stepY) % height;

    for (let k = 0; k < trackCount; k++) { // from left to right
    let tTrack = (k + 0.5) / trackCount;
    let x = lerp(bb.minx + marginX, bb.maxx - marginX, tTrack);

    // dots in the center are larger, dots near the edges are smaller
    let centerT = 0.5;
    let dist = abs(tTrack - centerT) / centerT;
    let scale = lerp(1.0, edgeScale, dist);

    for (let i = 1; i <= rows; i++) { // from top to bottom
        // Original base height for the i-th row (local coordinates)
        let yBase = stepY * i;

        // After adding time offset, wrap within [0, height)
        let yWrapped = (yBase + offsetYAnim) % height;

        // Then translate back to stem local coordinates (bb.miny is the top)
        // Use noise to add vertical jitter
        let noiseShake = opt.noiseShake ?? height * 0.03;
        let n = noise(k * 0.15, i * 0.15, frameCount * 0.02);
        let y = bb.miny + yWrapped + map(n, 0, 1, -noiseShake, noiseShake); 

        let r = baseR * scale * (1 + random(-0.05, 0.05));
        circle(x, y, r * 2);
    }
    }

  },

  // ---------- Stem pattern: Dot Gradient ----------
  stemDotGradient(deps, opt = {}) {
    let poly = deps.poly;

    let bb = boundingBox(poly);
    let width = bb.maxx - bb.minx;
    // let height = bb.maxy - bb.miny;

    let maxCount = opt.maxCount != null ? opt.maxCount : 200; // maximum number of dots to place
    let tries = opt.tries != null ? opt.tries : 1200; // prevent infinite loop
    let minR = opt.minR != null ? opt.minR : width * 0.02; // minimum radius of dots
    let maxR = opt.maxR != null ? opt.maxR : width * 0.06; // maximum radius of dots
    let jitterScale = opt.jitterScale != null ? opt.jitterScale : 0.15; // scale of radius jitter
    let gap = opt.gap != null ? opt.gap : minR * 0.2; // minimum gap between dots

    // time and noise parameters for size variation
    let tt    = opt.time != null ? opt.time : frameCount * 0.1; 
    let amp  = opt.noiseAmp != null ? opt.noiseAmp : 0.5;      
    let freq = opt.noiseFreq != null ? opt.noiseFreq : 0.1;    
    let rawCol = opt.dotColor || deps.accent1 || {h: 40, s: 80, b: 30, a: 100};
    let dc = color(rawCol.h, rawCol.s, rawCol.b, rawCol.a ?? 100);
    noStroke();
    fill(dc);

    let placed = []; // placed dots
    let count = 0; // count of placed dots

    for (let i = 0; i < tries && count < maxCount; i++) {
      let x = random(bb.minx, bb.maxx);
      let y = random(bb.miny, bb.maxy);
      let t = map(y, bb.miny, bb.maxy, 0, 1); // mapping y to [0,1] for radius lerp, if y is at top, t=0, if y is at bottom, t=1
      let rBase = lerp(minR, maxR, t); // interpolated base radius between [minR, maxR], top smaller, bottom larger
      rBase *= 1 + random(-jitterScale, jitterScale); // Use random to add some jitter to radius
      let r = max(1, rBase); // ensure radius is at least 1 to avoid too small dots

      // Check for overlaps with existing dots
      let ok = true;
      for (let e of placed) {
        if (
          p5.Vector.dist(createVector(x, y), e.c) <
          r + e.r + gap
        ) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      // Draw the dot with size variation using noise
      let n = noise(x * freq, y * freq, tt);
      let s = 1 + amp * (n * 2 - 1);  // vary in [1 - amp, 1 + amp]
      circle(x, y, r * 2 * s);
      count++;
    }
  }
};

// ---------- Cap class ----------
class Cap {
  constructor(spec) {
    this.visible = spec.visible != null ? spec.visible : true;

    this.w = spec.w;
    this.h = spec.h;

    this.archTop = spec.archTop;
    this.archBottom = spec.archBottom;
    this.wave = spec.wave;
    this.notch = spec.notch;

    this.baseColor = spec.baseColor;
    this.pattern = spec.pattern || {
      type: CAP_PATTERN.NOISY_RINGS,
      opt: {}
    };

    this.poly = null;
    this.topPts = null;
    this.rx = null;
    this.capColor = null;
    this.accent1 = null;
    this.accent2 = null;
    this.bounds = null;
  }

  buildGeometry() {
    const capWidth = this.w != null ? this.w : random(280, 420);
    const rx = capWidth / 2;
    const archTop =
      this.archTop != null ? this.archTop : random(100, 160);
    const archBottom =
      this.archBottom != null ? this.archBottom : random(30, 75);
    const tH = random(0.3, 0.42);

    const L = createVector(-rx, 0);
    const R = createVector(rx, 0);

    const C1_bot = createVector(
      lerp(L.x, R.x, tH),
      archBottom
    );
    const C2_bot = createVector(
      lerp(L.x, R.x, 1 - tH),
      archBottom
    );
    const C1_top = createVector(2 * L.x - C1_bot.x, -archTop);
    const C2_top = createVector(2 * R.x - C2_bot.x, -archTop);

    const steps = 220;

    const ampTop =
      this.wave && this.wave.ampTop != null
        ? this.wave.ampTop
        : random(5, 10);
    const ampBottom =
      this.wave && this.wave.ampBottom != null
        ? this.wave.ampBottom
        : random(2, 6);
    const freqTop =
      this.wave && this.wave.freqTop != null
        ? this.wave.freqTop
        : random(1.1, 2.0);
    const freqBottom =
      this.wave && this.wave.freqBottom != null
        ? this.wave.freqBottom
        : random(0.8, 1.6);
    const phaseTop =
      this.wave && this.wave.phaseTop != null
        ? this.wave.phaseTop
        : random(TWO_PI);
    const phaseBot =
      this.wave && this.wave.phaseBottom != null
        ? this.wave.phaseBottom
        : random(TWO_PI);

    const notchEnabled =
      this.notch && this.notch.enabled != null
        ? this.notch.enabled
        : random() < 0.55;
    const notchS0 =
      this.notch && this.notch.s0 != null
        ? this.notch.s0
        : random(0.28, 0.72);
    const notchWidth =
      this.notch && this.notch.width != null
        ? this.notch.width
        : random(0.04, 0.09);
    const notchDepth =
      this.notch && this.notch.depth != null
        ? this.notch.depth
        : random(8, 18);

    const topPts = [];
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      let x = bezierPoint(L.x, C1_top.x, C2_top.x, R.x, s);
      let y = bezierPoint(L.y, C1_top.y, C2_top.y, R.y, s);
      const w = sin(PI * s);
      const waveTop =
        ampTop * w * sin(TWO_PI * freqTop * s + phaseTop);
      y += waveTop;
      topPts.push(createVector(x, y));
    }

    const botPts = [];
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      let x = bezierPoint(R.x, C2_bot.x, C1_bot.x, L.x, s);
      let y = bezierPoint(R.y, C2_bot.y, C1_bot.y, L.y, s);
      const w = sin(PI * s);
      let waveBot =
        -ampBottom * w * sin(TWO_PI * freqBottom * s + phaseBot);
      y += waveBot;
      if (notchEnabled) {
        const ds = abs(s - notchS0);
        if (ds < notchWidth) {
          const u = ds / notchWidth;
          const win = 0.5 * (1 + cos(PI * u));
          y -= notchDepth * pow(win, 1.2);
        }
      }
      botPts.push(createVector(x, y));
    }

    const poly = topPts.concat(botPts);

    const baseH =
      this.baseColor && this.baseColor.h != null
        ? this.baseColor.h
        : random(360);
    const capCol = color(
      baseH,
      this.baseColor && this.baseColor.s != null
        ? this.baseColor.s
        : random(55, 80),
      this.baseColor && this.baseColor.b != null
        ? this.baseColor.b
        : random(60, 85),
      this.baseColor && this.baseColor.a != null
        ? this.baseColor.a
        : 100
    );
    const accent1 = color(
      (baseH + random(20, 60)) % 360,
      random(55, 90),
      random(60, 95)
    );
    const accent2 = color(
      (baseH + random(180, 240)) % 360,
      random(40, 75),
      random(60, 95)
    );

    const bb = boundingBox(poly);

    this.poly = poly;
    this.topPts = topPts;
    this.rx = rx;
    this.capColor = capCol;
    this.accent1 = accent1;
    this.accent2 = accent2;
    this.bounds = {
      x: bb.minx,
      y: bb.miny,
      w: bb.maxx - bb.minx,
      h: bb.maxy - bb.miny
    };
  }

  path(ctx) {
    const poly = this.poly;
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
  }

  draw() {
    if (!this.visible) return;
    if (!this.poly) this.buildGeometry();

    noStroke();
    fill(this.capColor);
    const ctx = drawingContext;
    ctx.save();
    ctx.beginPath();
    this.path(ctx);
    ctx.fill();
    ctx.restore();

    const deps = {
      poly: this.poly,
      topPts: this.topPts,
      rx: this.rx,
      accent1: this.accent1,
      accent2: this.accent2
    };
    withClip((c) => {
      this.path(c);
    }, () => {
      PatternPainter.paint(
        this.pattern.type,
        deps,
        this.pattern.opt || {}
      );
    });
  }
}

// ---------- Stem class ----------
class Stem {
  constructor(spec) {
    this.visible = spec.visible != null ? spec.visible : true;
    this.h = spec.h != null ? spec.h : 160;
    const baseW = spec.w != null ? spec.w : 36;
    this.topW = spec.topW != null ? spec.topW : baseW;
    this.bottomW =
      spec.bottomW != null ? spec.bottomW : this.topW * 1.4;
    this.ryTop = spec.ryTop != null ? spec.ryTop : this.h * 0.18;
    this.ryBottom =
      spec.ryBottom != null ? spec.ryBottom : this.h * 0.22;
    this.bulge =
      spec.bulge != null
        ? constrain(spec.bulge, 0.08, 0.4)
        : 0.22;
    this.offsetY = spec.offsetY != null ? spec.offsetY : 60;
    
    // For calculating stem bounds 
    this.bounds = {
        x: -this.bottomW / 2,
        y: 0,
        w: this.bottomW,
        h: this.h
        };
    
    this.baseColor = spec.baseColor || {
      h: 35,
      s: 30,
      b: 92,
      a: 100
    };
    this.strokeWidth =
      spec.strokeWidth != null ? spec.strokeWidth : 0;
    this.strokeColor = spec.strokeColor || null;
    this.pattern = spec.pattern || {
      type: STEM_PATTERN.NONE,
      opt: {}
    };
  }

  path(ctx) {
    const h = this.h;
    const topW = this.topW;
    const bottomW = this.bottomW;
    const ryTop = this.ryTop;
    const ryBottom = this.ryBottom;
    const bulge = this.bulge;

    const topY = 0;
    const botY = h;
    const halfT = topW / 2;
    const halfB = bottomW / 2;

    const topC = topY + ryTop;
    const botC = botY - ryBottom;

    const K = 0.5522847498;

    const LT = { x: -halfT, y: topC };
    const RT = { x: halfT, y: topC };
    const LB = { x: -halfB, y: botC };
    const RB = { x: halfB, y: botC };

    const len = botC - topC;
    const k1 = len * (0.44 + bulge * 0.18);
    const k2 = len * (0.46 + bulge * 0.25);

    ctx.moveTo(LT.x, LT.y);

    ctx.bezierCurveTo(
      -halfT,
      topC - K * ryTop,
      -K * halfT,
      topC - ryTop,
      0,
      topC - ryTop
    );
    ctx.bezierCurveTo(
      K * halfT,
      topC - ryTop,
      halfT,
      topC - K * ryTop,
      RT.x,
      RT.y
    );

    ctx.bezierCurveTo(
      halfT,
      topC + k1,
      halfB,
      botC - k2,
      RB.x,
      RB.y
    );

    ctx.bezierCurveTo(
      halfB,
      botC + K * ryBottom,
      K * halfB,
      botC + ryBottom,
      0,
      botC + ryBottom
    );
    ctx.bezierCurveTo(
      -K * halfB,
      botC + ryBottom,
      -halfB,
      botC + K * ryBottom,
      LB.x,
      LB.y
    );

    ctx.bezierCurveTo(
      -halfB,
      botC - k2,
      -halfT,
      topC + k1,
      LT.x,
      LT.y
    );

    ctx.closePath();
  }

  draw() {
    if (!this.visible) return;

    push();
    translate(0, this.offsetY * (this.parentScale || 1));

    const col = color(
      this.baseColor.h != null ? this.baseColor.h : 35,
      this.baseColor.s != null ? this.baseColor.s : 30,
      this.baseColor.b != null ? this.baseColor.b : 92,
      this.baseColor.a != null ? this.baseColor.a : 100
    );

    const ctx = drawingContext;
    noStroke();
    ctx.save();
    ctx.beginPath();
    this.path(ctx);
    ctx.fillStyle = col.toString();
    ctx.fill();
    ctx.restore();

    if (this.strokeWidth > 0) {
      const ctx2 = drawingContext;
      ctx2.save();
      ctx2.beginPath();
      this.path(ctx2);

      let sc;
      if (this.strokeColor) {
        sc = color(
          this.strokeColor.h,
          this.strokeColor.s,
          this.strokeColor.b,
          this.strokeColor.a != null ? this.strokeColor.a : 100
        );
      } else {
        sc = color(0, 0, 20);
      }

      ctx2.strokeStyle = sc.toString();
      ctx2.lineWidth = this.strokeWidth;
      ctx2.stroke();
      ctx2.restore();
    }

    withClip((ctx2) => this.path(ctx2), () => {
      const bounds = {
        x: -this.bottomW / 2,
        y: 0,
        w: this.bottomW,
        h: this.h
      };

      if (
        this.pattern &&
        this.pattern.type &&
        this.pattern.type !== STEM_PATTERN.NONE
      ) {
        const poly = [
          createVector(bounds.x, bounds.y),
          createVector(bounds.x + bounds.w, bounds.y),
          createVector(bounds.x + bounds.w, bounds.y + bounds.h),
          createVector(bounds.x, bounds.y + bounds.h)
        ];

        PatternPainter.paint(
          this.pattern.type,
          { poly, rx: this.bottomW * 0.5 },
          this.pattern.opt || {}
        );
      }
    });

    pop();
  }
}

// ---------- BasePart class ----------
class BasePart {
  constructor(spec) {
    this.visible = spec.visible != null ? spec.visible : false;

    this.r = spec.r != null ? spec.r : 28;
    this.w = spec.w != null ? spec.w : this.r * 2.4;
    this.h = spec.h != null ? spec.h : this.r * 0.9;

    // For calculating stem bounds 
    this.bounds = {
        x: -this.w / 2,
        y: 0,
        w: this.w,
        h: this.h
        };

    this.offsetY = spec.offsetY != null ? spec.offsetY : 140;
    this.baseColor = spec.baseColor || {
      h: 35,
      s: 20,
      b: 85,
      a: 100
    };
    this.pattern = spec.pattern || {
      type: BASE_PART_PATTERN.NONE,
      opt: {}
    };

    this.bottomRadius =
      spec.bottomRadius != null ? spec.bottomRadius : 16;
    this.bottomSag =
      spec.bottomSag != null ? spec.bottomSag : 0.12;
    this.bottomTight =
      spec.bottomTight != null ? spec.bottomTight : 0.18;
    this.sideBulge =
      spec.sideBulge != null ? spec.sideBulge : 0.66;
    this.topRound =
      spec.topRound != null ? spec.topRound : 0.96;
  }

  path(ctx) {
    const w = this.w;
    const h = this.h;

    const r = constrain(this.bottomRadius, 0, 80);
    const sagRatio = constrain(this.bottomSag, 0, 0.6);
    const sideBulge = constrain(this.sideBulge, 0.35, 0.85);
    const topRound = constrain(this.topRound, 0.7, 0.98);

    const topY = -h / 2;
    const domeY = lerp(topY, 0, 1 - topRound);
    const wideY = topY + h * 0.56;
    const baseY = h / 2;

    const sideX = w / 2;
    const ctrlX = sideX * sideBulge;

    const footX = w * 0.44;

    const chinDrop = h * sagRatio;
    const chinY = baseY + chinDrop;
    const midCtrlY = baseY + chinDrop * 0.4;

    this.chinCenter = createVector(0, chinY);

    ctx.moveTo(-footX, baseY - r);

    ctx.bezierCurveTo(
      -footX,
      midCtrlY,
      -footX * 0.3,
      chinY,
      0,
      chinY
    );

    ctx.bezierCurveTo(
      footX * 0.3,
      chinY,
      footX,
      midCtrlY,
      footX,
      baseY - r
    );

    ctx.bezierCurveTo(
      sideX,
      baseY - h * 0.02,
      sideX,
      wideY,
      sideX * 0.96,
      wideY - h * 0.08
    );
    ctx.bezierCurveTo(
      sideX * 0.86,
      domeY,
      ctrlX,
      topY,
      0,
      topY
    );

    ctx.bezierCurveTo(
      -ctrlX,
      topY,
      -sideX * 0.86,
      domeY,
      -sideX * 0.96,
      wideY - h * 0.08
    );
    ctx.bezierCurveTo(
      -sideX,
      wideY,
      -sideX,
      baseY - h * 0.02,
      -footX,
      baseY - r
    );

    ctx.closePath();
  }

  draw() {
    if (!this.visible) return;

    push();
    translate(0, this.offsetY * (this.parentScale || 1));

    const col = color(
      this.baseColor.h != null ? this.baseColor.h : 35,
      this.baseColor.s != null ? this.baseColor.s : 20,
      this.baseColor.b != null ? this.baseColor.b : 85,
      this.baseColor.a != null ? this.baseColor.a : 100
    );

    const ctx = drawingContext;
    noStroke();
    ctx.save();
    ctx.beginPath();
    this.path(ctx);
    ctx.fillStyle = col.toString();
    ctx.fill();
    ctx.restore();

    withClip((ctx2) => this.path(ctx2), () => {
      const bounds = {
        x: -this.w * 0.5,
        y: -this.h * 0.5,
        w: this.w,
        h: this.h
      };
      if (
        this.pattern &&
        this.pattern.type &&
        this.pattern.type !== BASE_PART_PATTERN.NONE
      ) {
        const poly = [
          createVector(bounds.x, bounds.y),
          createVector(bounds.x + bounds.w, bounds.y),
          createVector(bounds.x + bounds.w, bounds.y + bounds.h),
          createVector(bounds.x, bounds.y + bounds.h)
        ];

        const baseH =
          this.baseColor.h != null ? this.baseColor.h : 35;
        const baseS =
          this.baseColor.s != null ? this.baseColor.s : 20;
        const baseB =
          this.baseColor.b != null ? this.baseColor.b : 85;
        const baseA =
          this.baseColor.a != null ? this.baseColor.a : 100;

        const accent1 = color(
          baseH,
          baseS + 15,
          min(baseB + 5, 100),
          baseA
        );
        const accent2 = color(
          (baseH + 40) % 360,
          baseS + 10,
          min(baseB + 10, 100),
          baseA
        );

        PatternPainter.paint(
          this.pattern.type,
          {
            poly,
            rx: this.w * 0.5,
            accent1,
            accent2,
            center: this.chinCenter
          },
          this.pattern.opt || {}
        );
      }
    });

    pop();
  }
}

// ---------- Mushroom class ----------
class Mushroom {
  constructor(spec) {
    this.id = spec.id || "m";
    this.seed =
      spec.seed != null ? spec.seed : Math.floor(Math.random() * 1e9);

    this.pose = spec.pose || {};
    this.scale = this.pose.scale != null ? this.pose.scale : 1;
    this.rot = this.pose.rot || 0;

    this.baseScale = this.scale; // record original scale
    this.isPulsing = false; //if in pulsing animation

    this.anchor = spec.anchor || {
      x: this.pose.x || 0,
      y: this.pose.y || 0
    };

    this.layout = spec.layout || {
      capOffset: { x: 0, y: 0 },
      stemOffset: { x: 0, y: 80 },
      baseOffset: { x: 0, y: 140 }
    };

    this.capPos = spec.capPos || null;
    this.stemPos = spec.stemPos || null;
    this.basePos = spec.basePos || null;

    this.cap = new Cap(spec.cap || {});
    this.stem = new Stem(spec.stem || {});
    this.base = new BasePart(spec.base || {});
  }

  draw() {
    randomSeed(this.seed);
    noiseSeed(this.seed);

    
    if (this.isPulsing) { //if in pulsing animation, update scale
      const amp = 0.3; // amplitude of pulsing
      this.scale = this.baseScale * (1 + amp * sin(frameCount * 0.05 + this.seed * 0.001));
    }

    const s = this.scale;
    const r = this.rot;

    const ax = this.anchor.x;
    const ay = this.anchor.y;

    const offCap = this.layout.capOffset || { x: 0, y: 0 };
    const offStem = this.layout.stemOffset || { x: 0, y: 80 };
    const offBase = this.layout.baseOffset || { x: 0, y: 140 };

    const capX = this.capPos ? this.capPos.x : ax + offCap.x;
    const capY = this.capPos ? this.capPos.y : ay + offCap.y;
    const stemX = this.stemPos ? this.stemPos.x : ax + offStem.x;
    const stemY = this.stemPos ? this.stemPos.y : ay + offStem.y;
    const baseX = this.basePos ? this.basePos.x : ax + offBase.x;
    const baseY = this.basePos ? this.basePos.y : ay + offBase.y;

    if (this.base && this.base.visible) {
      push();
      translate(baseX, baseY);
      rotate(r);
      scale(s);
      this.base.parentScale = s;
      this.base.draw();
      pop();
    }

    if (this.stem && this.stem.visible) {
      push();
      translate(stemX, stemY);
      rotate(r);
      scale(s);
      this.stem.parentScale = s;
      this.stem.draw();
      pop();
    }

    if (this.cap && this.cap.visible) {
      push();
      translate(capX, capY);
      rotate(r);
      scale(s);
      this.cap.parentScale = s;
      this.cap.draw();
      pop();
    }
  }
}

// ---------- TYPE_LIBRARY / SCENE_LAYOUT / makeMushroomFromLayout ----------

// Type library
const TYPE_LIBRARY = {
  default: {
    cap: {
      visible: true,
      w: 360,
      baseColor: { h: 258, s: 52, b: 71, a: 100 },
      pattern: { type: CAP_PATTERN.NESTED, opt: {} }
    },
    stem: {
      visible: true,
      h: 480,
      w: 40,
      offsetY: 70,
      topW: 80,
      bottomW: 150,
      ryTop: 20,
      ryBottom: 60,
      bulge: 0.24,
      baseColor: { h: 116, s: 35, b: 75, a: 100 },
      strokeWidth: 5,
      strokeColor: { h: 116, s: 35, b: 75, a: 100 },
      pattern: {
        type: STEM_PATTERN.DOT_GRADIENT,
        opt: {
          maxCount: 220,
          tries: 1500,
          minR: 3,
          maxR: 10,
          jitterScale: 0.15,
          gap: 1.5,
          dotColor: { h: 110, s: 60, b: 90, a: 100 }
        }
      }
    },
    base: {
      visible: true,
      r: 36,
      offsetY: -20,
      w: 320,
      h: 80,
      bottomRadius: 16,
      bottomSag: 0.9,
      bottomTight: 0.18,
      sideBulge: 0.66,
      topRound: 0.96,
      baseColor: { h: 50, s: 85, b: 90, a: 100 },
      pattern: { type: BASE_PART_PATTERN.TRACKS_MONO, opt: {} }
    },
    layout: {
      capOffset: { x: 0, y: 0 },
      stemOffset: { x: 0, y: 0 },
      baseOffset: { x: 0, y: 0 }
    }
  },
  withoutBasePart: {
    cap: {
      visible: true,
      w: 360,
      baseColor: { h: 258, s: 52, b: 71, a: 100 },
      pattern: { type: CAP_PATTERN.NESTED, opt: {} }
    },
    stem: {
      visible: true,
      h: 250,
      w: 40,
      offsetY: 70,
      topW: 80,
      bottomW: 150,
      ryTop: 20,
      ryBottom: 60,
      bulge: 0.24,
      baseColor: { h: 116, s: 35, b: 75, a: 100 },
      strokeWidth: 5,
      strokeColor: { h: 116, s: 35, b: 75, a: 100 },
      pattern: {
        type: STEM_PATTERN.DOT_GRADIENT,
        opt: {
          maxCount: 220,
          tries: 1500,
          minR: 3,
          maxR: 10,
          jitterScale: 0.15,
          gap: 1.5,
          dotColor: { h: 110, s: 60, b: 90, a: 100 }
        }
      }
    },
    base: {
      visible: false
    },
    layout: {
      capOffset: { x: 0, y: 0 },
      stemOffset: { x: 0, y: 0 },
      baseOffset: { x: 0, y: 0 }
    }
  }
};

// Scene layout for small mushrooms
const SCENE_LAYOUT = [
  {
    id: "m_greenL",
    type: "default",
    seed: 31007,
    anchor: { x: 184, y: 597 },
    pose: { scale: 0.5, rot: 0 },
    capOverride: {
      w: 360,
      archTop: 150,
      archBottom: 52,
      baseColor: { h: 354, s: 100, b: 77, a: 100 },
      pattern: {
        type: CAP_PATTERN.NESTED,
        opt: {
          accent1: { h: 44, s: 8, b: 88, a: 100 },
          accent2: { h: 139, s: 94, b: 52, a: 100 }
        }
      }
    },
    stemOverride: {
      h: 220,
      baseColor: { h: 120, s: 80, b: 80, a: 100 },
      offsetY: 110,
      strokeColor: { h: 132, s: 91, b: 44, a: 100 },
      pattern: {
        type: STEM_PATTERN.VORONOI,
        opt: {
          siteCount: 80,
          baseColor: { h: 120, s: 80, b: 80, a: 100 },
          edgeColor: { h: 132, s: 91, b: 44, a: 100 },
          edgeWeight: 1.2
        }
      }
    },
    baseOverride: {
      baseColor: { h: 50, s: 85, b: 90, a: 100 }
    }
  },

  {
    id: "m_smallBL",
    type: "withoutBasePart",
    seed: 31008,
    anchor: { x: 244, y: 820 },
    pose: { scale: 0.4, rot: 0 },
    capOverride: {
      w: 320,
      archTop: 200,
      archBottom: 100,
      baseColor: { h: 54, s: 92, b: 89, a: 100 },
      pattern: {
        type: CAP_PATTERN.NOISY_RINGS,
        opt: {
          ringColor: { h: 183, s: 99, b: 38, a: 100 }
        }
      }
    },
    stemOverride: {
      h: 380,
      topW: 100,
      bottomW: 200,
      ryTop: 24,
      ryBottom: 60,
      bulge: 0.3,
      baseColor: { h: 0, s: 100, b: 85, a: 100 },
      strokeColor: { h: 0, s: 100, b: 85, a: 100 },
      pattern: {
        type: STEM_PATTERN.DOT_TRACKS,
        opt: {
          trackCount: 11,
          rows: 15,
          dotColor: { h: 0, s: 0, b: 100, a: 100 },
          edgeScale: 0.4,
          jitterY: 2,
          baseRadius: 10
        }
      }
    }
  },

  {
    id: "m_midY",
    type: "default",
    seed: 31002,
    anchor: { x: 631, y: 654 },
    pose: { scale: 0.6, rot: 0 },
    capOverride: {
      w: 360,
      archTop: 160,
      archBottom: 50,
      baseColor: { h: 315, s: 45, b: 52, a: 100 },
      pattern: {
        type: CAP_PATTERN.NESTED,
        opt: {
          accent1: { h: 53, s: 93, b: 92, a: 100 },
          accent2: { h: 78, s: 79, b: 74, a: 100 }
        }
      }
    },
    stemOverride: {
      h: 500,
      topW: 90,
      bottomW: 180,
      ryTop: 26,
      ryBottom: 80,
      bulge: 0.3,
      baseColor: { h: 70, s: 99, b: 76, a: 100 },
      pattern: {
        type: STEM_PATTERN.VORONOI,
        opt: {
          siteCount: 80,
          baseColor: { h: 95, s: 85, b: 75, a: 100 },
          edgeColor: { h: 61, s: 85, b: 84, a: 100 },
          edgeWeight: 1.2
        }
      }
    },
    baseOverride: {
      baseColor: { h: 50, s: 85, b: 90, a: 100 }
    }
  },

  {
    id: "m_purple",
    type: "withoutBasePart",
    seed: 31003,
    anchor: { x: 844, y: 363 },
    pose: { scale: 0.45, rot: 0 },
    capOverride: {
      w: 340,
      archTop: 230,
      archBottom: 120,
      baseColor: { h: 168, s: 96, b: 41, a: 100 },
      pattern: {
        type: CAP_PATTERN.CIRCLES_MONO,
        opt: {
          minR: 8,
          maxR: 20,
          accent1: { h: 337, s: 68, b: 85, a: 100 }
        }
      }
    },
    stemOverride: {
      visible: true,
      h: 250,
      topW: 100,
      bottomW: 140,
      ryTop: 26,
      ryBottom: 30,
      bulge: 0.2,
      baseColor: { h: 52, s: 80, b: 92, a: 100 },
      strokeColor: { h: 52, s: 80, b: 92, a: 100 },
      pattern: {
        type: STEM_PATTERN.DOT_TRACKS,
        opt: {
          trackCount: 9,
          rows: 10,
          dotColor: { h: 154, s: 77, b: 37, a: 100 },
          edgeScale: 0.5,
          jitterY: 2,
          baseRadius: 6
        }
      }
    }
  },

  {
    id: "m_cluster1",
    type: "withoutBasePart",
    seed: 31006,
    anchor: { x: 748, y: 866 },
    pose: { scale: 0.2, rot: -Math.PI / 9 },
    capOverride: {
      w: 260,
      archTop: 200,
      archBottom: 60,
      baseColor: { h: 357, s: 99, b: 75, a: 100 },
      pattern: {
        type: CAP_PATTERN.CIRCLES_MONO,
        opt: {
          accent1: { h: 1, s: 5, b: 100, a: 100 },
          minR: 16,
          maxR: 20
        }
      }
    },
    stemOverride: {
      h: 400,
      topW: 120,
      bottomW: 200,
      ryTop: 22,
      ryBottom: 70,
      bulge: 0.3,
      baseColor: { h: 343, s: 58, b: 64, a: 100 },
      strokeColor: { h: 343, s: 58, b: 64, a: 100 },
      pattern: {
        type: STEM_PATTERN.DOT_TRACKS,
        opt: {
          trackCount: 9,
          rows: 18,
          marginX: 5,
          jitterY: 2,
          edgeScale: 0.3,
          baseRadius: 11,
          dotColor: { h: 348, s: 76, b: 60, a: 100 }
        }
      }
    }
  },

  {
    id: "m_cluster3",
    type: "withoutBasePart",
    seed: 31006,
    anchor: { x: 890, y: 746 },
    pose: { scale: 0.35, rot: -Math.PI / 36 },
    capOverride: {
      w: 400,
      archTop: 280,
      archBottom: 60,
      baseColor: { h: 38, s: 12, b: 90, a: 100 },
      pattern: {
        type: CAP_PATTERN.NESTED,
        opt: {
          accent1: { h: 356, s: 99, b: 79, a: 100 },
          accent2: { h: 52, s: 99, b: 92, a: 100 },
          maxCount: 100,
          maxR: 40,
          minR: 10
        }
      }
    },
    stemOverride: {
      h: 530,
      topW: 100,
      bottomW: 200,
      ryTop: 22,
      ryBottom: 100,
      bulge: 0.3,
      baseColor: { h: 53, s: 97, b: 91, a: 100 },
      strokeColor: { h: 53, s: 97, b: 91, a: 100 },
      pattern: {
        type: STEM_PATTERN.DOT_TRACKS,
        opt: {
          trackCount: 11,
          rows: 15,
          marginX: 5,
          jitterY: 2,
          edgeScale: 0.4,
          baseRadius: 10,
          dotColor: { h: 348, s: 54, b: 57, a: 100 }
        }
      }
    }
  },

  {
    id: "m_cluster2",
    type: "withoutBasePart",
    seed: 31006,
    anchor: { x: 818, y: 796 },
    pose: { scale: 0.35, rot: -Math.PI / 18 },
    capOverride: {
      w: 280,
      archTop: 180,
      archBottom: 50,
      baseColor: { h: 355, s: 99, b: 74, a: 100 },
      pattern: {
        type: CAP_PATTERN.NESTED,
        opt: {
          accent1: { h: 341, s: 90, b: 35, a: 100 },
          accent2: { h: 318, s: 55, b: 47, a: 100 },
          maxCount: 25,
          maxR: 30,
          minR: 10
        }
      }
    },
    stemOverride: {
      h: 300,
      topW: 100,
      bottomW: 220,
      ryTop: 22,
      ryBottom: 70,
      bulge: 0.3,
      baseColor: { h: 27, s: 12, b: 93, a: 100 },
      strokeColor: { h: 27, s: 12, b: 93, a: 100 },
      pattern: {
        type: STEM_PATTERN.DOT_TRACKS,
        opt: {
          trackCount: 9,
          rows: 12,
          marginX: 5,
          jitterY: 2,
          edgeScale: 0.3,
          baseRadius: 10,
          dotColor: { h: 356, s: 92, b: 73, a: 100 }
        }
      }
    }
  },

  {
    id: "m_cluster5",
    type: "withoutBasePart",
    seed: 31006,
    anchor: { x: 1040, y: 856 },
    pose: { scale: 0.24, rot: Math.PI / 9 },
    capOverride: {
      w: 280,
      archTop: 250,
      archBottom: 40,
      baseColor: { h: 163, s: 89, b: 34, a: 100 },
      pattern: {
        type: CAP_PATTERN.NOISY_RINGS,
        opt: {
          ringCountRange: [10, 15],
          ringColor: { h: 56, s: 99, b: 80, a: 100 }
        }
      }
    },
    stemOverride: {
      baseColor: { h: 0, s: 0, b: 100, a: 100 },
      strokeColor: { h: 0, s: 0, b: 100, a: 100 },
      h: 360,
      bottomW: 180,
      pattern: {
        type: STEM_PATTERN.DOT_GRADIENT,
        opt: {
          minR: 3,
          maxR: 10,
          dotColor: { h: 205, s: 85, b: 70, a: 100 },
          maxCount: 150
        }
      }
    }
  },

  {
    id: "m_cluster4",
    type: "withoutBasePart",
    seed: 31006,
    anchor: { x: 988, y: 786 },
    pose: { scale: 0.35, rot: Math.PI / 18 },
    capOverride: {
      w: 320,
      archTop: 220,
      archBottom: 80,
      baseColor: { h: 38, s: 12, b: 90, a: 100 },
      pattern: {
        type: CAP_PATTERN.NOISY_RINGS,
        opt: {
          ringCountRange: [10, 15],
          ringColor: { h: 337, s: 71, b: 43, a: 100 }
        }
      }
    },
    stemOverride: {
      h: 400,
      topW: 100,
      bottomW: 200,
      ryTop: 22,
      ryBottom: 70,
      bulge: 0.3,
      baseColor: { h: 0, s: 100, b: 85, a: 100 },
      strokeColor: { h: 0, s: 100, b: 85, a: 100 },
      pattern: {
        type: STEM_PATTERN.DOT_TRACKS,
        opt: {
          trackCount: 11,
          rows: 15,
          marginX: 10,
          dotColor: { h: 0, s: 0, b: 100, a: 100 },
          edgeScale: 0.4,
          jitterY: 2,
          baseRadius: 10
        }
      }
    }
  },

  {
    id: "m_redR",
    type: "default",
    seed: 31004,
    anchor: { x: 1034, y: 470 },
    pose: { scale: 0.5, rot: Math.PI / 3 },
    capOverride: {
      w: 340,
      archTop: 120,
      archBottom: 50,
      baseColor: { h: 359, s: 90, b: 80, a: 100 },
      pattern: {
        type: CAP_PATTERN.CIRCLES_MULTI,
        opt: {
          accent1: { h: 40, s: 6, b: 89, a: 100 },
          accent2: { h: 75, s: 66, b: 80, a: 100 },
          minR: 6,
          maxR: 14
        }
      }
    },
    stemOverride: {
      h: 220,
      topW: 80,
      bottomW: 100,
      ryTop: 24,
      ryBottom: 40,
      bulge: 0.24,
      baseColor: { h: 0, s: 0, b: 100, a: 100 },
      strokeColor: { h: 0, s: 0, b: 100, a: 100 },
      offsetY: 130,
      pattern: {
        type: STEM_PATTERN.DOT_TRACKS,
        opt: {
          trackCount: 5,
          rows: 12,
          marginX: 5,
          jitterY: 2,
          edgeScale: 0.3,
          baseRadius: 8,
          dotColor: { h: 0, s: 80, b: 80, a: 100 }
        }
      }
    },
    baseOverride: {
      baseColor: { h: 68, s: 56, b: 84, a: 100 },
      pattern: {
        type: BASE_PART_PATTERN.TRACKS_ALT,
        opt: {
          accent1: { h: 0, s: 61, b: 42, a: 100 },
          accent2: { h: 46, s: 11, b: 91, a: 100 }
        }
      }
    }
  },

  {
    id: "m_blueTop",
    type: "default",
    seed: 31005,
    anchor: { x: 1054, y: 112 },
    pose: { scale: 0.4, rot: 45 },
    capOverride: {
      w: 350,
      archTop: 140,
      archBottom: 50,
      baseColor: { h: 201, s: 99, b: 69, a: 100 },
      offsetY: -20,
      pattern: {
        type: CAP_PATTERN.CIRCLES_MONO,
        opt: {
          minR: 6,
          maxR: 20,
          maxCount: 110,
          gap: 6,
          accent1: { h: 0, s: 0, b: 100, a: 100 }
        }
      }
    },
    stemOverride: {
      h: 300,
      topW: 70,
      bottomW: 110,
      ryTop: 20,
      ryBottom: 44,
      bulge: 0.18,
      offsetY: 180,
      baseColor: { h: 0, s: 0, b: 100, a: 100 },
      strokeColor: { h: 0, s: 0, b: 100, a: 100 },
      pattern: {
        type: STEM_PATTERN.DOT_TRACKS,
        opt: {
          trackCount: 7,
          rows: 15,
          baseRadius: 6,
          edgeScale: 0.3,
          jitterY: 2,
          dotColor: { h: 201, s: 99, b: 69, a: 100 }
        }
      }
    },
    baseOverride: {
      baseColor: { h: 0, s: 0, b: 100, a: 100 },
      pattern: {
        type: BASE_PART_PATTERN.TRACKS_ALT,
        opt: {
          accent1: { h: 201, s: 40, b: 95, a: 100 },
          accent2: { h: 250, s: 9, b: 71, a: 100 }
        }
      }
    }
  }
];

// Factory function
// Creates a Mushroom instance from a layout spec
// Generated by ChatGPT 5.0 
function makeMushroomFromLayout(layout) {
  const typeSpec = TYPE_LIBRARY[layout.type];
  if (!typeSpec) {
    console.warn("Unknown mushroom type:", layout.type);
    return null;
  }

  const mergedCap = Object.assign(
    {},
    typeSpec.cap || {},
    layout.capOverride || {}
  );
  const mergedStem = Object.assign(
    {},
    typeSpec.stem || {},
    layout.stemOverride || {}
  );
  const mergedBase = Object.assign(
    {},
    typeSpec.base || {},
    layout.baseOverride || {}
  );
  const mergedLayout = Object.assign(
    {
      capOffset: { x: 0, y: 0 },
      stemOffset: { x: 0, y: 80 },
      baseOffset: { x: 0, y: 150 }
    },
    typeSpec.layout || {},
    layout.partLayoutOverride || {}
  );

  const anchor = layout.anchor || {
    x: layout.pose?.x || 0,
    y: layout.pose?.y || 0
  };

  return new Mushroom({
    id: layout.id,
    seed: layout.seed,
    anchor,
    pose: layout.pose || {},
    cap: mergedCap,
    stem: mergedStem,
    base: mergedBase,
    layout: mergedLayout
  });
}

// ==================== Large mushroom: cap & stem  ====================
// State for the big mushroom pulsing animation
let bigMushroom = {
  isPulsing: false,
  pulseScale: 1,
  pulseSpeed: 0.05,
  phase: 0,  
  minScale: 0.92,
  maxScale: 1.08,
  flowTime: 0
};

/* ================== Cap: more like the original art style ================== */
function drawCapReplica(cx, cy, W, H, time = 0) {
  const rimThk = 54;
  const topW = W * 1.05,
    topH = H * 0.95;
  const innerW = topW - rimThk * 2,
    innerH = topH - rimThk * 2;

  const aStart = PI + 0.04;
  const aEnd = TWO_PI - 0.04;
  const step = 0.012;

  const offsetDown = 56;
  const bumpAmp = 105;
  const upperLift = -16;
  const joinDip = 55;
  const joinSigma = 0.2;

  const edgeWin = 0.14;
  const len = aEnd - aStart;
  const smooth = (t) => t * t * (3 - 2 * t);

  const bendAmp = 18;
  const bendTilt = 0;
  function yBend(a) {
    const u = (a - aStart) / (aEnd - aStart);
    const t = u * 2 - 1;
    return -bendAmp * (1 - t * t) + bendTilt * t;
  }

  function rimWave(a) {
    const u = (a - aStart) / (aEnd - aStart);
    const t = u * 2 - 1;

    let bigWave = -20 * sin(u * PI * 1.1);
    let centerDip =
      8 * exp(-(t * t) / (2 * 0.35 * 0.35));
    let tinyNoise = 3 * sin(u * PI * 6.0);

    return bigWave - centerDip + tinyNoise;
  }

  let upper = [];
  for (let a = aStart; a <= aEnd; a += step) {
    upper.push(
      createVector(
        cx + (innerW * 0.5) * cos(a),
        cy + upperLift + (innerH * 0.5) * sin(a) + yBend(a)
      )
    );
  }

  let lower = [];
  const loW = W * 0.52;
  const loH = H * 0.44;

  const wave1 = 32,
    wave2 = 14,
    bumpSharp = 2.6,
    sideTuck = -6;

  for (let a = aEnd; a >= aStart; a -= step) {
    const tMid = (a - aStart) / len;

    const wL = smooth(constrain(tMid / edgeWin, 0, 1));
    const wR = smooth(
      constrain((1 - tMid) / edgeWin, 0, 1)
    );
    const w = min(wL, wR);

    const tt = map(a, PI, TWO_PI, -1, 1);
    const base = loH * sin(a);
    const droop =
      wave1 * sin(a * 5.0) +
      wave2 * sin(a * 9.0) +
      offsetDown +
      bumpAmp * exp(-bumpSharp * tt * tt) +
      sideTuck * cos(2 * a) +
      joinDip * exp(
        -(tt * tt) / (2 * joinSigma * joinSigma)
      );

    const edgeLift = 20 * (1 - sin(tMid * PI));

    const x = cx + loW * cos(a);
    const y =
      cy + base + w * droop + yBend(a) - edgeLift;

    lower.push(createVector(x, y));
  }

  noStroke();
  fill("#F3D225");
  beginShape();
  for (const p of upper) vertex(p.x, p.y);
  for (const p of lower) vertex(p.x, p.y);
  endShape(CLOSE);

  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(upper[0].x, upper[0].y);
  for (let i = 1; i < upper.length; i++)
    ctx.lineTo(upper[i].x, upper[i].y);
  for (let i = 0; i < lower.length; i++)
    ctx.lineTo(lower[i].x, lower[i].y);
  ctx.closePath();
  ctx.clip();

  stroke("#E7BA0E");
  strokeWeight(3);
  for (let i = 0; i < 17; i++) {
    let a = lerp(aStart, aEnd, i / 16),
      prev = null;
    for (let s = 0; s < 32; s++) {
      let r = lerp(H * 0.02, H * 0.9, s / 31);
      let x =
        cx + (r * cos(a)) * (W / H) * 0.46;
      let y =
        cy +
        r * sin(a) * 0.46 +
        3 * sin(s * 0.6 + i * 0.4) +
        yBend(a);
      if (prev) line(prev.x, prev.y, x, y);
      prev = createVector(x, y);
    }
  }

    noStroke();
    fill("#7C3A6B");

    const rings = 20;

    for (let r = 0; r < rings; r++) {
    // Original ring index position (0 = outermost, 1 = innermost)
    let t0 = r / (rings - 1);

    // Add time-based offset to t so rings flow from outer to inner
    // 0.08 is speed; adjust to make it faster/slower
    let tMove = (t0 - time * 0.08) % 1;
    if (tMove < 0) tMove += 1;

    // Use flowed tMove to determine this ring's radius
    let rr = lerp(H * 0.2, H * 1.6, tMove);

    // Number of dots still uses original t0, preserving fewer dots on outer rings and more on inner
    let dots = int(lerp(22, 56, t0));

    for (let k = 0; k < dots; k++) {
        // ★ Keep angle a as originally written; do not add time offset:
        let a = lerp(
        aStart - 0.04,
        aEnd + 0.04,
        k / dots
        );

        // This part still draws along the resin-track shape
        let x =
        cx + (rr * cos(a)) * (W / H) * 0.46;
        let y =
        cy +
        rr * sin(a) * 0.95 +
        2.2 * sin(k * 0.7 + r * 0.95) +
        yBend(a);

        // Size does a subtle breathing effect (keep the two scale lines to keep it, remove them otherwise)
        let baseD =
        lerp(16, 7.5, t0) *
        (0.92 + 0.14 * noise(r * 0.3, k * 0.6));

        let scale = 1 + 0.18 * sin(time + r * 0.4 + k * 0.3);
        let d = baseD * scale;

        circle(x, y, d);
    }
    }
  noStroke();
  fill("#7C3A6B");
  const fringeStep = 8;
  for (let i = 0; i < lower.length; i += fringeStep) {
    const p = lower[i];
    circle(p.x, p.y - 3, 1);
  }

  {
    let rr = H * 0.16,
      dots = 14;
    for (let k = 0; k < dots; k++) {
      let a = lerp(
        aStart + 0.02,
        aEnd - 0.02,
        k / dots
      );
      let x =
        cx + (rr * cos(a)) * (W / H) * 0.46;
      let y =
        cy + rr * sin(a) * 0.46 + yBend(a);
      circle(x, y, 10);
    }
  }
  ctx.restore();

  noStroke();
  fill("#D81E25");
  beginShape();
  for (let a = aStart - 0.02; a <= aEnd + 0.02; a += step) {
    vertex(
      cx + (topW * 0.5) * cos(a),
      cy -
        6 +
        (topH * 0.5) * sin(a) +
        yBend(a) +
        rimWave(a)
    );
  }
  for (let a = aEnd; a >= aStart; a -= step) {
    vertex(
      cx + (innerW * 0.5) * cos(a),
      cy - 6 + (innerH * 0.5) * sin(a) + yBend(a)
    );
  }
  endShape(CLOSE);

  ctx.save();
  ctx.beginPath();
  for (let a = aStart; a <= aEnd; a += step) {
    ctx.lineTo(
      cx + (topW * 0.5) * cos(a),
      cy -
        6 +
        (topH * 0.5) * sin(a) +
        yBend(a) +
        rimWave(a)
    );
  }
  for (let a = aEnd; a >= aStart; a -= step) {
    ctx.lineTo(
      cx + (innerW * 0.5) * cos(a),
      cy - 6 + (innerH * 0.5) * sin(a) + yBend(a)
    );
  }
  ctx.closePath();
  ctx.clip();

  fill(255);
  const beans = 22;
  for (let i = 0; i < beans; i++) {
    const a = lerp(
      aStart + 0.03,
      aEnd - 0.03,
      i / (beans - 1)
    );
    const rx =
      ((topW + innerW) / 4) * cos(a);
    const ry =
      ((topH + innerH) / 4) * sin(a);
    const midWave = rimWave(a) * 0.5;
    push();
    translate(
      cx + rx,
      cy - 6 + ry + yBend(a) + midWave
    );
    rotate(random(-0.35, 0.35));
    
    ellipse(
      0,
      0,
      random(26, 44) + sin(frameCount * 0.5 + i) * (2 + random(-1, 1)), //Use 2 + random(-1, 1) to vary the amplitude slightly
      random(16, 26) + sin(frameCount * 0.5 + i) * (2 + random(-1, 1))
    );
    pop();
  }
  ctx.restore();
}

/* ====================== Stem ====================== */
function drawStemUniform(time = 0) {
  const H = 680,
    topW = 120,
    botW = 230,
    bulge = 0.12;
  const bottomExtra = 40;

  noStroke();
  fill("#FFF7F4");
  beginShape();
  vertex(-botW * 0.52, 0);
  bezierVertex(
    -botW * 0.72,
    -H * 0.36,
    -topW * 0.7,
    -H * 0.73,
    -topW * 0.6,
    -H
  );
  bezierVertex(
    -topW * 0.3,
    -H - 18,
    topW * 0.3,
    -H - 18,
    topW * 0.6,
    -H
  );
  bezierVertex(
    topW * 0.7,
    -H * 0.73,
    botW * 0.72,
    -H * 0.36,
    botW * 0.52,
    0
  );
  bezierVertex(
    botW * 0.45,
    bottomExtra,
    -botW * 0.45,
    bottomExtra,
    -botW * 0.52,
    0
  );
  endShape(CLOSE);

  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-botW * 0.52, 0);
  ctx.bezierCurveTo(
    -botW * 0.72,
    -H * 0.36,
    -topW * 0.7,
    -H * 0.73,
    -topW * 0.6,
    -H
  );
  ctx.bezierCurveTo(
    -topW * 0.3,
    -H - 18,
    topW * 0.3,
    -H - 18,
    topW * 0.6,
    -H
  );
  ctx.bezierCurveTo(
    topW * 0.7,
    -H * 0.73,
    botW * 0.72,
    -H * 0.36,
    botW * 0.52,
    0
  );
  ctx.bezierCurveTo(
    botW * 0.45,
    bottomExtra,
    -botW * 0.45,
    bottomExtra,
    -botW * 0.52,
    0
  );
  ctx.closePath();
  ctx.clip();

  function halfWidthAt(t) {
    const w = lerp(topW * 0.5, botW * 0.5, t);
    return w + sin(t * PI) * botW * bulge;
  }

  const flowSpeed = 0.12; // flow down speed
  const baseDot = 5.5,
    centerBoost = 7;
  const rows = 56,
    sideCols = 8,
    stepX = 22,
    edgeBand = 18;
  let colXs = [0];
  for (let i = 1; i <= sideCols; i++) colXs.push(i * stepX, -i * stepX);

  noStroke();
  fill("#C4162B");
  for (let c = 0; c < colXs.length; c++) {
    const x0 = colXs[c],
      isCenter = x0 === 0;
    for (let j = 0; j < rows; j++) {
        // Original vertical position (0~1, top to bottom)
        let v0 = j / (rows - 1);

        // Add time offset to create looping downward flow
        let v = (v0 + time * flowSpeed) % 1;

        // Map v back to actual y (from -H to bottomExtra-2)
        const y = lerp(-H, bottomExtra - 2, v);

        // tW can use v directly as 'height proportion along the stem'
        const tW = v;
        const half = halfWidthAt(tW);

        const follow =
            4 * sin(tW * PI) * map(x0, -200, 200, -1, 1);

        const x = constrain(
            x0 + follow,
            -half + edgeBand,
            half - edgeBand
        );

        const d =
            baseDot +
            lerp(2, 7, tW) +
            (isCenter ? centerBoost : 0);

        circle(x, y, d);
        }
  }

  const edgeRows = rows + 10;
  for (let side of [-1, 1]) {
    for (let j = 0; j < edgeRows; j++) {
        let v0 = j / (edgeRows - 1);
        let v = (v0 + time * flowSpeed) % 1;
        if (v < 0) v += 1;

        const y = lerp(-H, bottomExtra - 2, v);
        const tW = v;
        const half = halfWidthAt(tW);

        for (let k = 0; k < 3; k++) {
        const x =
            side * (half - random(2, edgeBand - 2));
        const d =
            random(2.2, 4.2) + 2.5 * tW;
        circle(
            x + random(-0.6, 0.6),
            y + random(-1, 1),
            d
        );
        }
    }
    }

  ctx.restore();
}

// ================== Setup / Draw ==================

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  colorMode(HSB, 360, 100, 100, 100);
  //noLoop();

  buildBackground();

  // Build small mushrooms from layout specs
  mushrooms = [];
  for (const layout of SCENE_LAYOUT) {
    const m = makeMushroomFromLayout(layout);
    if (m) mushrooms.push(m);
  }
}

function mousePressed() {
  // ==== Screen coords -> design coords ====
  const sx = width  / DESIGN_W;
  const sy = height / DESIGN_H;
  const s  = min(sx, sy);
  const offsetX = (width  - DESIGN_W * s) / 2;
  const offsetY = (height - DESIGN_H * s) / 2;
  const mx = (mouseX - offsetX) / s;
  const my = (mouseY - offsetY) / s;

  // ==== Check each mushroom in loop ====
  for (let m of mushrooms) {
    // 1) Convert to mushroom local coordinates (inverse transform)
    let lx = mx - m.anchor.x;
    let ly = my - m.anchor.y;

    // Undo rotation (note: m.rot is the mushroom drawing rotation)
    if (m.rot) {
      let cosA = cos(-m.rot);
      let sinA = sin(-m.rot);
      let rx = lx * cosA - ly * sinA;
      let ry = lx * sinA + ly * cosA;
      lx = rx; 
      ly = ry;
    }

    // Undo scaling
    lx /= m.scale;
    ly /= m.scale;

    let boxes = [];
    if (m.cap && m.cap.bounds)      boxes.push(m.cap.bounds);
    if (m.stem && m.stem.bounds)    boxes.push(m.stem.bounds);
    if (m.basePart && m.basePart.bounds) boxes.push(m.basePart.bounds);

    let hit = false;
    for (let bb of boxes) {
        if (lx >= bb.x && lx <= bb.x + bb.w &&
            ly >= bb.y && ly <= bb.y + bb.h) {
            hit = true;
            break;
        }
    }
    if (hit) {
    m.isPulsing = !m.isPulsing;
    break;
    }
  }
      // ======== Hit test large mushroom (simple): design coords + two rectangles ========
    {
        const cx = DESIGN_W * 0.35;  // Big mushroom anchor (same as in draw)
        const cy = DESIGN_H * 0.75;

        // ① Cap rectangle (slightly smaller than real cap, don't exaggerate)
        const capLeft   = cx - 420;
        const capRight  = cx + 420;
        const capTop    = cy - 880;
        const capBottom = cy - 520;

        // ② Stem rectangle (narrower, from under the cap to stem bottom)
        const stemLeft   = cx - 140;
        const stemRight  = cx + 140;
        const stemTop    = cy - 700;
        const stemBottom = cy + 40;

        const inCap =
        mx >= capLeft && mx <= capRight &&
        my >= capTop  && my <= capBottom;

        const inStem =
        mx >= stemLeft && mx <= stemRight &&
        my >= stemTop  && my <= stemBottom;

        if (inCap || inStem) {
        bigMushroom.isPulsing = !bigMushroom.isPulsing;
        }
    }

  }
  
  function draw() {
    // ========= Background =========
    image(bg, 0, 0, width, height);  // Full-screen background

    // ======= Compute scaling & centering =======
    const sx = width  / DESIGN_W;
    const sy = height / DESIGN_H;
    const s  = min(sx, sy);  // Uniform scale 

    // Centering offsets
    const offsetX = (width  - DESIGN_W * s) / 2;
    const offsetY = (height - DESIGN_H * s) / 2;

    // === Draw scene === 
    push();
    translate(offsetX, offsetY);
    scale(s);

    // Large mushroom with animation
    push();
    // If pulsing, update pulseScale, if not, keep it unchanged
    if (bigMushroom.isPulsing) {
        bigMushroom.phase += bigMushroom.pulseSpeed;
        let s = map(sin(bigMushroom.phase), -1, 1,
                    bigMushroom.minScale, bigMushroom.maxScale);
        bigMushroom.pulseScale = s;
    }

    // Update texture flow time
    bigMushroom.flowTime += 0.015;

    // Render mushrooms
    translate(DESIGN_W * 0.35, DESIGN_H * 0.75);
    rotate(radians(-7));
    scale(0.7 * bigMushroom.pulseScale);
    drawStemUniform(bigMushroom.flowTime);
    drawCapReplica(0, -650, 880, 360, bigMushroom.flowTime);
    pop();

    // Small mushrooms
    for (const m of mushrooms) {
        m.draw();
    }
    pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildBackground(); // Rebuild full-screen background
  redraw();
}

