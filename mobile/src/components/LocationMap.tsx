import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius } from '../theme/theme';

export type LatLng = { lat: number; lng: number };

interface Props {
  value: LatLng | null;
  onChange?: (p: LatLng) => void; // omit for a read-only map
  secondary?: LatLng | null; // e.g. where the shop selfie was taken
  height?: number;
  style?: ViewStyle;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

// OpenStreetMap (Leaflet) inside a WebView — no Google Maps API key needed.
// Editable maps: tap or drag the pin to set the exact location.
function html(editable: boolean) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{height:100%;margin:0;background:#ECECF8}.leaflet-control-attribution{font-size:9px}</style>
</head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var editable=${editable};
var map=L.map('m',{zoomControl:true}).setView([7.8731,80.7718],7);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
var icon=L.divIcon({className:'',iconSize:[34,44],iconAnchor:[17,42],html:'<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 0C7.6 0 0 7.6 0 17c0 12.8 17 27 17 27s17-14.2 17-27C34 7.6 26.4 0 17 0z" fill="#D2262B"/><circle cx="17" cy="17" r="7" fill="#fff"/></svg>'});
var pin=null,extra=null;
function post(o){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(o));}
function setPin(lat,lng,zoom){
  if(!pin){pin=L.marker([lat,lng],{draggable:editable,icon:icon}).addTo(map);
    pin.on('dragend',function(){var p=pin.getLatLng();post({type:'pin',lat:p.lat,lng:p.lng});});}
  else pin.setLatLng([lat,lng]);
  map.setView([lat,lng],zoom||Math.max(map.getZoom(),16));
}
function setExtra(lat,lng){
  if(extra)map.removeLayer(extra);
  extra=L.circleMarker([lat,lng],{radius:8,color:'#2E2D7C',fillColor:'#2E2D7C',fillOpacity:.6}).addTo(map);
  if(pin)map.fitBounds(L.featureGroup([pin,extra]).getBounds().pad(0.6),{maxZoom:17});
}
if(editable)map.on('click',function(e){setPin(e.latlng.lat,e.latlng.lng,map.getZoom()<14?16:map.getZoom());post({type:'pin',lat:e.latlng.lat,lng:e.latlng.lng});});
post({type:'ready'});
</script></body></html>`;
}

export function LocationMap({ value, onChange, secondary, height = 220, style, onTouchStart, onTouchEnd }: Props) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const fromMap = useRef<LatLng | null>(null);
  const source = useMemo(() => ({ html: html(!!onChange), baseUrl: 'https://genuineparts.lk/' }), [!!onChange]);

  const push = () => {
    if (!ready.current) return;
    if (value && !(fromMap.current && fromMap.current.lat === value.lat && fromMap.current.lng === value.lng)) {
      ref.current?.injectJavaScript(`setPin(${value.lat},${value.lng});true;`);
    }
    if (value && secondary) ref.current?.injectJavaScript(`setExtra(${secondary.lat},${secondary.lng});true;`);
  };
  useEffect(push, [value?.lat, value?.lng, secondary?.lat, secondary?.lng]);

  return (
    <View style={[styles.wrap, { height }, style]} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      <WebView
        ref={ref}
        source={source}
        originWhitelist={['*']}
        javaScriptEnabled
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'ready') {
              ready.current = true;
              fromMap.current = null;
              push();
            } else if (msg.type === 'pin' && onChange) {
              const p = { lat: Math.round(msg.lat * 1e6) / 1e6, lng: Math.round(msg.lng * 1e6) / 1e6 };
              fromMap.current = p;
              onChange(p);
            }
          } catch {
            // ignore
          }
        }}
        // Keep the map self-contained: never navigate away inside it.
        onShouldStartLoadWithRequest={(req) => req.url.startsWith('about:') || req.url.startsWith('https://genuineparts.lk/')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.navySoft },
});
