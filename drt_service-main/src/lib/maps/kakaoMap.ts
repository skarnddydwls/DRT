/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadKakaoMaps } from "./kakaoLoader";

/** Migration facade for existing page data/events. All rendering is native Kakao Maps;
 * coordinates stay [longitude, latitude], never Web Mercator pixels/metres. */
export const fromLonLat = (coordinate: number[]) => coordinate.map(Number);
export const kakaoLevel = (zoom: number) =>
  Math.max(1, Math.min(14, Math.round(19 - zoom)));
export const validCoordinate = (p: number[]) =>
  p.length >= 2 &&
  Number.isFinite(p[0]) &&
  Number.isFinite(p[1]) &&
  Math.abs(p[0]) <= 180 &&
  Math.abs(p[1]) <= 90;
const latLng = (sdk: any, p: number[]) => new sdk.LatLng(p[1], p[0]);

class Observable {
  private listeners = new Set<() => void>();
  listen(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  changed() {
    this.listeners.forEach((fn) => fn());
  }
}
export class Point extends Observable {
  constructor(private coordinates: number[]) {
    super();
  }
  getCoordinates() {
    return this.coordinates;
  }
  setCoordinates(value: number[]) {
    this.coordinates = value;
    this.changed();
  }
}
export class LineString extends Observable {
  constructor(private coordinates: number[][]) {
    super();
  }
  getCoordinates() {
    return this.coordinates;
  }
}
export class Stroke {
  constructor(public options: { color: string; width: number }) {}
}
export class Fill {
  constructor(public options: { color: string }) {}
}
export class CircleStyle {
  constructor(public options: { radius: number; fill: Fill; stroke: Stroke }) {}
}
export class Icon extends Observable {
  constructor(
    public options: {
      src: string;
      scale?: number;
      anchor?: number[];
      rotation?: number;
    },
  ) {
    super();
  }
  setRotation(rotation: number) {
    this.options.rotation = rotation;
    this.changed();
  }
}
export class Style {
  constructor(
    public options: { image?: Icon | CircleStyle; stroke?: Stroke },
  ) {}
}
export class Feature extends Observable {
  private props: Record<string, any>;
  private geometry?: Point | LineString;
  private style?: Style;
  private detachGeometry?: () => void;
  private detachStyle?: () => void;
  constructor(props: Record<string, any> = {}) {
    super();
    this.props = { ...props };
    if (props.geometry) this.setGeometry(props.geometry);
  }
  get(key: string): any {
    return this.props[key];
  }
  set(key: string, value: any, silent = false) {
    this.props[key] = value;
    if (!silent) this.changed();
  }
  unset(key: string, silent = false) {
    delete this.props[key];
    if (!silent) this.changed();
  }
  setProperties(props: Record<string, any>) {
    Object.assign(this.props, props);
    this.changed();
  }
  getProperties() {
    return this.props;
  }
  getGeometry() {
    return this.geometry;
  }
  setGeometry(geometry: Point | LineString) {
    this.detachGeometry?.();
    this.geometry = geometry;
    this.detachGeometry = geometry.listen(() => this.changed());
    this.changed();
  }
  getStyle() {
    return this.style;
  }
  setStyle(style: Style) {
    this.detachStyle?.();
    this.style = style;
    const image = style.options.image;
    if (image instanceof Icon)
      this.detachStyle = image.listen(() => this.changed());
    this.changed();
  }
}
export class VectorSource {
  private features = new Set<Feature>();
  private watchers = new Set<(feature: Feature, added: boolean) => void>();
  getFeatures() {
    return [...this.features];
  }
  addFeature(feature: Feature) {
    if (this.features.has(feature)) return;
    this.features.add(feature);
    this.watchers.forEach((fn) => fn(feature, true));
  }
  addFeatures(features: Feature[]) {
    features.forEach((feature) => this.addFeature(feature));
  }
  removeFeature(feature: Feature) {
    if (!this.features.delete(feature)) return;
    this.watchers.forEach((fn) => fn(feature, false));
  }
  clear() {
    this.getFeatures().forEach((feature) => this.removeFeature(feature));
  }
  listen(fn: (feature: Feature, added: boolean) => void) {
    this.watchers.add(fn);
    return () => {
      this.watchers.delete(fn);
    };
  }
}
export class VectorLayer {
  constructor(public options: { source: VectorSource }) {}
}
export class FullScreen {}
class Controls {
  fullScreen = false;
  extend(controls: unknown[]) {
    this.fullScreen = controls.some((control) => control instanceof FullScreen);
    return this;
  }
}
export const defaults = (options?: unknown) => {
  void options;
  return new Controls();
};
export class View {
  owner?: Map;
  constructor(
    public options: { center: number[]; zoom: number; maxZoom?: number },
  ) {}
  animate(options: { center?: number[]; zoom?: number; duration?: number }) {
    if (options.center) this.options.center = options.center;
    if (options.zoom !== undefined) this.options.zoom = options.zoom;
    this.owner?.move(options.center, options.zoom);
  }
}
export class Overlay {
  private native: any;
  private position?: number[];
  private owner?: Map;
  constructor(
    private options: {
      element: HTMLElement;
      positioning?: string;
      offset?: number[];
    },
  ) {}
  getElement() {
    return this.options.element;
  }
  attach(owner: Map) {
    this.owner = owner;
    this.render();
  }
  setPosition(position: number[] | undefined) {
    this.position = position;
    this.render();
  }
  private render() {
    const map = this.owner;
    if (!map?.sdk || !map.native) return;
    if (!this.position || !validCoordinate(this.position)) {
      this.native?.setMap(null);
      return;
    }
    if (!this.native) {
      const content = document.createElement("div");
      const offset = this.options.offset ?? [0, 0];
      content.style.transform = `translate(${offset[0]}px, ${offset[1]}px)`;
      content.appendChild(this.options.element);
      this.native = new map.sdk.CustomOverlay({
        content,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 1000,
      });
    }
    this.native.setPosition(latLng(map.sdk, this.position));
    if (this.native.getMap() !== map.native) this.native.setMap(map.native);
  }
  detach() {
    this.native?.setMap(null);
    this.owner = undefined;
    this.native = undefined;
  }
}
type PointerEvent = { pixel: Feature | null; coordinate: number[] };
type Rendered = {
  native: any;
  element?: HTMLElement;
  image?: HTMLImageElement;
  style?: Style;
  detach: () => void;
};

export class Map {
  sdk: any;
  native: any;
  private disposed = false;
  private container: HTMLElement;
  private surface: HTMLElement;
  private observer: ResizeObserver;
  private layers: VectorLayer[] = [];
  private sourceDetachers: (() => void)[] = [];
  private rendered = new globalThis.Map<Feature, Rendered>();
  private handlers = new Set<(event: PointerEvent) => void>();
  private hovered: Feature | null = null;
  private nativeEvents: { name: string; fn: (...args: any[]) => void }[] = [];
  private extras: HTMLElement[] = [];
  private options: {
    target: string | HTMLElement;
    view: View;
    layers?: VectorLayer[];
    overlays?: Overlay[];
    controls?: Controls;
  };
  constructor(options: {
    target: string | HTMLElement;
    view: View;
    layers?: VectorLayer[];
    overlays?: Overlay[];
    controls?: Controls;
  }) {
    this.options = options;
    this.container =
      typeof options.target === "string"
        ? document.getElementById(options.target)!
        : options.target;
    this.surface = document.createElement("div");
    this.surface.style.cssText = "position:absolute;inset:0;";
    if (!this.container.style.position)
      this.container.style.position = "relative";
    this.container.appendChild(this.surface);
    options.view.owner = this;
    options.layers?.forEach((layer) => this.addLayer(layer));
    this.observer = new ResizeObserver(() => this.updateSize());
    this.observer.observe(this.container);
    void loadKakaoMaps()
      .then((sdk) => {
        if (this.disposed) return;
        this.sdk = sdk;
        this.native = new sdk.Map(this.surface, {
          center: latLng(sdk, options.view.options.center),
          level: kakaoLevel(options.view.options.zoom),
          mapTypeId: sdk.MapTypeId.ROADMAP,
        });
        this.native.addControl(new sdk.ZoomControl(), sdk.ControlPosition.LEFT);
        this.native.addControl(
          new sdk.MapTypeControl(),
          sdk.ControlPosition.BOTTOMLEFT,
        );
        this.layers.forEach((layer, index) =>
          layer.options.source
            .getFeatures()
            .forEach((feature) => this.render(feature, index)),
        );
        options.overlays?.forEach((overlay) => overlay.attach(this));
        this.nativeOn("mousemove", (event: any) =>
          this.emit(null, [event.latLng.getLng(), event.latLng.getLat()]),
        );
        this.surface.addEventListener("mouseleave", this.leave);
        if (options.controls?.fullScreen) this.addFullScreen();
        this.updateSize();
      })
      .catch((error) => {
        if (this.disposed) return;
        const message = document.createElement("div");
        message.setAttribute("role", "alert");
        message.style.cssText =
          "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:32px;background:#fff7ed;color:#9a3412;text-align:center;z-index:5;";
        message.textContent =
          error instanceof Error
            ? error.message
            : "카카오맵을 불러오지 못했습니다.";
        this.surface.appendChild(message);
      });
  }
  private leave = () => this.emit(null, this.options.view.options.center);
  private nativeOn(name: string, fn: (...args: any[]) => void) {
    this.sdk.event.addListener(this.native, name, fn);
    this.nativeEvents.push({ name, fn });
  }
  private addFullScreen() {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "전체화면";
    button.style.cssText =
      "position:absolute;left:8px;top:8px;z-index:10;background:white;border:1px solid #ccc;border-radius:4px;padding:6px;font-size:12px;";
    button.onclick = () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void this.container.requestFullscreen().catch(() => undefined);
    };
    this.container.appendChild(button);
    this.extras.push(button);
  }
  private emit(feature: Feature | null, coordinate: number[]) {
    this.hovered = feature;
    this.handlers.forEach((fn) => fn({ pixel: feature, coordinate }));
  }
  on(_name: "pointermove", handler: (event: PointerEvent) => void) {
    this.handlers.add(handler);
  }
  forEachFeatureAtPixel<T>(
    feature: Feature | null,
    fn: (feature: Feature) => T,
  ): T | undefined {
    return feature ? fn(feature) : undefined;
  }
  getViewport() {
    return this.container;
  }
  getView() {
    return this.options.view;
  }
  move(center?: number[], zoom?: number) {
    if (!this.native) return;
    if (zoom !== undefined) this.native.setLevel(kakaoLevel(zoom));
    if (center && validCoordinate(center))
      this.native.panTo(latLng(this.sdk, center));
  }
  updateSize() {
    if (!this.native) return;
    const center = this.native.getCenter();
    this.native.relayout();
    this.native.setCenter(center);
  }
  addLayer(layer: VectorLayer) {
    const index = this.layers.length;
    this.layers.push(layer);
    this.sourceDetachers.push(
      layer.options.source.listen((feature, added) => {
        if (added) this.render(feature, index);
        else this.remove(feature);
      }),
    );
    if (this.native)
      layer.options.source
        .getFeatures()
        .forEach((feature) => this.render(feature, index));
  }
  private remove(feature: Feature) {
    const item = this.rendered.get(feature);
    item?.native?.setMap(null);
    item?.detach();
    this.rendered.delete(feature);
    if (this.hovered === feature)
      this.emit(null, this.options.view.options.center);
  }
  private render(feature: Feature, layer: number) {
    if (!this.native || this.disposed) return;
    if (!this.rendered.has(feature))
      this.rendered.set(feature, {
        native: null,
        detach: feature.listen(() => this.draw(feature, layer)),
      });
    this.draw(feature, layer);
  }
  private draw(feature: Feature, layer: number) {
    const item = this.rendered.get(feature)!;
    const geometry = feature.getGeometry();
    const style = feature.getStyle();
    if (!geometry || !style) return;
    if (geometry instanceof LineString) {
      const points = geometry.getCoordinates().filter(validCoordinate);
      if (points.length < 2) {
        item.native?.setMap(null);
        return;
      }
      const path = points.map((p) => latLng(this.sdk, p));
      if (!item.native)
        item.native = new this.sdk.Polyline({
          map: this.native,
          path,
          zIndex: layer,
          strokeColor: style.options.stroke?.options.color,
          strokeWeight: style.options.stroke?.options.width,
          strokeOpacity: 1,
        });
      else {
        item.native.setPath(path);
        item.native.setOptions({
          strokeColor: style.options.stroke?.options.color,
          strokeWeight: style.options.stroke?.options.width,
        });
      }
      return;
    }
    const coordinate = geometry.getCoordinates();
    if (!validCoordinate(coordinate)) {
      item.native?.setMap(null);
      return;
    }
    if (!item.element) {
      item.element = document.createElement("div");
      item.element.style.cssText = "position:relative;cursor:pointer;";
      item.element.addEventListener("mouseenter", () =>
        this.emit(feature, (feature.getGeometry() as Point).getCoordinates()),
      );
      item.element.addEventListener("mousemove", (event) => {
        event.stopPropagation();
        this.emit(feature, (feature.getGeometry() as Point).getCoordinates());
      });
      item.element.addEventListener("mouseleave", () =>
        this.emit(null, (feature.getGeometry() as Point).getCoordinates()),
      );
      item.native = new this.sdk.CustomOverlay({
        content: item.element,
        position: latLng(this.sdk, coordinate),
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 100 + layer,
      });
    }
    const image = style.options.image;
    if (item.style !== style) {
      const previousImage = item.style?.options.image;
      const reuseImage =
        image instanceof Icon &&
        previousImage instanceof Icon &&
        image.options.src === previousImage.options.src &&
        item.image;
      if (!reuseImage) {
        item.element.replaceChildren();
        item.image = undefined;
        item.element.style.cssText = "position:relative;cursor:pointer;";
      }
      item.style = style;
      if (image instanceof Icon) {
        const img = item.image ?? document.createElement("img");
        item.image = img;
        const size = () => {
          if (this.disposed) return;
          const currentImage = item.style?.options.image;
          if (!(currentImage instanceof Icon)) return;
          const scale = currentImage.options.scale ?? 1;
          const width = img.naturalWidth * scale,
            height = img.naturalHeight * scale;
          item.element!.style.width = `${width}px`;
          item.element!.style.height = `${height}px`;
          img.style.width = `${width}px`;
          img.style.height = `${height}px`;
          const anchor = currentImage.options.anchor ?? [0.5, 1];
          item.element!.style.transform = `translate(${(0.5 - anchor[0]) * width}px, ${(1 - anchor[1]) * height}px)`;
        };
        img.onload = size;
        if (!reuseImage) {
          img.src = image.options.src;
          img.alt = "";
          img.draggable = false;
          img.style.cssText = "display:block;max-width:none;";
          item.element.appendChild(img);
        }
        if (img.complete) size();
      } else if (image instanceof CircleStyle) {
        const { radius, fill, stroke } = image.options;
        item.element.style.cssText += `width:${radius * 2}px;height:${radius * 2}px;border-radius:50%;background:${fill.options.color};border:${stroke.options.width}px solid ${stroke.options.color};transform:translateY(50%);`;
      }
    }
    if (image instanceof Icon && item.image)
      item.image.style.transform = `rotate(${image.options.rotation ?? 0}rad)`;
    item.native.setPosition(latLng(this.sdk, coordinate));
    if (item.native.getMap() !== this.native) item.native.setMap(this.native);
  }
  setTarget(_target: undefined) {
    void _target;
    if (this.disposed) return;
    this.disposed = true;
    this.observer.disconnect();
    this.surface.removeEventListener("mouseleave", this.leave);
    this.nativeEvents.forEach(({ name, fn }) =>
      this.sdk.event.removeListener(this.native, name, fn),
    );
    this.options.overlays?.forEach((overlay) => overlay.detach());
    this.sourceDetachers.forEach((detach) => detach());
    [...this.rendered.keys()].forEach((feature) => this.remove(feature));
    this.handlers.clear();
    this.extras.forEach((element) => element.remove());
    this.surface.remove();
    this.options.view.owner = undefined;
    this.native = null;
  }
}
