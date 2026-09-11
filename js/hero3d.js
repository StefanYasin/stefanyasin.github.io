/**
 * hero3d.js - 3D network topology for the hero section.
 *
 * Purpose: an operations portfolio should look like a live system, not a template.
 * Nodes represent systems, edges represent connections: the visual metaphor for
 * "things that stay up and talk to each other".
 *
 * Guardrails:
 *  - No WebGL, or any failure -> does nothing, the page's 2D sparkles keep running
 *  - prefers-reduced-motion -> renders one static frame, no animation loop
 *  - Mobile -> fewer nodes, no antialias, capped pixel ratio
 *  - Pauses when the hero scrolls out of view or the tab is hidden
 *  - Self-hosted three.js (no CDN dependency)
 */
import * as THREE from './vendor/three.module.min.js';

const BLUE = '#0a84ff';
const GREEN = '#30d158';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function init() {
  const canvas = document.getElementById('hero3d');
  if (!canvas || !hasWebGL()) return false;

  const hero = canvas.parentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  const NODE_COUNT = isMobile ? 70 : 150;
  const EDGES_PER_NODE = isMobile ? 2 : 3;
  const EDGE_RADIUS = isMobile ? 1.45 : 1.25;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'low-power'
    });
  } catch (e) {
    return false;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4);

  const group = new THREE.Group();
  scene.add(group);

  // ---- nodes: flattened spherical cloud (lattice feel, room for the headline) ----
  const points = [];
  const positions = new Float32Array(NODE_COUNT * 3);
  const colors = new Float32Array(NODE_COUNT * 3);
  const blue = new THREE.Color(BLUE);
  const green = new THREE.Color(GREEN);

  for (let i = 0; i < NODE_COUNT; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(2.2 + Math.random() * 1.5);
    v.z *= 0.55;
    v.y *= 0.82;
    points.push(v);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    const c = Math.random() < 0.2 ? green : blue;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  // ---- procedural glow sprite (no external assets) ----
  function glowTexture() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const nodeMat = new THREE.PointsMaterial({
    size: isMobile ? 0.1 : 0.115,
    map: glowTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  group.add(new THREE.Points(nodeGeo, nodeMat));

  // ---- edges: connect each node to its nearest neighbours (deduped) ----
  const edgeVerts = [];
  const seen = new Set();
  for (let i = 0; i < NODE_COUNT; i++) {
    const near = [];
    for (let j = 0; j < NODE_COUNT; j++) {
      if (i === j) continue;
      const d = points[i].distanceTo(points[j]);
      if (d < EDGE_RADIUS) near.push({ j: j, d: d });
    }
    near.sort((a, b) => a.d - b.d);
    for (let k = 0; k < Math.min(EDGES_PER_NODE, near.length); k++) {
      const j = near[k].j;
      const key = i < j ? i + '-' + j : j + '-' + i;
      if (seen.has(key)) continue;
      seen.add(key);
      edgeVerts.push(
        points[i].x, points[i].y, points[i].z,
        points[j].x, points[j].y, points[j].z
      );
    }
  }

  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgeVerts, 3));
  const edgeMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(BLUE),
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // ---- sizing ----
  function resize() {
    const w = hero.offsetWidth || window.innerWidth;
    const h = hero.offsetHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fovScale = h < 700 ? 1.18 : 1; // pull back on short viewports
    camera.position.z = 7.4 * fovScale;
    camera.updateProjectionMatrix();
  }
  resize();

  let resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // ---- interaction: gentle parallax (pointer devices only) ----
  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (fine && !reduce) {
    window.addEventListener('mousemove', function (e) {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // ---- visibility gating ----
  let inView = true;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { threshold: 0.02 });
    io.observe(hero);
  }
  let tabVisible = !document.hidden;
  document.addEventListener('visibilitychange', function () {
    tabVisible = !document.hidden;
  });

  // ---- render loop ----
  const clock = new THREE.Clock();
  let frame = 0;
  let running = true;

  function draw(t) {
    group.rotation.y = t * 0.000055;
    group.rotation.x = Math.sin(t * 0.00004) * 0.09;
    edgeMat.opacity = 0.12 + 0.07 * (0.5 + 0.5 * Math.sin(t * 0.0009));

    pointer.x += (target.x - pointer.x) * 0.035;
    pointer.y += (target.y - pointer.y) * 0.035;
    camera.position.x = pointer.x * 0.55;
    camera.position.y = -pointer.y * 0.4;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    frame = requestAnimationFrame(loop);
    const t = performance.now();
    if (!inView || !tabVisible) return; // keep the rAF alive, skip the GPU work
    draw(t);
  }

  // first paint, then reveal (loading state lives in CSS: opacity 0 -> 1)
  draw(0);
  canvas.classList.add('ready');

  if (reduce) {
    // static frame only; still respond to resize by redrawing once
    window.addEventListener('resize', function () { setTimeout(function () { draw(0); }, 200); });
    return true;
  }

  loop();

  // stop the 2D sparkles layer, if the page is running one
  if (typeof window.__stopSparkles === 'function') {
    window.__stopSparkles();
  }

  window.__hero3dStop = function () {
    running = false;
    if (frame) cancelAnimationFrame(frame);
  };

  return true;
}

try {
  const ok = init();
  if (ok) window.__hero3dActive = true;
} catch (e) {
  // never break the page: the sparkles fallback keeps the hero alive
  if (window.console && console.warn) console.warn('hero3d disabled:', e);
}
