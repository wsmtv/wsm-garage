"use client";
import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const B = {
  red:    "#CC1800",
  redHot: "#FF2200",
  redDim: "#6a0e00",
  white:  "#FFFFFF",
  bg:     "#080808",
  muted:  "#666666",
  dim:    "#222222",
};

const AUTO_INTERVAL = 8000; // ms between slides

// ─────────────────────────────────────────────────────────────────────────────
// ─── CAR REGISTRY — ADD YOUR CARS HERE ───────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
//
//  shape:   "corvette" | "nova" | "engine" | "scan" | "car"
//           Use "scan" for any PLY/GLB scan — no procedural fallback needed
//           Use "car"  for a generic procedural car silhouette fallback
//
//  plyPath: "/models/yourfile.ply"   ← Scaniverse PLY mesh export (recommended)
//  glbPath: "/models/yourfile.glb"   ← Blender/GLB export
//  (plyPath takes priority over glbPath if both are set)
//  (if neither is set — procedural Three.js model is used as fallback)
//
//  stats:   values 0–100, shown as animated bars
//           include any keys you want — they render automatically
//
// TEMPLATE — copy and fill in to add a new car:
// {
//   id: 99, key: "mycar",
//   make: "MAKE", model: "MODEL", year: "YEAR", nickname: "NICKNAME",
//   displacement: "X CU IN", hp: "X BHP", torque: "X LB·FT",
//   config: "V8 · TYPE", weight: "X LBS", status: "OWNED",
//   shape: "scan",
//   plyPath: "/models/mycar.ply",     // ← your Scaniverse scan
//   glbPath: null,
//   stats: { power: 80, torque: 85, handling: 70, rawness: 90, sound: 88 },
//   desc: "One sentence about the car.",
//   episodes: ["S01·E01 — Episode Title"],
// },
// ─────────────────────────────────────────────────────────────────────────────

const CARS = [
  // ── 1968 CORVETTE C3 STINGRAY ──────────────────────────────────────────────
  {
    id: 1, key: "corvette",
    make: "CHEVROLET", model: "CORVETTE", year: "1968", nickname: "THE STINGRAY",
    displacement: "427 CU IN", hp: "435 BHP", torque: "460 LB·FT",
    config: "V8 · BIG BLOCK", weight: "3,195 LBS", status: "OWNED",
    shape: "scan",
    plyPath: null,
    glbPath: "/models/corvette.glb",
    stats: { power: 92, torque: 88, handling: 74, rawness: 95, sound: 97 },
    desc: "Coke-bottle curves. Side-pipe snarl. Black as midnight.",
    episodes: ["S01·E03 — Cold Start Ritual","S01·E07 — Side Pipe Swap","S02·E01 — Dyno Day"],
  },

  // ── 1974 CHEVROLET NOVA ────────────────────────────────────────────────────
  {
    id: 2, key: "nova",
    make: "CHEVROLET", model: "NOVA", year: "1974", nickname: "THE SLEEPER",
    displacement: "383 CU IN", hp: "~400 BHP", torque: "420 LB·FT",
    config: "383 STROKER · SBC", weight: "3,420 LBS", status: "OWNED",
    shape: "scan",
    plyPath: null,              // ← nova.ply
    glbPath: null,
    stats: { power: 82, torque: 88, handling: 68, rawness: 95, sound: 97 },
    desc: "Candy red. Twin white stripes. War crime at idle.",
    episodes: ["S02·E04 — Cold Start Blues","S02·E03 — Carb Rebuild","S01·E06 — Exhaust Note"],
  },

  // ── CHEVROLET CAPRICE ──────────────────────────────────────────────────────
  {
    id: 4, key: "caprice",
    make: "CHEVROLET", model: "CAPRICE", year: "1975", nickname: "THE CRUISER",
    displacement: "400 CU IN", hp: "175 BHP", torque: "305 LB·FT",
    config: "V8 · SMALL BLOCK", weight: "4,215 LBS", status: "OWNED",
    shape: "scan",              // "scan" = expects PLY/GLB, no procedural fallback
    plyPath: "/models/caprice.ply",   // ← your Scaniverse scan goes here
    glbPath: null,
    stats: { power: 68, torque: 72, handling: 55, rawness: 78, sound: 82 },
    desc: "Full-size American iron. The kind of car that owns every road it touches.",
    episodes: ["S02·E06 — Caprice Cold Start","S02·E07 — Full Size Fury"],
  },


  // ── 1971 CHEVROLET CAMARO ─────────────────────────────────────────────────
  {
    id: 5, key: "camaro",
    make: "CHEVROLET", model: "CAMARO", year: "1971", nickname: "THE MUSCLE",
    displacement: "396 CU IN", hp: "375 BHP", torque: "415 LB·FT",
    config: "V8 · BIG BLOCK", weight: "3,675 LBS", status: "OWNED",
    shape: "scan", plyPath: null, glbPath: "/models/camaro.glb",
    stats: { power: 88, torque: 86, handling: 70, rawness: 93, sound: 95 },
    desc: "Second gen muscle. Wide stance, big block thunder.",
    episodes: ["S03·E01 — Camaro Cold Start","S03·E02 — Big Block Pull"],
  },

  // ── 1968 FORD MUSTANG ─────────────────────────────────────────────────────
  {
    id: 6, key: "mustang",
    make: "FORD", model: "MUSTANG", year: "1968", nickname: "THE PONY",
    displacement: "390 CU IN", hp: "325 BHP", torque: "427 LB·FT",
    config: "V8 · FE BIG BLOCK", weight: "3,125 LBS", status: "OWNED",
    shape: "scan", plyPath: null, glbPath: "/models/mustang.glb",
    stats: { power: 82, torque: 84, handling: 72, rawness: 88, sound: 91 },
    desc: "Fastback legend. The car that started the pony wars.",
    episodes: ["S03·E03 — Mustang Revival","S03·E04 — Pony vs Muscle"],
  },

  // ── 2023 CHEVROLET CORVETTE C9 ────────────────────────────────────────────
  {
    id: 7, key: "c9",
    make: "CHEVROLET", model: "CORVETTE C9", year: "2023", nickname: "THE FUTURE",
    displacement: "6.2L CU IN", hp: "670 BHP", torque: "460 LB·FT",
    config: "V8 · LT6 FLAT-PLANE", weight: "3,366 LBS", status: "OWNED",
    shape: "scan", plyPath: null, glbPath: "/models/c9.glb",
    stats: { power: 98, torque: 92, handling: 97, rawness: 85, sound: 96 },
    desc: "Mid-engine revolution. America's supercar goes European.",
    episodes: ["S03·E05 — C9 Reveal","S03·E06 — Track Day"],
  },

  // ── ADD MORE CARS BELOW — copy the TEMPLATE above ─────────────────────────
  // { id: 8, key: "...", ... }
];

