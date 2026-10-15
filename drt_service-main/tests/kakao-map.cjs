// Native SDK boundary regression tests; no real API requests or database writes.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

class Element {
  style = {};
  children = [];
  listeners = {};
  complete = true;
  naturalWidth = 100;
  naturalHeight = 100;
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
  }
  replaceChildren() {
    this.children = [];
  }
  addEventListener(name, fn) {
    this.listeners[name] = fn;
  }
  removeEventListener(name) {
    delete this.listeners[name];
  }
  remove() {
    if (this.parentNode)
      this.parentNode.children = this.parentNode.children.filter(
        (child) => child !== this,
      );
  }
  setAttribute() {}
}
class Shape {
  constructor(options = {}) {
    this.options = options;
    this.map = options.map;
    this.position = options.position;
    this.mapChanges = 0;
  }
  setMap(map) {
    this.map = map;
    this.mapChanges++;
  }
  getMap() {
    return this.map;
  }
  setPosition(position) {
    this.position = position;
  }
  setPath(path) {
    this.options.path = path;
  }
  setOptions(options) {
    Object.assign(this.options, options);
  }
}
const sdk = {
  LatLng: class {
    constructor(lat, lng) {
      this.lat = lat;
      this.lng = lng;
    }
  },
  Map: class {
    constructor(surface, options) {
      this.surface = surface;
      this.options = options;
      this.center = options.center;
    }
    addControl() {}
    getCenter() {
      return this.center;
    }
    relayout() {}
    setCenter(center) {
      this.center = center;
    }
    panTo(center) {
      this.center = center;
    }
    setLevel(level) {
      this.level = level;
    }
  },
  ZoomControl: class {},
  MapTypeControl: class {},
  MapTypeId: { ROADMAP: 1 },
  ControlPosition: { LEFT: 1, BOTTOMLEFT: 2 },
  CustomOverlay: Shape,
  Polyline: Shape,
  event: { addListener() {}, removeListener() {} },
};
function loadModule() {
  global.document = { createElement: () => new Element() };
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  const source = fs.readFileSync(
    path.join(__dirname, "../src/lib/maps/kakaoMap.ts"),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const output = {};
  new Function("exports", "require", js)(output, () => ({
    loadKakaoMaps: () => Promise.resolve(sdk),
  }));
  return output;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("queued markers render after SDK readiness; position and rotation update without replacing images", async () => {
  const k = loadModule();
  const source = new k.VectorSource();
  const point = new k.Point([127.7, 34.5]);
  const feature = new k.Feature({ geometry: point });
  feature.setStyle(
    new k.Style({
      image: new k.Icon({ src: "/bus.png", scale: 0.3, anchor: [0.5, 0.5] }),
    }),
  );
  source.addFeature(feature);
  const map = new k.Map({
    target: new Element(),
    layers: [new k.VectorLayer({ source })],
    view: new k.View({ center: [127.7, 34.5], zoom: 17 }),
  });
  await tick();
  const item = map.rendered.get(feature);
  const image = item.image;
  const changes = item.native.mapChanges;
  assert.equal(item.native.position.lat, 34.5);
  assert.equal(item.native.position.lng, 127.7);
  point.setCoordinates([127.8, 34.6]);
  feature.setStyle(
    new k.Style({ image: new k.Icon({ src: "/bus.png", rotation: Math.PI }) }),
  );
  assert.equal(item.image, image);
  assert.equal(item.native.mapChanges, changes);
  assert.equal(item.native.position.lng, 127.8);
  assert.equal(image.style.transform, `rotate(${Math.PI}rad)`);
  map.getView().animate({ center: [127.9, 34.7], zoom: 18 });
  assert.equal(map.native.center.lng, 127.9);
  assert.equal(map.native.level, 1);
  source.clear();
  assert.equal(map.rendered.size, 0);
  assert.equal(item.native.getMap(), null);
  map.setTarget(undefined);
});

test("route colours and tooltips use native Kakao overlays; cleanup removes route and tooltip", async () => {
  const k = loadModule();
  const source = new k.VectorSource();
  const feature = new k.Feature({
    geometry: new k.LineString([
      [127.7, 34.5],
      [127.8, 34.6],
    ]),
  });
  feature.setStyle(
    new k.Style({ stroke: new k.Stroke({ color: "#ffd400", width: 6 }) }),
  );
  source.addFeature(feature);
  const tooltip = new k.Overlay({ element: new Element(), offset: [0, -75] });
  tooltip.setPosition([127.7, 34.5]);
  const map = new k.Map({
    target: new Element(),
    layers: [new k.VectorLayer({ source })],
    overlays: [tooltip],
    view: new k.View({ center: [127.7, 34.5], zoom: 15.5 }),
  });
  await tick();
  const line = map.rendered.get(feature).native;
  assert.equal(line.options.strokeColor, "#ffd400");
  assert.equal(line.options.strokeWeight, 6);
  assert.equal(tooltip.native.options.zIndex, 1000);
  map.setTarget(undefined);
  assert.equal(line.getMap(), null);
  assert.equal(map.native, null);
});

test("invalid coordinates are rejected and disposed maps do not initialize after SDK readiness", async () => {
  const k = loadModule();
  assert.equal(k.validCoordinate([NaN, 34]), false);
  assert.equal(k.validCoordinate([127, 900]), false);
  assert.deepEqual(k.fromLonLat([127, 34]), [127, 34]);
  assert.equal(k.kakaoLevel(17), 2);
  const container = new Element();
  const map = new k.Map({
    target: container,
    view: new k.View({ center: [127, 34], zoom: 17 }),
  });
  map.setTarget(undefined);
  await tick();
  assert.equal(map.native, null);
  assert.equal(container.children.length, 0);
});
