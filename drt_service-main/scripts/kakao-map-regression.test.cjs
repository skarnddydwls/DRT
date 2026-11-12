const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

// Simulate SDK wrapper creation, delayed image dimensions, and leave/enter
// events produced by repositioning. No API key or network is required.
async function setup() {
  class Element {
    constructor() { this.style = {}; this.handlers = {}; this.children = []; }
    appendChild(child) { this.children.push(child); child.parentElement = this; }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    removeEventListener() {}
    replaceChildren() { this.children = []; }
    remove() {}
    getBoundingClientRect() { return { left: 10, top: 10, right: 50, bottom: 60, width: 40, height: 50 }; }
  }
  const overlays = [];
  const observers = [];
  const timers = new Map();
  let timerId = 0;
  const sdk = {
    Map: class {
      constructor() { this.events = {}; }
      addControl() {} relayout() {} setCenter() {}
      getCenter() { return new sdk.LatLng(34, 127); }
    },
    LatLng: class {
      constructor(y, x) { this.y = y; this.x = x; }
      getLng() { return this.x; } getLat() { return this.y; }
    },
    CustomOverlay: class {
      constructor(options) {
        this.options = options;
        this.map = options.map;
        this.positions = [];
        new Element().appendChild(options.content);
        overlays.push(this);
      }
      setPosition(p) {
        this.positions.push({ x: p.x, y: p.y, width: this.options.content.style.width });
      }
      getMap() { return this.map; } setMap(map) { this.map = map; }
    },
    ZoomControl: class {}, MapTypeControl: class {}, MapTypeId: { ROADMAP: 1 },
    ControlPosition: { LEFT: 1, BOTTOMLEFT: 2 },
    event: { addListener(map, name, fn) { map.events[name] = fn; }, removeListener() {} },
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/maps/kakaoMap.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports: module.exports, module,
    require: () => ({ loadKakaoMaps: async () => sdk }),
    document: { createElement: () => new Element() },
    ResizeObserver: class {
      constructor(fn) { this.callback = fn; observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; }
    },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); }, console,
  });
  const k = module.exports;
  const source = new k.VectorSource();
  const marker = new k.Feature({ geometry: new k.Point([127, 34]) });
  const icon = new k.Icon({ src: 'marker.png', scale: 0.1 });
  marker.setStyle(new k.Style({ image: icon }));
  source.addFeature(marker);
  const tooltipElement = new Element();
  const tooltip = new k.Overlay({ element: tooltipElement });
  const map = new k.Map({ target: new Element(), layers: [new k.VectorLayer({ source })],
    overlays: [tooltip], view: new k.View({ center: [127, 34], zoom: 15 }) });
  const events = [];
  map.on('pointermove', event => events.push(event.pixel));
  await new Promise(resolve => setImmediate(resolve));
  return { map, marker, icon, source, tooltip, tooltipElement, overlays, events, observers,
    markerElement: overlays[0].options.content,
    flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } };
}

test('late image load recomputes the anchor; heading alone does not reposition', async () => {
  const s = await setup();
  const image = s.markerElement.children[0];
  const before = s.overlays[0].positions.length;
  image.naturalWidth = 400; image.naturalHeight = 500; image.onload();
  assert.equal(s.overlays[0].positions.length, before + 1);
  assert.equal(s.overlays[0].positions.at(-1).width, '40px');
  s.icon.setRotation(1);
  assert.equal(s.overlays[0].positions.length, before + 1);
  s.map.setTarget(undefined);
});

test('SDK tooltip wrapper cannot intercept hover and content resizing updates anchor', async () => {
  const s = await setup();
  s.tooltip.setPosition([127, 34]);
  assert.equal(s.tooltipElement.parentElement.parentElement.style.pointerEvents, 'none');
  const before = s.overlays[1].positions.length;
  s.observers[1].callback();
  assert.equal(s.overlays[1].positions.length, before + 1);
  s.map.setTarget(undefined);
  assert.equal(s.observers[1].disconnected, true);
});

test('pointer bounds keep hover across SDK repositioning; real exit and removal clear it', async () => {
  const s = await setup();
  const surface = s.map.getViewport().children[0];
  surface.handlers.pointermove({ clientX: 25, clientY: 25 });
  s.marker.getGeometry().setCoordinates([127.01, 34]);
  surface.handlers.pointermove({ clientX: 26, clientY: 25 });
  assert.ok(s.events.every(event => event === s.marker));
  surface.handlers.pointermove({ clientX: 200, clientY: 200 });
  assert.equal(s.events.at(-1), null);
  surface.handlers.pointermove({ clientX: 25, clientY: 25 }); s.source.removeFeature(s.marker);
  assert.equal(s.events.at(-1), null);
  s.map.setTarget(undefined);
});