const PANELS = ["STATS", "SPECS", "HISTORY", "EPISODES"];

// ─── SCAN PLACEHOLDER ────────────────────────────────────────────────────────
// Shown while PLY/GLB is loading — simple pulsing wireframe diamond
function buildScanPlaceholder(){
  const g = new THREE.Group();
  // Outer wireframe octahedron — rotates while scan loads
  const geo = new THREE.OctahedronGeometry(1.0, 0);
  const wire = new THREE.WireframeGeometry(geo);
  const mat = new THREE.LineBasicMaterial({ color: 0xcc1800, transparent: true, opacity: 0.5 });
  const mesh = new THREE.LineSegments(wire, mat);
  g.add(mesh);
  // Inner solid — very dark
  const inner = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.7, 0),
    new THREE.MeshStandardMaterial({ color: 0x1a0500, metalness: 0.8, roughness: 0.4 })
  );
  g.add(inner);
  // Small scan label
  return g;
}

// ─── GLOBAL SCENE CACHE ───────────────────────────────────────────────────────
// Scény sa buildujú RAZ a držia v pamäti — prepnutie = 0ms latencia
const sceneCache = {}; // id → { scene, camera, ring, mesh, rotY }
const gltfCache  = {}; // glbPath → THREE.Group

function addLights(scene){
  scene.add(new THREE.AmbientLight(0x111008,1.8));
  const key=new THREE.DirectionalLight(0xffffff,3.0);
  key.position.set(4,10,5);key.castShadow=true;scene.add(key);
  const fill=new THREE.DirectionalLight(0x330808,0.6);
  fill.position.set(-5,2,-3);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,1.6);
  rim.position.set(0,3,-8);scene.add(rim);
  const redUnder=new THREE.PointLight(0xcc1800,3.0,7);
  redUnder.position.set(0,-1.2,0);scene.add(redUnder);
  const spot=new THREE.SpotLight(0xffffff,4.0,16,Math.PI/4,0.6);
  spot.position.set(0,9,2);spot.castShadow=true;scene.add(spot);
}

// Per-shape camera + framing config
// camY/camZ = camera position, lookY = where camera looks,
// meshY = vertical offset of mesh so it sits centred in view
// Camera/framing config per shape type.
// "scan" = any PLY/GLB scan of a car-sized object
// "engine" = standalone engine on stand
// Add a custom key matching car.shape for per-car fine-tuning
const SHAPE_CFG = {
  // Generic default — used for all scanned cars without a specific override
  scan:    { camY:0.30, camZ:4.8, lookY:0.18, meshY:-0.30, ringY:-0.50, fov:30 },
  car:     { camY:0.30, camZ:4.8, lookY:0.18, meshY:-0.30, ringY:-0.50, fov:30 },
  engine:  { camY:0.40, camZ:5.2, lookY:0.15, meshY:-0.20, ringY:-0.60, fov:32 },
  // Per-car overrides — key must match car.key in CARS array
  // Adjust meshY (lower = negative) and camZ (higher = zoom out) per scan
  caprice: { camY:0.20, camZ:5.2, lookY:0.08, meshY:-0.60, ringY:-0.62, fov:28 },
  // corvette: { camY:0.30, camZ:4.6, lookY:0.18, meshY:-0.30, ringY:-0.50, fov:30 },
  // nova:     { camY:0.35, camZ:4.8, lookY:0.20, meshY:-0.30, ringY:-0.52, fov:30 },
};

