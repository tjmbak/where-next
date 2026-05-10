"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  LayerGroup,
  Map as LeafletMap,
  Marker,
  TileLayer
} from "leaflet";
import type { MarkerCluster, MarkerClusterGroup } from "leaflet";
import type { Destination, MonthNumber, MonthlyDestinationScore } from "@/types/content";
import { trackEvent } from "@/lib/analytics";

type ActivityMapProps = {
  month: MonthNumber;
  destinations: Array<{
    destination: Destination;
    score: MonthlyDestinationScore;
  }>;
  selectedSlug?: string;
  onSelect: (slug: string) => void;
};

import { TIER_COLORS, tierFromScore, type Tier } from "./tiers";
import { ClusterPreviewCard, type ClusterPreview } from "./ClusterPreviewCard";

type WnMarker = Marker & {
  wnScore: number;
  wnSlug: string;
  wnCity: string;
  wnCountry: string;
};

export function ActivityMap({ month, destinations, selectedSlug, onSelect }: ActivityMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const heatLayerRef = useRef<LayerGroup | null>(null);
  const linesLayerRef = useRef<LayerGroup | null>(null);
  const labelsLayerRef = useRef<TileLayer | null>(null);
  const markerLayerRef = useRef<MarkerClusterGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const dismissTimerRef = useRef<number | null>(null);
  const fitSignatureRef = useRef<string>("");
  const lastSelectedFlownRef = useRef<string | undefined>(undefined);
  const [mapReady, setMapReady] = useState(false);
  const [clusterPreview, setClusterPreview] = useState<ClusterPreview | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    void (async () => {
      const leafletModule = await import("leaflet");
      await import("leaflet.markercluster");
      if (cancelled || !containerRef.current || mapRef.current) return;
      const leaflet = leafletModule.default ?? leafletModule;

      const map = leaflet.map(containerRef.current, {
        center: [22, 8],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8,
        maxBounds: [
          [-60, -180],
          [78, 180]
        ],
        maxBoundsViscosity: 1,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
        worldCopyJump: true,
        zoomControl: false,
        attributionControl: false
      });

      leaflet
        .tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd",
          maxZoom: 19,
          noWrap: true,
          bounds: [
            [-85, -180],
            [85, 180]
          ],
          attribution: "© OpenStreetMap · CARTO"
        })
        .addTo(map);

      // Custom panes so we can stack: tiles → heat → lines → labels → markers.
      map.createPane("wn-lines");
      const linesPane = map.getPane("wn-lines");
      if (linesPane) {
        linesPane.style.zIndex = "420";
        linesPane.style.pointerEvents = "none";
      }
      map.createPane("wn-labels");
      const labelsPane = map.getPane("wn-labels");
      if (labelsPane) {
        labelsPane.style.zIndex = "450";
        labelsPane.style.pointerEvents = "none";
      }

      labelsLayerRef.current = leaflet
        .tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd",
          minZoom: 3,
          maxZoom: 19,
          noWrap: true,
          opacity: 0.45,
          pane: "wn-labels"
        })
        .addTo(map);

      leaflet.control.attribution({ prefix: false, position: "bottomright" }).addTo(map);

      heatLayerRef.current = leaflet.layerGroup().addTo(map);
      linesLayerRef.current = leaflet.layerGroup([], { pane: "wn-lines" }).addTo(map);

      const cluster = leaflet.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: true,
        spiderfyDistanceMultiplier: 1.4,
        maxClusterRadius: (zoom: number) => (zoom <= 2 ? 55 : zoom <= 4 ? 40 : 28),
        disableClusteringAtZoom: 6,
        chunkedLoading: true,
        animate: true,
        animateAddingMarkers: true,
        iconCreateFunction: (clusterRef) => {
          const children = clusterRef.getAllChildMarkers() as WnMarker[];
          const topScore = children.reduce((max, marker) => Math.max(max, marker.wnScore), 0);
          const tier = tierFromScore(topScore);
          const color = TIER_COLORS[tier];
          const count = clusterRef.getChildCount();
          const size = count >= 8 ? 36 : count >= 4 ? 32 : 28;
          return leaflet.divIcon({
            className: "wn-cluster",
            html: `
              <div class="wn-cluster-wrap ${tier}" role="button" tabindex="0" aria-label="Cluster of ${count} cities, top score ${topScore}" style="--color:${color};--size:${size}px">
                <span class="wn-cluster-pulse" aria-hidden="true"></span>
                <span class="wn-cluster-pulse delay" aria-hidden="true"></span>
                <span class="wn-cluster-dot">${count}</span>
              </div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
          });
        }
      });
      cluster.addTo(map);
      markerLayerRef.current = cluster;
      mapRef.current = map;

      const applyZoomClass = () => {
        if (!containerRef.current) return;
        containerRef.current.classList.toggle("wn-zoomed", map.getZoom() >= 4);
      };
      const cancelDismiss = () => {
        if (dismissTimerRef.current !== null) {
          window.clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = null;
        }
      };
      const scheduleDismiss = () => {
        cancelDismiss();
        dismissTimerRef.current = window.setTimeout(() => setClusterPreview(null), 160);
      };
      const dismissPreview = () => {
        cancelDismiss();
        setClusterPreview(null);
      };

      map.on("zoomend", applyZoomClass);
      map.on("movestart", dismissPreview);
      map.on("zoomstart", dismissPreview);
      applyZoomClass();

      cluster.on("clustermouseover", (event) => {
        cancelDismiss();
        const target = (event as unknown as { layer: MarkerCluster }).layer;
        const childMarkers = target.getAllChildMarkers() as WnMarker[];
        const sorted = childMarkers
          .map((marker) => ({
            slug: marker.wnSlug,
            city: marker.wnCity,
            country: marker.wnCountry,
            score: marker.wnScore,
            tier: tierFromScore(marker.wnScore)
          }))
          .sort((a, b) => b.score - a.score);
        const visibleItems = sorted.slice(0, 5);
        const remaining = Math.max(0, sorted.length - visibleItems.length);
        const containerPoint = map.latLngToContainerPoint(target.getLatLng());
        const size = map.getSize();
        setClusterPreview({
          x: containerPoint.x,
          y: containerPoint.y,
          total: target.getChildCount(),
          items: visibleItems,
          remaining,
          containerWidth: size.x,
          containerHeight: size.y
        });
      });

      cluster.on("clustermouseout", scheduleDismiss);
      cluster.on("clusterclick", dismissPreview);

      const center: [number, number] = [22, 8];
      window.setTimeout(() => {
        map.invalidateSize();
        map.setView(center, 2, { animate: false });
      }, 0);
      window.setTimeout(() => {
        map.invalidateSize();
        map.setView(center, 2, { animate: false });
      }, 250);
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      mapRef.current?.remove();
      mapRef.current = null;
      heatLayerRef.current = null;
      linesLayerRef.current = null;
      labelsLayerRef.current = null;
      markerLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const heatLayer = heatLayerRef.current;
    const linesLayer = linesLayerRef.current;
    const markerLayer = markerLayerRef.current;
    if (!mapReady || !map || !heatLayer || !linesLayer || !markerLayer) return;

    void import("leaflet").then((leafletModule) => {
      const leaflet = leafletModule.default ?? leafletModule;
      heatLayer.clearLayers();
      linesLayer.clearLayers();
      markerLayer.clearLayers();

      const sorted = [...destinations].sort((a, b) => b.score.overallScore - a.score.overallScore);
      const newMarkers: Marker[] = [];

      sorted.forEach(({ destination, score }, index) => {
        const selected = destination.slug === selectedSlug;
        const tier = tierFromScore(score.overallScore);
        const color = TIER_COLORS[tier];
        const blobSize = tier === "peak" ? 130 : tier === "hot" ? 95 : 60;
        const blobOpacity = tier === "peak" ? 0.32 : tier === "hot" ? 0.22 : 0.14;
        const lat = destination.coordinates.lat;
        const lng = destination.coordinates.lng;

        const heatIcon = leaflet.divIcon({
          className: "wn-heat",
          html: `<span style="
            position:absolute;top:0;left:0;
            display:block;width:${blobSize}px;height:${blobSize}px;
            margin:-${blobSize / 2}px 0 0 -${blobSize / 2}px;
            background:radial-gradient(closest-side, ${color} 0%, transparent 72%);
            opacity:${blobOpacity};
            border-radius:50%;mix-blend-mode:screen;filter:blur(2px);
          "></span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });
        leaflet
          .marker([lat, lng], {
            icon: heatIcon,
            interactive: false,
            keyboard: false
          })
          .addTo(heatLayer);

        const tierClass = `wn-marker-wrap ${tier}${selected ? " selected" : ""}`;
        const delay = `${Math.min(index, 14) * 55}ms`;
        const ariaLabel = `${destination.city}, ${destination.country} — score ${score.overallScore} (${tier})`;
        const markerIcon = leaflet.divIcon({
          className: "wn-marker",
          html: `
            <div class="${tierClass}" role="button" tabindex="0" aria-label="${ariaLabel}" style="--color:${color};animation-delay:${delay}">
              ${tier !== "warm" ? '<span class="wn-pulse" aria-hidden="true"></span><span class="wn-pulse delay" aria-hidden="true"></span>' : ""}
              <span class="wn-dot" aria-hidden="true"></span>
              <span class="wn-label">${destination.city.toLowerCase()}</span>
              <span class="wn-score" aria-hidden="true">${score.overallScore}</span>
            </div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });

        const marker = leaflet.marker([lat, lng], {
          icon: markerIcon,
          riseOnHover: true,
          riseOffset: 1000,
          alt: ariaLabel,
          keyboard: true
        }) as WnMarker;
        marker.wnScore = score.overallScore;
        marker.wnSlug = destination.slug;
        marker.wnCity = destination.city;
        marker.wnCountry = destination.country;

        const openCity = () => {
          onSelect(destination.slug);
          trackEvent("destination_map_click", {
            slug: destination.slug,
            month,
            score: score.overallScore
          });
          router.push(`/destinations/${destination.slug}?month=${month}`);
        };

        marker.on("click", openCity);
        // Keyboard support — let users tab to a marker and press Enter/Space.
        // Leaflet's `keyboard: true` makes the icon focusable; we wire the
        // key handler on the rendered <div> after add.
        marker.on("add", () => {
          const el = marker.getElement();
          if (!el) return;
          const wrap = el.querySelector(".wn-marker-wrap") as HTMLElement | null;
          if (!wrap) return;
          wrap.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openCity();
            }
          });
        });

        newMarkers.push(marker);
      });

      // Peak constellation — connect each peak destination to its 2 nearest peak neighbors.
      const peakNodes = sorted
        .filter(({ score }) => score.overallScore >= 90)
        .map(({ destination, score }) => ({
          slug: destination.slug,
          lat: destination.coordinates.lat,
          lng: destination.coordinates.lng,
          score: score.overallScore
        }));
      if (peakNodes.length >= 2) {
        const drawn = new Set<string>();
        for (const node of peakNodes) {
          const ranked = peakNodes
            .filter((other) => other.slug !== node.slug)
            .map((other) => ({
              other,
              distance: haversineKm(node.lat, node.lng, other.lat, other.lng)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 2);
          for (const { other, distance } of ranked) {
            const pairKey = [node.slug, other.slug].sort().join("|");
            if (drawn.has(pairKey)) continue;
            drawn.add(pairKey);
            // Skip ridiculously long links across the whole map (unhelpful clutter).
            if (distance > 11000) continue;
            const line = leaflet.polyline(
              [
                [node.lat, node.lng],
                [other.lat, other.lng]
              ],
              {
                pane: "wn-lines",
                color: "#ff8b3d",
                weight: 1,
                opacity: 0.55,
                dashArray: "1 6",
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
                className: "wn-line"
              }
            );
            line.addTo(linesLayer);
          }
        }
      }

      markerLayer.addLayers(newMarkers);
    });
  }, [destinations, mapReady, month, onSelect, router, selectedSlug]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || destinations.length === 0) return;

    const sortedSlugs = destinations
      .map((item) => item.destination.slug)
      .sort()
      .join(",");
    const sig = `${month}|${sortedSlugs}`;
    const isFirstFit = fitSignatureRef.current === "";
    if (sig === fitSignatureRef.current) return;
    fitSignatureRef.current = sig;
    if (isFirstFit) {
      lastSelectedFlownRef.current = selectedSlug;
      return;
    }

    lastSelectedFlownRef.current = selectedSlug;

    const topPicks = [...destinations]
      .sort((a, b) => b.score.overallScore - a.score.overallScore)
      .slice(0, 6);

    const lats = topPicks.map((p) => p.destination.coordinates.lat);
    const lngs = topPicks.map((p) => p.destination.coordinates.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    if (topPicks.length === 1 || (maxLat - minLat < 1 && maxLng - minLng < 1)) {
      const lat = (minLat + maxLat) / 2;
      const lng = (minLng + maxLng) / 2;
      map.flyTo([lat, lng], 4, { duration: 0.9, easeLinearity: 0.25 });
      return;
    }

    const bounds: [[number, number], [number, number]] = [
      [minLat, minLng],
      [maxLat, maxLng]
    ];
    map.flyToBounds(bounds, {
      padding: [70, 70],
      maxZoom: 4,
      duration: 0.9,
      easeLinearity: 0.25
    });
  }, [destinations, mapReady, month, selectedSlug]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    if (!selectedSlug) {
      lastSelectedFlownRef.current = undefined;
      return;
    }
    if (lastSelectedFlownRef.current === selectedSlug) return;

    const target = destinations.find((d) => d.destination.slug === selectedSlug);
    if (!target) return;

    lastSelectedFlownRef.current = selectedSlug;

    const lat = target.destination.coordinates.lat;
    const lng = target.destination.coordinates.lng;
    const currentZoom = map.getZoom();
    const bounds = map.getBounds();
    if (currentZoom >= 4 && bounds.contains([lat, lng])) return;

    map.flyTo([lat, lng], Math.max(currentZoom, 4), {
      duration: 0.7,
      easeLinearity: 0.25
    });
  }, [destinations, mapReady, selectedSlug]);

  const liveCount = destinations.length;
  const peakCount = destinations.filter((d) => d.score.overallScore >= 90).length;

  function handleZoom(direction: "in" | "out") {
    const map = mapRef.current;
    if (!map) return;
    const next = map.getZoom() + (direction === "in" ? 1 : -1);
    map.setZoom(next, { animate: true });
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[#08080a] shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
      <div className="absolute left-4 top-4 z-[500] flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[rgba(13,13,16,0.7)] px-3 py-1.5 backdrop-blur">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--signal)] opacity-75" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--signal)] shadow-[0_0_8px_var(--signal)]" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          live · {liveCount.toString().padStart(2, "0")} cities · {peakCount.toString().padStart(2, "0")} peak
        </span>
      </div>

      <div className="absolute right-4 top-4 z-[500] flex items-center gap-3 rounded-full border border-[var(--border-strong)] bg-[rgba(13,13,16,0.7)] px-3 py-1.5 backdrop-blur">
        <Legend label="peak" color={TIER_COLORS.peak} />
        <Legend label="hot" color={TIER_COLORS.hot} />
        <Legend label="warm" color={TIER_COLORS.warm} />
      </div>

      <div className="absolute right-4 top-16 z-[500] flex flex-col overflow-hidden rounded-md border border-[var(--border-strong)] bg-[rgba(13,13,16,0.75)] backdrop-blur">
        <button
          type="button"
          aria-label="zoom in"
          onClick={() => handleZoom("in")}
          className="flex h-7 w-7 items-center justify-center font-mono text-[14px] leading-none text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
        >
          +
        </button>
        <span className="h-px bg-[var(--border)]" />
        <button
          type="button"
          aria-label="zoom out"
          onClick={() => handleZoom("out")}
          className="flex h-7 w-7 items-center justify-center font-mono text-[14px] leading-none text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
        >
          −
        </button>
      </div>

      <div ref={containerRef} className="aspect-[6/5] w-full sm:aspect-[5/4] lg:aspect-[6/5]" />

      {clusterPreview ? (
        <ClusterPreviewCard
          preview={clusterPreview}
          onSelect={(slug) => {
            onSelectRef.current(slug);
            setClusterPreview(null);
            router.push(`/destinations/${slug}?month=${month}`);
          }}
          onMouseEnter={() => {
            if (dismissTimerRef.current !== null) {
              window.clearTimeout(dismissTimerRef.current);
              dismissTimerRef.current = null;
            }
          }}
          onMouseLeave={() => setClusterPreview(null)}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[400] overflow-hidden">
        <div className="wn-scan" aria-hidden />
        <div className="wn-vignette" aria-hidden />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[450] h-24 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div className="pointer-events-none absolute bottom-3 right-4 z-[500] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {month.toString().padStart(2, "0")} / 26
      </div>
    </div>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}, 0 0 2px ${color}` }}
      />
      {label}
    </span>
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