function buildSceneForCar(car){
  if(sceneCache[car.id]) return sceneCache[car.id];

  // Per-car key takes priority (e.g. "caprice"), then shape, then generic scan default
  const cfg = SHAPE_CFG[car.key] || SHAPE_CFG[car.shape] || SHAPE_CFG.scan;
  const scene=new THREE.Scene();
  addLights(scene);

  // Glow ring at floor level per shape
  const ring=new THREE.Mesh(
    new THREE.RingGeometry(2.0,2.4,64),
    new THREE.MeshBasicMaterial({color:0xcc1800,transparent:true,opacity:0.12,side:THREE.DoubleSide})
  );
  ring.rotation.x=-Math.PI/2;
  ring.position.y=cfg.ringY;
  scene.add(ring);

  // Camera — positioned so car fills ~70% of height and is centred
  const camera=new THREE.PerspectiveCamera(cfg.fov,16/9,0.1,100);
  camera.position.set(0,cfg.camY,cfg.camZ);
  camera.lookAt(0,cfg.lookY,0);

  // All cars use the scan placeholder until real GLB loads
  const mesh = buildScanPlaceholder();
  mesh.position.y = cfg.meshY;
  scene.add(mesh);

  const entry={scene,camera,ring,mesh,rotY:-0.6};
  sceneCache[car.id]=entry;

  // 3D model async load — supports GLB/GLTF and PLY — guard SSR
  const modelPath = car.plyPath || car.glbPath; // prefer PLY if provided
  if(modelPath && typeof window !== 'undefined'){
    const cacheKey = modelPath;
    if(gltfCache[cacheKey]){
      // Already loaded — clone and use immediately
      const clone = gltfCache[cacheKey].clone();
      positionModel(clone, cfg);
      scene.remove(mesh);
      scene.add(clone);
      entry.mesh = clone;
    } else {
      const absoluteUrl = window.location.origin + (modelPath.startsWith('/') ? modelPath : '/' + modelPath);
      const isPLY = modelPath.toLowerCase().endsWith('.ply');

      if(isPLY){
        // ── PLY LOADER — with Scaniverse geometry repair ──
        new PLYLoader().load(absoluteUrl,(rawGeometry)=>{

          // ── STEP 1: Repair non-indexed geometry ──────────────────────────
          // Scaniverse PLY exports non-indexed meshes (every triangle has 3
          // unique verts). mergeVertices welds coincident points so normals
          // can be averaged correctly across triangles.
          let geometry = rawGeometry;
          try {
            // Remove color attribute temporarily so mergeVertices only
            // compares position (color differences would prevent merging)
            const colorAttr = geometry.getAttribute('color');
            if(colorAttr) geometry.deleteAttribute('color');

            geometry = mergeVertices(geometry, 1e-4); // tolerance 0.1mm

            // Re-add colors after merge (they map by face, still valid)
            if(colorAttr) geometry.setAttribute('color', colorAttr);
          } catch(e) {
            // mergeVertices failed — use raw geometry, still better than crash
            geometry = rawGeometry;
          }

          // ── STEP 2: Compute clean normals ────────────────────────────────
          geometry.computeVertexNormals();

          // ── STEP 3: Material — use vertex colors if Scaniverse baked them ─
          const hasColors = geometry.hasAttribute('color');
          const material = hasColors
            ? new THREE.MeshStandardMaterial({
                vertexColors: true,
                metalness: 0.05,
                roughness: 0.75,
                // Boost brightness slightly — scanned colors can be dark
                color: new THREE.Color(1.15, 1.15, 1.15),
              })
            : new THREE.MeshStandardMaterial({
                color: new THREE.Color('#999999'),
                metalness: 0.25,
                roughness: 0.65,
              });

          const model = new THREE.Mesh(geometry, material);
          model.castShadow = true;
          model.receiveShadow = true;

          positionModel(model, cfg);
          gltfCache[cacheKey] = model;
          if(sceneCache[car.id]){
            sceneCache[car.id].scene.remove(sceneCache[car.id].mesh);
            sceneCache[car.id].scene.add(model);
            sceneCache[car.id].mesh = model;
          }
        }, null, (err)=>{ console.error('[WSM] GLB load FAILED:', absoluteUrl, err); }); // on error keep procedural placeholder

      } else {
        // ── GLB/GLTF LOADER ──
        console.log('[WSM] Loading GLB:', absoluteUrl);
        new GLTFLoader().load(absoluteUrl,(gltf)=>{
          console.log('[WSM] GLB loaded OK:', absoluteUrl);
          const model = gltf.scene;
          positionModel(model, cfg);
          model.traverse(c=>{
            if(c.isMesh){
              c.castShadow=true; c.receiveShadow=true;
              if(c.material){
              const hasAnyMap=c.material.map||c.material.normalMap||c.material.roughnessMap||c.material.metalnessMap;
              if(!hasAnyMap){c.material.metalness=0.2;c.material.roughness=0.8;}
            }
            }
          });
          gltfCache[cacheKey] = model;
          if(sceneCache[car.id]){
            sceneCache[car.id].scene.remove(sceneCache[car.id].mesh);
            sceneCache[car.id].scene.add(model);
            sceneCache[car.id].mesh = model;
          }
        }, null, (err)=>{ console.error('[WSM] GLB load FAILED:', absoluteUrl, err); });
      }
    }
  }

  return entry;
}

// Centre and scale a GLB so it fits nicely, then apply cfg.meshY offset
function positionModel(model, cfg){
  const box=new THREE.Box3().setFromObject(model);
  const center=box.getCenter(new THREE.Vector3());
  const size=box.getSize(new THREE.Vector3());
  const maxDim=Math.max(size.x,size.y,size.z);
  // Scale so car fills viewport well — target ~3.8 world units on longest axis
  const scale=3.8/maxDim;
  // Step 1: move model so its geometric center is at world origin
  model.position.sub(center);
  model.scale.setScalar(scale);
  // Step 2: after scaling, shift so the BOTTOM of the model sits at cfg.meshY
  // This means wheels/undercarriage touch the floor ring exactly
  const halfH = (size.y * scale) / 2;
  model.position.y = cfg.meshY + halfH;
}

// Scenes are preloaded client-side inside useEffect — never at module level (Next.js SSR has no window)

// ─── 3D VIEWER ────────────────────────────────────────────────────────────────
// Single persistent renderer — NEVER recreated between car switches
function Car3DViewer({car}){
  const mountRef=useRef(null);
  const rafRef  =useRef(null);
  const rendRef =useRef(null);
  const dragRef =useRef({isDrag:false,lastX:0});

  // Create renderer ONCE on mount — also triggers client-side preload of all scenes
  useEffect(()=>{
    const el=mountRef.current;if(!el)return;
    // Clear cache — SSR may have populated it without window/GLB loading
    // Reset so GLB loads properly on client
    Object.keys(sceneCache).forEach(k=>delete sceneCache[k]);
    Object.keys(gltfCache).forEach(k=>delete gltfCache[k]);
    // Preload all scenes now (client-side only — safe, window exists here)
    CARS.forEach(car=>buildSceneForCar(car));
    const W=el.clientWidth||800,H=el.clientHeight||500;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setSize(W,H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.2;
    renderer.setClearColor(0x000000,0);
    el.appendChild(renderer.domElement);
    rendRef.current=renderer;
    return()=>{ cancelAnimationFrame(rafRef.current); renderer.dispose(); };
  },[]); // ← empty deps = runs once only

  // On car change — just swap scene, no rebuild, no loading
  useEffect(()=>{
    cancelAnimationFrame(rafRef.current);
    const renderer=rendRef.current;if(!renderer)return;
    const entry=sceneCache[car.id];if(!entry)return;

    // Fix camera aspect for actual canvas size
    const el=mountRef.current;
    if(el){
      const W=el.clientWidth||800,H=el.clientHeight||500;
      entry.camera.aspect=W/H;
      entry.camera.updateProjectionMatrix();
      renderer.setSize(W,H);
      // Re-apply cfg lookAt after aspect update (camera may have drifted)
      const cfg=SHAPE_CFG[car.key]||SHAPE_CFG[car.shape]||SHAPE_CFG.scan;
      entry.camera.position.set(0,cfg.camY,cfg.camZ);
      entry.camera.lookAt(0,cfg.lookY,0);
    }

    const drag=dragRef.current;
    const tick=()=>{
      rafRef.current=requestAnimationFrame(tick);
      // Always rotate — this is the fix for the freeze bug
      // entry.rotY is per-scene so it never conflicts between cars
      if(!drag.isDrag) entry.rotY+=0.006;
      entry.mesh.rotation.y=entry.rotY;
      entry.ring.rotation.z+=0.002;
      renderer.render(entry.scene,entry.camera);
    };
    tick();
  },[car.id]); // ← only reruns when car changes, never rebuilds renderer

  const dn=e=>{dragRef.current.isDrag=true;dragRef.current.lastX=e.clientX??e.touches?.[0]?.clientX;};
  const mv=e=>{
    if(!dragRef.current.isDrag)return;
    const x=e.clientX??e.touches?.[0]?.clientX;
    const entry=sceneCache[car.id];
    if(entry) entry.rotY+=(x-dragRef.current.lastX)*0.012;
    dragRef.current.lastX=x;
  };
  const up=()=>{dragRef.current.isDrag=false;};

  return(
    <div ref={mountRef}
      onMouseDown={dn} onMouseMove={mv} onMouseUp={up} onMouseLeave={up}
      onTouchStart={dn} onTouchMove={mv} onTouchEnd={up}
      style={{width:"100%",height:"100%",cursor:"grab"}}
    />
  );
}

// ─── STAT BAR — big text + staggered glow reveal ─────────────────────────────
function StatBar({label,value,delay}){
  const [pct,  setPct]  = useState(0);
  const [lit,  setLit]  = useState(false);
  const [peek, setPeek] = useState(false);
  useEffect(()=>{
    setPct(0); setLit(false);
    const t=setTimeout(()=>{setPct(value);setLit(true);},delay+60);
    return()=>clearTimeout(t);
  },[value,delay]);
  return(
    <div
      onMouseEnter={()=>setPeek(true)}
      onMouseLeave={()=>setPeek(false)}
      style={{
        marginBottom:14, padding:"8px 10px",
        borderLeft:`2px solid ${lit?(peek?B.redHot:B.red):"rgba(255,255,255,0.06)"}`,
        background:peek?"rgba(204,24,0,0.08)":lit?"rgba(204,24,0,0.03)":"transparent",
        transition:"border-color 0.5s,background 0.3s", cursor:"default",
      }}
    >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
        <span style={{
          fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:13,letterSpacing:"0.28em",fontWeight:700,textTransform:"uppercase",
          color:lit?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.15)",
          transition:"color 0.6s",
        }}>{label}</span>
        <span style={{
          fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:26,fontWeight:900,letterSpacing:"0.06em",
          color:lit?(peek?B.redHot:B.white):"rgba(255,255,255,0.1)",
          textShadow:lit&&peek?`0 0 20px ${B.red},0 0 40px rgba(204,24,0,0.5)`:lit?"0 0 10px rgba(255,255,255,0.15)":"none",
          transition:"color 0.5s,text-shadow 0.3s",
        }}>{value}</span>
      </div>
      <div style={{height:3,background:"rgba(255,255,255,0.06)",position:"relative",borderRadius:2}}>
        <div style={{
          height:"100%",width:`${pct}%`,borderRadius:2,position:"relative",
          background:peek?`linear-gradient(90deg,${B.redDim},${B.redHot})`:`linear-gradient(90deg,${B.redDim},${B.red})`,
          transition:"width 1.0s cubic-bezier(0.25,0.46,0.45,0.94),background 0.3s",
        }}>
          {pct>0&&<div style={{position:"absolute",right:-1,top:-3,width:3,height:9,background:peek?B.redHot:B.red,boxShadow:`0 0 ${peek?16:8}px ${peek?B.redHot:B.red}`,borderRadius:2,transition:"all 0.3s"}}/>}
        </div>
      </div>
    </div>
  );
}

// ─── STAT ROW — animated reveal for STATS panel ───────────────────────────────
function StatRow({label,val,delay}){
  const [lit,  setLit]  = useState(false);
  const [peek, setPeek] = useState(false);
  useEffect(()=>{
    setLit(false);
    const t=setTimeout(()=>setLit(true),delay);
    return()=>clearTimeout(t);
  },[delay,label]);
  return(
    <div
      onMouseEnter={()=>setPeek(true)}
      onMouseLeave={()=>setPeek(false)}
      style={{
        display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:8,paddingBottom:8,paddingLeft:lit?8:0,
        borderBottom:`1px solid ${peek?"rgba(204,24,0,0.3)":"rgba(255,255,255,0.05)"}`,
        background:peek?"rgba(204,24,0,0.07)":"transparent",
        transition:"padding-left 0.45s ease,border-color 0.3s,background 0.3s",
        cursor:"default",
      }}
    >
      <span style={{
        fontFamily:"'Barlow Condensed',sans-serif",
        fontSize:14,letterSpacing:"0.2em",fontWeight:700,
        color:lit?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.08)",
        transition:"color 0.5s",
      }}>{label}</span>
      <span style={{
        fontFamily:"'Barlow Condensed',sans-serif",
        fontSize:22,fontWeight:900,letterSpacing:"0.08em",
        color:lit?(peek?B.redHot:B.white):"rgba(255,255,255,0.05)",
        textShadow:peek&&lit?`0 0 18px ${B.red}`:"none",
        transition:"color 0.5s,text-shadow 0.3s",
      }}>{val}</span>
    </div>
  );
}

// ─── QR CODE COMPONENT ────────────────────────────────────────────────────────
function QRCode({ url, size = 120 }){
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(()=>{
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
    script.onload = ()=>{
      try{
        const qr = window.qrcode(0, "M");
        qr.addData(url);
        qr.make();
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext("2d");
        const count = qr.getModuleCount();
        const cell  = size / count;
        canvas.width  = size;
        canvas.height = size;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#080808";
        for(let r=0;r<count;r++)
          for(let c=0;c<count;c++)
            if(qr.isDark(r,c)) ctx.fillRect(c*cell, r*cell, cell, cell);
        setReady(true);
      } catch(e){}
    };
    document.head.appendChild(script);
    return ()=>{ try{ document.head.removeChild(script); }catch(e){} };
  }, [url, size]);

  return(
    <div style={{padding:6, background:"#fff", borderRadius:4}}>
      <canvas ref={canvasRef}
        style={{display:"block", width:size, height:size,
          imageRendering:"pixelated", borderRadius:2,
          opacity:ready?1:0, transition:"opacity 0.4s"}}
      />
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function WhiteStripeMadness(){
  const [carIdx,    setCarIdx]    = useState(0);
  const [panel,     setPanel]     = useState("STATS");
  const [anamScale, setAnamScale] = useState(1);
  const [anamZ,     setAnamZ]     = useState(0);
  const [anamGlow,  setAnamGlow]  = useState(0);
  const autoTimer   = useRef(null);
  const panelTimer  = useRef(null);
  const anamFrames  = useRef(null);
  const panelCycleRef = useRef(true); // false when user manually picked a panel
  const car=CARS[carIdx];

  // ── AUTO-CYCLE cars — každých 8s prepne ──
  const scheduleNext=()=>{
    clearTimeout(autoTimer.current);
    autoTimer.current=setTimeout(()=>setCarIdx(p=>(p+1)%CARS.length),AUTO_INTERVAL);
  };
  useEffect(()=>{scheduleNext();return()=>clearTimeout(autoTimer.current);},[carIdx]);

  // ── AUTO-CYCLE panels — každé 2s prepne panel počas auto-rotate ──
  // Resets when car changes, stops when user manually clicks a panel
  useEffect(()=>{
    panelCycleRef.current = true; // new car = resume auto panel cycle
    setPanel("STATS");
    clearInterval(panelTimer.current);
    panelTimer.current = setInterval(()=>{
      if(!panelCycleRef.current) return;
      setPanel(p=>{
        const idx = PANELS.indexOf(p);
        return PANELS[(idx+1) % PANELS.length];
      });
    }, AUTO_INTERVAL / PANELS.length); // evenly divide car time across panels
    return()=>clearInterval(panelTimer.current);
  },[carIdx]);

  // ── ANAMORPHIC BILLBOARD — spustí sa pri každom prepnutí ──
  useEffect(()=>{
    cancelAnimationFrame(anamFrames.current);
    const t0=performance.now();
    const TOTAL=3200,PEAK=1400;
    const run=now=>{
      const t=Math.min((now-t0)/TOTAL,1);
      let prog;
      if(t<PEAK/TOTAL){
        const p=t/(PEAK/TOTAL);
        prog=1-Math.pow(1-p,3); // easeOut cubic
      } else {
        const p=(t-PEAK/TOTAL)/(1-PEAK/TOTAL);
        prog=1-(3*p*p-2*p*p*p);  // easeInOut cubic — návrat
      }
      setAnamScale(1+prog*0.18);
      setAnamZ(prog*60);
      setAnamGlow(prog*0.85);
      if(t<1) anamFrames.current=requestAnimationFrame(run);
      else{setAnamScale(1);setAnamZ(0);setAnamGlow(0);}
    };
    anamFrames.current=requestAnimationFrame(run);
    return()=>cancelAnimationFrame(anamFrames.current);
  },[carIdx]);

  const handleSelect=i=>{
    if(i===carIdx)return;
    setCarIdx(i);
    clearTimeout(autoTimer.current);
    scheduleNext();
  };

  // QR overlay — shows scannable link to mobile app
  const [showQR, setShowQR] = useState(true);
  const qrUrl = typeof window !== "undefined"
    ? window.location.origin + "/mobile"
    : "https://wsm.vercel.app/mobile";

  return(
    <div style={{width:"100vw",height:"100vh",overflow:"hidden",background:"#080808",color:B.white,fontFamily:"'Barlow Condensed',sans-serif",position:"relative",userSelect:"none"}}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700;1,900&family=Barlow:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes wsm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes wsm-progress{from{width:0%}to{width:100%}}
      `}</style>

      {/* BG scanlines */}
      <div style={{position:"absolute",inset:0,zIndex:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.12) 3px,rgba(0,0,0,0.12) 4px)",pointerEvents:"none"}}/>

      {/* BG red glow */}
      <div style={{position:"absolute",inset:0,zIndex:0,background:"radial-gradient(ellipse 75% 60% at 62% 55%,rgba(100,8,0,0.35) 0%,rgba(30,0,0,0.18) 40%,transparent 70%)",pointerEvents:"none"}}/>
      {/* BG logo watermark */}
      <div style={{position:"absolute",inset:0,zIndex:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        <img src="/wsm-logo.png" alt="" style={{width:"38%",maxWidth:440,opacity:0.055,filter:"grayscale(100%) brightness(3)",mixBlendMode:"luminosity"}} onError={e=>{e.target.style.display="none";}}/>
      </div>

      {/* NFS curved arc top */}
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:1,pointerEvents:"none"}}>
        <svg width="100%" height="180" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path d="M0,0 L1440,0 L1440,60 Q900,160 300,100 Q150,80 0,120 Z" fill="rgba(204,24,0,0.08)"/>
          <path d="M0,120 Q150,80 300,100 Q900,160 1440,60 L1440,66 Q900,168 300,108 Q150,88 0,126 Z" fill="rgba(204,24,0,0.15)"/>
          <path d="M0,124 Q150,84 300,104 Q900,164 1440,64" fill="none" stroke="rgba(204,24,0,0.7)" strokeWidth="2"/>
          <path d="M0,127 Q150,87 300,107 Q900,167 1440,67" fill="none" stroke="rgba(255,60,0,0.3)" strokeWidth="1"/>
        </svg>
      </div>

      {/* Logo globe top-left */}
      <div style={{position:"absolute",top:8,left:16,zIndex:10,width:130,height:130,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,rgba(80,0,0,0.7) 0%,rgba(20,0,0,0.9) 60%,rgba(0,0,0,0.95) 100%)",border:"2px solid rgba(204,24,0,0.6)",boxShadow:"0 0 20px rgba(204,24,0,0.4),inset 0 0 20px rgba(0,0,0,0.8)"}}/>
        <img src="/wsm-logo.png" alt="WSM" style={{width:96,height:96,objectFit:"contain",position:"relative",zIndex:2,filter:"drop-shadow(0 0 8px rgba(204,24,0,0.5))"}} onError={e=>{e.target.style.display="none";}}/>
      </div>

      {/* Title */}
      <div style={{position:"absolute",top:22,left:145,zIndex:10}}>
        <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(28px,3.8vw,58px)",fontWeight:900,fontStyle:"italic",color:B.white,textTransform:"uppercase",letterSpacing:"0.06em",lineHeight:1,textShadow:"2px 2px 0 #000,0 0 30px rgba(204,24,0,0.5)",margin:0,whiteSpace:"nowrap"}}>
          WHITE STRIPES <span style={{color:B.red,textShadow:"2px 2px 0 #000,0 0 30px rgba(255,34,0,0.8)"}}>MADNESS</span>
        </h1>
        <div style={{fontSize:"clamp(9px,1vw,12px)",fontWeight:700,letterSpacing:"0.45em",color:"rgba(255,255,255,0.3)",marginTop:5,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif"}}>CAR SELECTOR</div>
      </div>

      {/* Car name bar */}
      <div style={{position:"absolute",top:138,left:"50%",transform:"translateX(-50%)",zIndex:10,textAlign:"center"}}>
        <div style={{background:"linear-gradient(90deg,transparent,rgba(204,24,0,0.3) 20%,rgba(204,24,0,0.5) 50%,rgba(204,24,0,0.3) 80%,transparent)",border:"1px solid rgba(204,24,0,0.4)",padding:"6px 48px",borderRadius:2,position:"relative"}}>
          <div style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:0,height:0,borderTop:"6px solid transparent",borderBottom:"6px solid transparent",borderRight:`10px solid ${B.red}`,opacity:0.7}}/>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(14px,1.8vw,22px)",fontWeight:800,letterSpacing:"0.15em",color:B.white}}>
            {car.year} {car.make} {car.model}
          </span>
          <div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",width:0,height:0,borderTop:"6px solid transparent",borderBottom:"6px solid transparent",borderLeft:`10px solid ${B.red}`,opacity:0.7}}/>
        </div>
      </div>

      {/* Left panel */}
      <div style={{position:"absolute",top:200,left:0,zIndex:10,width:220}}>
        {PANELS.map(p=>{
          const active=panel===p;
          return(
            <div key={p} onClick={()=>{ panelCycleRef.current=false; setPanel(p); }} style={{marginBottom:4,cursor:"pointer",position:"relative",display:"flex",alignItems:"center"}}>
              <div style={{width:"100%",padding:"10px 20px 10px 28px",background:active?"linear-gradient(90deg,rgba(204,24,0,0.7),rgba(204,24,0,0.3) 70%,transparent)":"linear-gradient(90deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02) 70%,transparent)",borderTop:active?"1px solid rgba(204,24,0,0.6)":"1px solid rgba(255,255,255,0.06)",borderBottom:active?"1px solid rgba(204,24,0,0.3)":"1px solid rgba(0,0,0,0.3)",borderRight:"none",borderLeft:active?`3px solid ${B.red}`:"3px solid transparent",transition:"all 0.2s"}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:active?800:600,letterSpacing:"0.15em",color:active?B.white:"rgba(255,255,255,0.45)",textShadow:active?`0 0 12px ${B.red}`:undefined,transition:"all 0.2s"}}>{p}</span>
              </div>
              {active&&<div style={{position:"absolute",right:-1,top:"50%",transform:"translateY(-50%)",width:0,height:0,borderTop:"8px solid transparent",borderBottom:"8px solid transparent",borderLeft:`10px solid ${B.red}`}}/>}
            </div>
          );
        })}
        <div style={{marginTop:20,marginLeft:8}}>
          <div style={{padding:"7px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",display:"inline-block",cursor:"pointer"}}>
            <span style={{fontSize:13,letterSpacing:"0.2em",color:"rgba(255,255,255,0.35)",fontWeight:600}}>BACK...</span>
          </div>
        </div>
      </div>

      {/* Panel content */}
      <div style={{position:"absolute",top:185,left:230,right:16,zIndex:10,maxWidth:420}}>
        {panel==="STATS"&&(
          <div key={car.id+"stats"}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.35em",color:B.red,marginBottom:16,textShadow:`0 0 10px ${B.red}`}}>GENERAL</div>
            {[["ENGINE",car.displacement],["OUTPUT",car.hp],["TORQUE",car.torque],["CONFIG",car.config],["STATUS",car.status],["WEIGHT",car.weight]].map(([lbl,val],i)=>(
              <StatRow key={lbl} label={lbl} val={val} delay={120+i*110}/>
            ))}
          </div>
        )}
        {panel==="SPECS"&&(
          <div key={car.id+"specs"}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.35em",color:B.red,marginBottom:16,textShadow:`0 0 10px ${B.red}`}}>PERFORMANCE</div>
            {Object.entries(car.stats).map(([k,v],i)=>(
              <StatBar key={car.id+k} label={k.toUpperCase()} value={v} delay={i*130}/>
            ))}
          </div>
        )}
        {panel==="HISTORY"&&(
          <div>
            <div style={{fontSize:13,fontWeight:800,letterSpacing:"0.3em",color:B.red,marginBottom:14,textShadow:`0 0 10px ${B.red}`}}>HISTORY</div>
            <p style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.7,margin:"0 0 12px"}}>{car.desc}</p>
            {[["MAKE",car.make],["MODEL",car.model],["YEAR",car.year],["NICKNAME",car.nickname]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6,borderBottom:"1px solid rgba(255,255,255,0.04)",paddingBottom:4}}>
                <span style={{fontSize:13,color:"rgba(255,255,255,0.4)",fontWeight:600,letterSpacing:"0.1em"}}>{l}</span>
                <span style={{fontSize:13,color:B.white,fontWeight:700,letterSpacing:"0.06em",fontStyle:"italic"}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {panel==="EPISODES"&&(
          <div>
            <div style={{fontSize:13,fontWeight:800,letterSpacing:"0.3em",color:B.red,marginBottom:14,textShadow:`0 0 10px ${B.red}`}}>FEATURED EPISODES</div>
            {car.episodes.map((ep,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer"}}
                onMouseEnter={e=>{e.currentTarget.style.paddingLeft="8px";}}
                onMouseLeave={e=>{e.currentTarget.style.paddingLeft="0px";}}>
                <div style={{width:4,height:4,background:B.red,borderRadius:"50%",flexShrink:0,boxShadow:`0 0 6px ${B.red}`}}/>
                <span style={{fontSize:13,color:"rgba(255,255,255,0.55)",letterSpacing:"0.06em",fontWeight:600}}>{ep}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3D CAR — DOMINANTA + ANAMORPHIC BILLBOARD ── */}
      <div style={{
        position:"absolute",left:"18%",right:0,top:"28%",bottom:"80px",
        zIndex:5,perspective:"800px",perspectiveOrigin:"50% 60%",
        overflow:"visible",pointerEvents:"none",
      }}>
        <div style={{
          width:"100%",height:"100%",pointerEvents:"all",
          transform:`scale(${anamScale}) translateZ(${anamZ}px)`,
          transition:anamZ===0&&anamScale===1?"transform 0.4s ease-in":"none",
          transformOrigin:"50% 65%",
          filter:anamGlow>0.05
            ?`drop-shadow(0 0 ${Math.round(anamGlow*40)}px rgba(204,24,0,${(anamGlow*0.7).toFixed(2)})) drop-shadow(0 ${Math.round(anamGlow*20)}px ${Math.round(anamGlow*30)}px rgba(0,0,0,${(anamGlow*0.8).toFixed(2)}))`
            :"none",
          willChange:"transform,filter",
        }}>
          {/* key={car.id} removed — we keep ONE viewer instance, scene swap handles the change */}
          <Car3DViewer car={car}/>
        </div>
        {/* Checkerboard disc — sits at floor level behind the car */}
        <div style={{
          position:"absolute",
          bottom:"4%", left:"10%", right:"10%",
          height:0, paddingBottom:"38%",
          zIndex:0, pointerEvents:"none",
          transform:"perspective(600px) rotateX(72deg)",
          transformOrigin:"50% 100%",
          overflow:"hidden",
          borderRadius:"50%",
        }}>
          <svg
            width="100%" height="100%"
            style={{position:"absolute",inset:0}}
            viewBox="0 0 400 400"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="chkPat" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect x="0"  y="0"  width="20" height="20" fill="rgba(255,255,255,0.055)"/>
                <rect x="20" y="20" width="20" height="20" fill="rgba(255,255,255,0.055)"/>
                <rect x="20" y="0"  width="20" height="20" fill="rgba(0,0,0,0.18)"/>
                <rect x="0"  y="20" width="20" height="20" fill="rgba(0,0,0,0.18)"/>
              </pattern>
              <radialGradient id="chkFade" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#000" stopOpacity="0"/>
                <stop offset="72%"  stopColor="#000" stopOpacity="0"/>
                <stop offset="100%" stopColor="#000" stopOpacity="1"/>
              </radialGradient>
            </defs>
            <ellipse cx="200" cy="200" rx="200" ry="200" fill="url(#chkPat)"/>
            <ellipse cx="200" cy="200" rx="200" ry="200" fill="url(#chkFade)"/>
          </svg>
        </div>
        {/* Anamorphic glow shadow */}
        {anamGlow>0.05&&(
          <div style={{position:"absolute",bottom:"-8%",left:"15%",right:"15%",height:`${Math.round(anamGlow*24)}px`,background:`radial-gradient(ellipse,rgba(204,24,0,${(anamGlow*0.4).toFixed(2)}) 0%,transparent 70%)`,borderRadius:"50%",pointerEvents:"none",filter:"blur(8px)",transform:`scaleX(${1+anamGlow*0.3})`}}/>
        )}
      </div>

      {/* Drag hint */}
      <div style={{position:"absolute",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:10,fontSize:8,letterSpacing:"0.3em",color:"rgba(255,255,255,0.15)",fontWeight:700,pointerEvents:"none"}}>
        DRAG TO ROTATE
      </div>

      {/* Auto-cycle progress bar */}
      <div style={{position:"absolute",bottom:72,left:0,right:0,height:2,background:"rgba(255,255,255,0.04)",zIndex:25}}>
        <div key={carIdx} style={{height:"100%",background:`linear-gradient(90deg,${B.redDim},${B.red},${B.redHot})`,boxShadow:`0 0 8px ${B.red}`,animation:`wsm-progress ${AUTO_INTERVAL}ms linear forwards`,width:"0%"}}/>
      </div>

      {/* Bottom bar */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:72,background:"linear-gradient(180deg,transparent,rgba(0,0,0,0.95) 30%,#000 100%)",borderTop:"1px solid rgba(204,24,0,0.25)",zIndex:20,display:"flex",alignItems:"center",padding:"0 0 0 220px"}}>
        {/* Counter left */}
        <div style={{flexShrink:0,display:"flex",alignItems:"center",paddingLeft:24,gap:10}}>
          <span style={{fontSize:11,letterSpacing:"0.3em",color:"rgba(255,255,255,0.2)",fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif"}}>
            {String(carIdx+1).padStart(2,"0")} <span style={{color:"rgba(255,255,255,0.1)"}}>/ {String(CARS.length).padStart(2,"0")}</span>
          </span>
        </div>

        {/* Car buttons — horizontally scrollable for many cars */}
        <div style={{flex:1,display:"flex",height:"100%",overflowX:"auto",scrollbarWidth:"none",msOverflowStyle:"none"}}>
          {CARS.map((c,i)=>{
            const active=i===carIdx;
            // Shorten label: show model name, max 2 words
            const label = c.model.split(" ").slice(0,2).join(" ");
            return(
              <div key={c.id} onClick={()=>handleSelect(i)}
                style={{
                  flexShrink:0,
                  padding:"0 clamp(16px,2vw,32px)",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  cursor:"pointer",
                  background:active?"linear-gradient(180deg,rgba(204,24,0,0.5),rgba(204,24,0,0.2))":"linear-gradient(180deg,rgba(255,255,255,0.04),transparent)",
                  borderLeft:"1px solid rgba(255,255,255,0.06)",
                  borderTop:active?`2px solid ${B.red}`:"2px solid transparent",
                  transition:"all 0.2s",
                  minWidth:"clamp(90px,10vw,140px)",
                  position:"relative",
                }}
                onMouseEnter={e=>{if(!active)e.currentTarget.style.background="linear-gradient(180deg,rgba(204,24,0,0.12),transparent)";}}
                onMouseLeave={e=>{if(!active)e.currentTarget.style.background="linear-gradient(180deg,rgba(255,255,255,0.04),transparent)";}}>
                {active&&<div style={{position:"absolute",top:-1,left:0,right:0,height:2,background:B.red,boxShadow:`0 0 12px ${B.red}`}}/>}
                <span style={{
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:"clamp(12px,1.5vw,18px)",fontWeight:900,
                  letterSpacing:"0.12em",
                  color:active?B.white:"rgba(255,255,255,0.35)",
                  textShadow:active?`0 0 16px ${B.red},0 0 30px rgba(204,24,0,0.4)`:undefined,
                  transition:"all 0.2s", whiteSpace:"nowrap",
                }}>{label}</span>
                <span style={{
                  fontSize:"clamp(7px,0.9vw,9px)",letterSpacing:"0.2em",
                  color:active?B.red:"rgba(255,255,255,0.18)",
                  fontWeight:700,marginTop:2,fontFamily:"'Barlow Condensed',sans-serif",
                  transition:"color 0.2s",
                }}>{c.year}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── QR OVERLAY ── */}
      {showQR && (
        <div style={{
          position:"absolute", bottom:90, right:20, zIndex:50,
          display:"flex", flexDirection:"column", alignItems:"center", gap:6,
        }}>
          <div style={{
            background:"rgba(8,8,8,0.92)",
            border:`1px solid rgba(204,24,0,0.4)`,
            borderRadius:6, padding:14,
            display:"flex", flexDirection:"column", alignItems:"center", gap:10,
            backdropFilter:"blur(8px)",
            boxShadow:`0 0 24px rgba(204,24,0,0.2)`,
          }}>
            {/* Stripe */}
            <div style={{display:"flex",width:"100%",height:3,borderRadius:1}}>
              <div style={{flex:1,background:B.red}}/><div style={{flex:1,background:B.white}}/><div style={{flex:1,background:B.red}}/>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,letterSpacing:"0.3em",fontWeight:800,color:"rgba(255,255,255,0.45)",textTransform:"uppercase"}}>
              SKENUJ A POZRI SI TO
            </div>
            {/* QR code canvas */}
            <QRCode url={qrUrl} size={120}/>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:"0.15em",fontWeight:900,color:B.red,textTransform:"uppercase"}}>
              @whitestripesmadness
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.35)" stroke="none"/>
              </svg>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,letterSpacing:"0.15em",color:"rgba(255,255,255,0.25)",fontWeight:700}}>INSTAGRAM · YOUTUBE</span>
            </div>
          </div>
          <button onClick={()=>setShowQR(false)} style={{
            background:"none",border:"none",cursor:"pointer",
            fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:8,letterSpacing:"0.2em",color:"rgba(255,255,255,0.15)",fontWeight:700,
          }}>SKRYŤ ×</button>
        </div>
      )}

      {/* Corner decorations */}
      <div style={{position:"absolute",top:0,right:0,zIndex:2,pointerEvents:"none"}}>
        <svg width="200" height="80" viewBox="0 0 200 80">
          <path d="M200,0 L200,80 L80,0 Z" fill="rgba(204,24,0,0.06)"/>
          <line x1="80" y1="0" x2="200" y2="80" stroke="rgba(204,24,0,0.2)" strokeWidth="1"/>
        </svg>
      </div>
      <div style={{position:"absolute",bottom:72,left:0,zIndex:2,pointerEvents:"none"}}>
        <svg width="160" height="60" viewBox="0 0 160 60">
          <path d="M0,60 L0,0 L100,60 Z" fill="rgba(204,24,0,0.05)"/>
          <line x1="0" y1="0" x2="100" y2="60" stroke="rgba(204,24,0,0.15)" strokeWidth="1"/>
        </svg>
      </div>
    </div>
  );
}
