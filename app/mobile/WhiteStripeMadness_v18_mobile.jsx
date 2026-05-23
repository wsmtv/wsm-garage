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

const AUTO_INTERVAL = 9000;
const PANELS = ["STATS", "SPECS", "HISTORY"];
const IG_URL  = "https://instagram.com/whitestripesmadness";

// ─── CARS ─────────────────────────────────────────────────────────────────────
const CARS = [
  {
    id:1, key:"corvette",
    make:"CHEVROLET", model:"CORVETTE", year:"1968", nickname:"THE STINGRAY",
    displacement:"427 CU IN", hp:"435 BHP", torque:"460 LB·FT",
    config:"V8 · BIG BLOCK", weight:"3,195 LBS", status:"OWNED",
    shape:"scan", plyPath:null, glbPath:null,
    stats:{ power:92, torque:88, handling:74, rawness:95, sound:97 },
    desc:"Coke-bottle curves. Side-pipe snarl. Black as midnight.",
  },
  {
    id:2, key:"nova",
    make:"CHEVROLET", model:"NOVA", year:"1974", nickname:"THE SLEEPER",
    displacement:"383 CU IN", hp:"~400 BHP", torque:"420 LB·FT",
    config:"383 STROKER · SBC", weight:"3,420 LBS", status:"OWNED",
    shape:"scan", plyPath:null, glbPath:null,
    stats:{ power:82, torque:88, handling:68, rawness:95, sound:97 },
    desc:"Candy red. Twin white stripes. War crime at idle.",
  },
  {
    id:4, key:"caprice",
    make:"CHEVROLET", model:"CAPRICE", year:"1975", nickname:"THE CRUISER",
    displacement:"400 CU IN", hp:"175 BHP", torque:"305 LB·FT",
    config:"V8 · SMALL BLOCK", weight:"4,215 LBS", status:"OWNED",
    shape:"scan", plyPath:null, glbPath:"/models/caprice.glb",
    stats:{ power:68, torque:72, handling:55, rawness:78, sound:82 },
    desc:"Full-size American iron. The kind of car that owns every road.",
  },
  {
    id:3, key:"sbc",
    make:"CHEVROLET", model:"383 STROKER", year:"SBC", nickname:"THE HEART",
    displacement:"383 CU IN", hp:"~430 BHP", torque:"450 LB·FT",
    config:"SMALL BLOCK · STROKER", weight:"575 LBS", status:"BUILT",
    shape:"engine", plyPath:null, glbPath:"/models/engine-block.glb",
    stats:{ power:88, torque:94, rawness:99, sound:98 },
    desc:"350 block bored .030 over. 400 crank. Eagle rods.",
  },
];

// ─── SHAPE CFG ────────────────────────────────────────────────────────────────
const SHAPE_CFG = {
  scan:    { camY:0.20, camZ:3.8, lookY:0.10, meshY:-0.30, ringY:-0.50, fov:34 },
  engine:  { camY:0.30, camZ:4.2, lookY:0.12, meshY:-0.20, ringY:-0.60, fov:36 },
  caprice: { camY:0.15, camZ:4.2, lookY:0.06, meshY:-0.60, ringY:-0.62, fov:32 },
};

// ─── SCENE CACHE ──────────────────────────────────────────────────────────────
const sceneCache = {};
const gltfCache  = {};

function buildScanPlaceholder(){
  const g = new THREE.Group();
  const geo = new THREE.OctahedronGeometry(0.8, 0);
  g.add(new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({ color:0xCC1800, transparent:true, opacity:0.5 })
  ));
  g.add(new THREE.Mesh(geo.clone(),
    new THREE.MeshStandardMaterial({ color:0x1a0500, metalness:0.8, roughness:0.4 })
  ));
  return g;
}

function addLights(scene){
  scene.add(new THREE.AmbientLight(0x111008, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(3, 9, 4); key.castShadow = true; scene.add(key);
  const fill = new THREE.DirectionalLight(0x330808, 0.6);
  fill.position.set(-5, 2, -3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(0, 2, -8); scene.add(rim);
  const red = new THREE.PointLight(0xcc1800, 2.5, 6);
  red.position.set(0,-1.2,0); scene.add(red);
  const spot = new THREE.SpotLight(0xffffff, 4.0, 14, Math.PI/4, 0.5);
  spot.position.set(0,8,0); scene.add(spot);
}

function positionModel(model, cfg){
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const scale  = 3.2 / Math.max(size.x, size.y, size.z);
  model.position.sub(center);
  model.scale.setScalar(scale);
  model.position.y = cfg.meshY + (size.y * scale / 2);
}

function buildSceneForCar(car){
  if(sceneCache[car.id]) return sceneCache[car.id];
  const cfg = SHAPE_CFG[car.key] || SHAPE_CFG[car.shape] || SHAPE_CFG.scan;
  const scene = new THREE.Scene();
  addLights(scene);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 1.9, 64),
    new THREE.MeshBasicMaterial({ color:0xcc1800, transparent:true, opacity:0.10, side:THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI/2;
  ring.position.y = cfg.ringY;
  scene.add(ring);

  // Checkerboard disc
  const checkerCanvas = document.createElement("canvas");
  checkerCanvas.width = checkerCanvas.height = 256;
  const ctx = checkerCanvas.getContext("2d");
  const sq = 32;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    ctx.fillStyle = (r+c)%2===0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.16)";
    ctx.fillRect(c*sq, r*sq, sq, sq);
  }
  // radial fade
  const grad = ctx.createRadialGradient(128,128,60,128,128,128);
  grad.addColorStop(0,"rgba(0,0,0,0)");
  grad.addColorStop(0.7,"rgba(0,0,0,0)");
  grad.addColorStop(1,"rgba(8,8,8,1)");
  ctx.fillStyle = grad; ctx.fillRect(0,0,256,256);
  const checkerTex = new THREE.CanvasTexture(checkerCanvas);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 64),
    new THREE.MeshBasicMaterial({ map:checkerTex, transparent:true, opacity:0.9 })
  );
  disc.rotation.x = -Math.PI/2;
  disc.position.y = cfg.ringY + 0.005;
  scene.add(disc);

  const camera = new THREE.PerspectiveCamera(cfg.fov, 9/16, 0.1, 100);
  camera.position.set(0, cfg.camY, cfg.camZ);
  camera.lookAt(0, cfg.lookY, 0);

  const mesh = buildScanPlaceholder();
  mesh.position.y = cfg.meshY;
  scene.add(mesh);

  const entry = { scene, camera, ring, disc, mesh, rotY:-0.6, rotX:0 };
  sceneCache[car.id] = entry;

  const modelPath = car.plyPath || car.glbPath;
  if(modelPath && typeof window !== "undefined"){
    const absUrl = window.location.origin + (modelPath.startsWith("/") ? modelPath : "/"+modelPath);
    const isPLY  = modelPath.toLowerCase().endsWith(".ply");
    if(isPLY){
      new PLYLoader().load(absUrl, (raw)=>{
        let geo = raw;
        try{
          const col = geo.getAttribute("color");
          if(col) geo.deleteAttribute("color");
          geo = mergeVertices(geo, 1e-4);
          if(col) geo.setAttribute("color", col);
        }catch(e){ geo = raw; }
        geo.computeVertexNormals();
        const hasC = geo.hasAttribute("color");
        const mat  = hasC
          ? new THREE.MeshStandardMaterial({ vertexColors:true, metalness:0.05, roughness:0.75, color:new THREE.Color(1.15,1.15,1.15) })
          : new THREE.MeshStandardMaterial({ color:"#999", metalness:0.25, roughness:0.65 });
        const model = new THREE.Mesh(geo, mat);
        model.castShadow = model.receiveShadow = true;
        positionModel(model, cfg);
        gltfCache[modelPath] = model;
        if(sceneCache[car.id]){
          sceneCache[car.id].scene.remove(sceneCache[car.id].mesh);
          sceneCache[car.id].scene.add(model);
          sceneCache[car.id].mesh = model;
        }
      }, null, ()=>{});
    } else {
      const loader = new GLTFLoader();
      loader.load(absUrl, (gltf)=>{
        const model = gltf.scene;
        positionModel(model, cfg);
        model.traverse(c=>{
          if(c.isMesh){
            c.castShadow = c.receiveShadow = true;
            // Keep original scan materials — only touch meshes with NO texture at all
            if(c.material){
              const hasAnyMap = c.material.map || c.material.normalMap
                || c.material.roughnessMap || c.material.metalnessMap;
              if(!hasAnyMap){
                c.material.metalness = 0.2;
                c.material.roughness = 0.8;
              }
            }
          }
        });
        gltfCache[modelPath] = model;
        if(sceneCache[car.id]){
          sceneCache[car.id].scene.remove(sceneCache[car.id].mesh);
          sceneCache[car.id].scene.add(model);
          sceneCache[car.id].mesh = model;
        }
      }, null, ()=>{});
    }
  }
  return entry;
}

// ─── 3D VIEWER ────────────────────────────────────────────────────────────────
function Car3DViewer({ car }){
  const mountRef = useRef(null);
  const rafRef   = useRef(null);
  const rendRef  = useRef(null);
  const dragRef  = useRef({ isDrag:false, lastX:0, lastY:0 });

  useEffect(()=>{
    const el = mountRef.current; if(!el) return;
    const W = el.clientWidth||390, H = el.clientHeight||340;
    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    rendRef.current = renderer;
    CARS.forEach(c => buildSceneForCar(c));
    return ()=>{ cancelAnimationFrame(rafRef.current); renderer.dispose(); };
  }, []);

  useEffect(()=>{
    cancelAnimationFrame(rafRef.current);
    const renderer = rendRef.current; if(!renderer) return;
    const entry = sceneCache[car.id]; if(!entry) return;
    const el = mountRef.current;
    if(el){
      const W = el.clientWidth||390, H = el.clientHeight||340;
      const cfg = SHAPE_CFG[car.key] || SHAPE_CFG[car.shape] || SHAPE_CFG.scan;
      entry.camera.aspect = W/H;
      entry.camera.updateProjectionMatrix();
      renderer.setSize(W, H);
      entry.camera.position.set(0, cfg.camY, cfg.camZ);
      entry.camera.lookAt(0, cfg.lookY, 0);
    }
    const drag = dragRef.current;
    const tick = ()=>{
      rafRef.current = requestAnimationFrame(tick);
      if(!drag.isDrag) entry.rotY += 0.007;
      entry.mesh.rotation.y = entry.rotY;
      entry.mesh.rotation.x = entry.rotX;
      entry.ring.rotation.z += 0.002;
      renderer.render(entry.scene, entry.camera);
    };
    tick();
  }, [car.id]);

  const dn = e=>{
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    dragRef.current = { isDrag:true, lastX:x, lastY:y, moved:false };
  };
  const mv = e=>{
    if(!dragRef.current.isDrag) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    const dx = x - dragRef.current.lastX;
    const dy = y - dragRef.current.lastY;
    if(Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    const entry = sceneCache[car.id];
    if(entry){
      entry.rotY += dx * 0.014;
      // Clamp vertical rotation so model doesn't flip upside down
      entry.rotX = Math.max(-Math.PI/2, Math.min(Math.PI/2, entry.rotX + dy * 0.014));
    }
    dragRef.current.lastX = x;
    dragRef.current.lastY = y;
    e.stopPropagation(); // prevent swipe while rotating
  };
  const up = ()=>{ dragRef.current.isDrag = false; };

  return (
    <div ref={mountRef}
      onMouseDown={dn} onMouseMove={mv} onMouseUp={up} onMouseLeave={up}
      onTouchStart={dn} onTouchMove={mv} onTouchEnd={up}
      style={{ width:"100%", height:"100%", cursor:"grab", touchAction:"none" }}
    />
  );
}

// ─── STAT BAR ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, delay }){
  const [pct, setPct] = useState(0);
  useEffect(()=>{
    setPct(0);
    const t = setTimeout(()=>setPct(value), delay+60);
    return ()=>clearTimeout(t);
  }, [value, delay]);
  return(
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:10, letterSpacing:"0.22em", color:B.muted, fontWeight:700 }}>{label}</span>
        <span style={{ fontSize:16, fontWeight:900, color:B.white }}>{value}</span>
      </div>
      <div style={{ height:2, background:"rgba(255,255,255,0.08)", borderRadius:1 }}>
        <div style={{
          height:"100%", width:`${pct}%`, borderRadius:1,
          background:`linear-gradient(90deg,${B.redDim},${B.red})`,
          transition:"width 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
          boxShadow:`0 0 6px ${B.red}`,
        }}/>
      </div>
    </div>
  );
}

// ─── FOLLOW SCREEN ────────────────────────────────────────────────────────────
function FollowScreen({ onBack }){
  const [tapped, setTapped] = useState(false);
  const go = ()=>{
    setTapped(true);
    setTimeout(()=> window.open(IG_URL, "_blank"), 300);
  };
  return(
    <div style={{
      position:"absolute", inset:0, zIndex:100,
      background:"#080808",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:32, textAlign:"center",
    }}>
      {/* Top stripe */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:4, display:"flex" }}>
        <div style={{ flex:1, background:B.red }}/>
        <div style={{ flex:1, background:B.white }}/>
        <div style={{ flex:1, background:B.red }}/>
      </div>

      {/* Logo */}
      <img src="/wsm-logo.png" alt="WSM"
        style={{ width:110, height:110, objectFit:"contain", marginBottom:24,
          filter:"drop-shadow(0 0 16px rgba(204,24,0,0.5))" }}
        onError={e=>{ e.target.style.display="none"; }}
      />

      {/* Headline */}
      <h1 style={{
        fontFamily:"'Barlow Condensed',sans-serif",
        fontSize:42, fontWeight:900, fontStyle:"italic",
        color:B.white, textTransform:"uppercase",
        letterSpacing:"0.04em", lineHeight:0.9,
        margin:"0 0 8px",
      }}>
        WHITE STRIPES<br/>
        <span style={{ color:B.red }}>MADNESS</span>
      </h1>

      <p style={{
        fontFamily:"'Barlow',sans-serif",
        fontSize:14, color:"rgba(255,255,255,0.4)",
        lineHeight:1.6, margin:"16px 0 36px",
        maxWidth:280,
      }}>
        V8 engines. Cold starts. Classic iron.<br/>Follow us for more raw automotive content.
      </p>

      {/* Stars */}
      <div style={{ display:"flex", gap:8, marginBottom:32 }}>
        {[...Array(5)].map((_,i)=>(
          <svg key={i} width="14" height="14" viewBox="0 0 10 10">
            <polygon points="5,0 6.2,3.8 10,3.8 7,6.1 8.2,10 5,7.6 1.8,10 3,6.1 0,3.8 3.8,3.8" fill={B.red}/>
          </svg>
        ))}
      </div>

      {/* Instagram CTA */}
      <button onClick={go} style={{
        width:"100%", maxWidth:320, padding:"18px 0",
        background: tapped ? B.redDim : B.red,
        border:"none", borderRadius:3, cursor:"pointer",
        fontFamily:"'Barlow Condensed',sans-serif",
        fontSize:16, fontWeight:900, letterSpacing:"0.2em",
        color:B.white, textTransform:"uppercase",
        boxShadow:`0 0 28px rgba(204,24,0,0.45)`,
        transition:"background 0.2s, transform 0.15s",
        transform: tapped ? "scale(0.97)" : "scale(1)",
        display:"flex", alignItems:"center", justifyContent:"center", gap:12,
      }}>
        {/* Instagram icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"/>
        </svg>
        Sleduj @whitestripesmadness
      </button>

      <p style={{ fontSize:11, letterSpacing:"0.2em", color:"rgba(255,255,255,0.2)", marginTop:20, fontWeight:700 }}>
        @WHITESTRIPESMADNESS
      </p>

      {/* Back */}
      <button onClick={onBack} style={{
        marginTop:28, background:"none", border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:2, padding:"10px 28px", cursor:"pointer",
        fontFamily:"'Barlow Condensed',sans-serif",
        fontSize:11, letterSpacing:"0.25em", color:"rgba(255,255,255,0.3)",
        fontWeight:700,
      }}>← SPÄŤ NA AUTÁ</button>

      {/* Bottom stripe */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:4, display:"flex" }}>
        <div style={{ flex:1, background:B.red }}/>
        <div style={{ flex:1, background:B.white }}/>
        <div style={{ flex:1, background:B.red }}/>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function WhiteStripeMadnessMobile(){
  const [carIdx,     setCarIdx]     = useState(0);
  const [panel,      setPanel]      = useState("STATS");
  const [showFollow,  setShowFollow]  = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [installEvt,  setInstallEvt]  = useState(null);  // beforeinstallprompt event

  // swipe
  const touchStart = useRef(null);
  const car = CARS[carIdx];

  // Capture PWA install prompt event (Android Chrome)
  useEffect(()=>{
    const handler = e => {
      e.preventDefault();
      setInstallEvt(e);
      setShowInstall(true); // show our custom install banner
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async () => {
    if(installEvt){
      // Android — use native prompt
      installEvt.prompt();
      const { outcome } = await installEvt.userChoice;
      if(outcome === 'accepted') setShowInstall(false);
    } else {
      // iOS Safari — show manual instructions
      setShowIOSGuide(true);
    }
  };

  const [showIOSGuide, setShowIOSGuide] = useState(false);
  
  // Show install banner after 3s if not already installed
  useEffect(()=>{
    // Don't show if already running as PWA
    if(window.matchMedia('(display-mode: standalone)').matches) return;
    const t = setTimeout(()=> setShowInstall(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Mobile: NO auto-cycle — user controls manually
  const goTo = i=>{
    if(i === carIdx) return;
    setCarIdx(i);
  };

  // Swipe handler
  const onTouchStart = e => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = e => {
    if(touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if(Math.abs(dx) < 60) return; // higher threshold to avoid accidental swipe
    if(dx < 0) {
      // swipe left → next
      const next = (carIdx + 1) % CARS.length;
      if(carIdx === CARS.length - 1) setShowFollow(true);
      else goTo(next);
    } else {
      // swipe right → prev
      goTo((carIdx - 1 + CARS.length) % CARS.length);
    }
  };

  return(
    <div style={{
      width:"100vw", height:"100dvh", overflow:"hidden",
      background:B.bg, color:B.white,
      fontFamily:"'Barlow Condensed',sans-serif",
      position:"relative", userSelect:"none",
      display:"flex", flexDirection:"column",
    }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Barlow:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes wsm-progress{from{width:0%}to{width:100%}}
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { margin:0; padding:0; overflow:hidden; }
      `}</style>

      {/* Follow screen overlay */}
      {showFollow && <FollowScreen onBack={()=>{ setShowFollow(false); setCarIdx(0); }}/>}

      {/* ── iOS INSTALL GUIDE ── */}
      {showIOSGuide && (
        <div style={{position:"absolute",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",padding:"0 0 40px"}}>
          <div style={{background:"#111",border:`1px solid ${B.red}`,borderRadius:12,padding:24,maxWidth:320,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:800,letterSpacing:"0.15em",color:B.white,marginBottom:16}}>PRIDAJ NA PLOCHU</div>
            {/* Step 1 */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,textAlign:"left"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:B.red,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14,fontWeight:900,color:B.white}}>1</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>Klikni na <strong style={{color:B.white}}>Zdieľať</strong> tlačidlo dole v Safari <span style={{fontSize:18}}>⎦↑</span></div>
            </div>
            {/* Step 2 */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,textAlign:"left"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:B.red,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14,fontWeight:900,color:B.white}}>2</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>Vyber <strong style={{color:B.white}}>"Pridať na plochu"</strong> <span style={{fontSize:16}}>＋</span></div>
            </div>
            {/* Step 3 */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,textAlign:"left"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:B.red,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14,fontWeight:900,color:B.white}}>3</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>Klikni <strong style={{color:B.white}}>"Pridať"</strong> — appka sa objaví na ploche</div>
            </div>
            <button onClick={()=>setShowIOSGuide(false)} style={{width:"100%",padding:"12px 0",background:B.red,border:"none",borderRadius:3,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:900,letterSpacing:"0.2em",color:B.white,cursor:"pointer"}}>
              ROZUMIEM
            </button>
          </div>
          {/* Arrow pointing down to Safari bar */}
          <div style={{marginTop:16,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,letterSpacing:"0.2em",color:"rgba(255,255,255,0.4)",fontWeight:700}}>ZDIEĽAŤ JE TU DOLE</span>
            <span style={{fontSize:24,color:B.red}}>↓</span>
          </div>
        </div>
      )}

      {/* ── INSTALL BANNER ── */}
      {showInstall && !showFollow && !showIOSGuide && !window?.matchMedia?.('(display-mode: standalone)')?.matches && (
        <div style={{
          position:"absolute", bottom:70, left:12, right:12, zIndex:60,
          background:"linear-gradient(135deg,#111,#1a0500)",
          border:`1px solid rgba(204,24,0,0.5)`,
          borderRadius:8, padding:"14px 16px",
          display:"flex", alignItems:"center", gap:12,
          boxShadow:`0 0 20px rgba(204,24,0,0.25)`,
        }}>
          <img src="/wsm-logo.png" alt="WSM" style={{width:44,height:44,objectFit:"contain",flexShrink:0,filter:"drop-shadow(0 0 6px rgba(204,24,0,0.5))"}} onError={e=>{e.target.style.display="none";}}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:900,color:B.white,letterSpacing:"0.08em"}}>PRIDAJ NA PLOCHU</div>
            <div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:2}}>Otvor kedykoľvek ako normálnu appku</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <button onClick={triggerInstall} style={{
              padding:"8px 14px", background:B.red, border:"none", borderRadius:3,
              fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:900,
              letterSpacing:"0.15em", color:B.white, cursor:"pointer", whiteSpace:"nowrap",
            }}>INŠTALOVAŤ</button>
            <button onClick={()=>setShowInstall(false)} style={{
              padding:"4px 14px", background:"none",
              border:"1px solid rgba(255,255,255,0.1)", borderRadius:3,
              fontFamily:"'Barlow Condensed',sans-serif", fontSize:9,
              letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", cursor:"pointer",
            }}>NESKÔR</button>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{ flexShrink:0 }}>
        <div style={{ height:4, display:"flex" }}>
          <div style={{ flex:1, background:B.red }}/>
          <div style={{ flex:1, background:B.white }}/>
          <div style={{ flex:1, background:B.red }}/>
        </div>
        <div style={{
          padding:"10px 16px",
          display:"flex", alignItems:"center", gap:12,
          background:"rgba(0,0,0,0.6)",
          borderBottom:`1px solid ${B.dim}`,
        }}>
          <img src="/wsm-logo.png" alt="WSM"
            style={{ width:36, height:36, objectFit:"contain",
              filter:"drop-shadow(0 0 6px rgba(204,24,0,0.5))" }}
            onError={e=>{ e.target.style.display="none"; }}
          />
          <div>
            <div style={{ fontSize:18, fontWeight:900, fontStyle:"italic",
              letterSpacing:"0.06em", color:B.white, lineHeight:1,
              textShadow:`0 0 16px rgba(204,24,0,0.4)` }}>
              WHITE STRIPES <span style={{ color:B.red }}>MADNESS</span>
            </div>
            <div style={{ fontSize:8, letterSpacing:"0.4em", color:"rgba(255,255,255,0.3)", fontWeight:700 }}>
              CAR SELECTOR
            </div>
          </div>
          <div style={{ flex:1 }}/>
          {/* Follow button — top right */}
          <button onClick={()=>setShowFollow(true)} style={{
            background:B.red, border:"none", borderRadius:2,
            padding:"7px 14px", cursor:"pointer",
            fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:10, fontWeight:900, letterSpacing:"0.15em", color:B.white,
          }}>FOLLOW</button>
        </div>
      </div>

      {/* ── 3D VIEWER ── */}
      <div style={{ flex:"0 0 44%", position:"relative", background:"#050505" }}>
        {/* BG glow */}
        <div style={{ position:"absolute", inset:0,
          background:"radial-gradient(ellipse 80% 60% at 50% 55%,rgba(80,5,0,0.35) 0%,transparent 70%)",
          pointerEvents:"none" }}/>
        <Car3DViewer car={car}/>
        {/* Drag hint */}
        <div style={{
          position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)",
          fontSize:8, letterSpacing:"0.25em", color:"rgba(255,255,255,0.15)",
          fontWeight:700, pointerEvents:"none",
        }}>DRAG TO ROTATE · SWIPE TO CHANGE</div>
      </div>

      {/* ── CAR IDENTITY ── */}
      <div style={{
        flexShrink:0, padding:"10px 16px 8px",
        borderBottom:`1px solid ${B.dim}`,
        background:"rgba(0,0,0,0.4)",
      }}>
        <div style={{ fontSize:8, letterSpacing:"0.35em", color:B.red, fontWeight:800, marginBottom:2 }}>
          {car.make} · {car.year}
        </div>
        <div style={{
          fontSize:34, fontWeight:900, letterSpacing:"0.03em",
          textTransform:"uppercase", lineHeight:0.9, color:B.white,
        }}>{car.model}</div>
        <div style={{ fontSize:11, letterSpacing:"0.25em", color:"rgba(255,255,255,0.35)",
          fontStyle:"italic", marginTop:3 }}>"{car.nickname}"</div>

        {/* Spec pills */}
        <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
          {[[car.displacement],[car.hp],[car.config]].map(([v],i)=>(
            <div key={i} style={{
              padding:"3px 10px",
              background:"rgba(204,24,0,0.12)",
              border:`1px solid rgba(204,24,0,0.3)`,
              borderRadius:2, fontSize:10, fontWeight:700,
              letterSpacing:"0.08em", color:"rgba(255,255,255,0.7)",
            }}>{v}</div>
          ))}
        </div>
      </div>

      {/* ── PANEL TABS ── */}
      <div style={{ flexShrink:0, display:"flex", borderBottom:`1px solid ${B.dim}` }}>
        {PANELS.map(p=>{
          const active = panel === p;
          return(
            <button key={p} onClick={()=>setPanel(p)}
              style={{
                flex:1, padding:"9px 0",
                background:active ? "rgba(204,24,0,0.15)" : "transparent",
                border:"none", borderTop:`2px solid ${active?B.red:"transparent"}`,
                cursor:"pointer",
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:10, fontWeight:800, letterSpacing:"0.2em",
                color:active ? B.white : "rgba(255,255,255,0.35)",
                transition:"all 0.2s",
              }}>{p}</button>
          );
        })}
      </div>

      {/* ── PANEL CONTENT ── */}
      <div style={{ flex:1, overflow:"auto", padding:"14px 16px" }}>
        {panel==="STATS" && (
          <div key={car.id+"s"}>
            {[["ENGINE",car.displacement],["OUTPUT",car.hp],["TORQUE",car.torque],
              ["CONFIG",car.config],["WEIGHT",car.weight],["STATUS",car.status]
            ].map(([l,v],i)=>(
              <div key={l} style={{
                display:"flex", justifyContent:"space-between", alignItems:"baseline",
                marginBottom:10, paddingBottom:9,
                borderBottom:"1px solid rgba(255,255,255,0.05)",
              }}>
                <span style={{ fontSize:10, letterSpacing:"0.2em", color:B.muted, fontWeight:700 }}>{l}</span>
                <span style={{ fontSize:18, fontWeight:900, color:B.white }}>{v}</span>
              </div>
            ))}
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:13,
              color:"rgba(255,255,255,0.4)", lineHeight:1.6, marginTop:8 }}>{car.desc}</p>
          </div>
        )}
        {panel==="SPECS" && (
          <div key={car.id+"p"}>
            {Object.entries(car.stats).map(([k,v],i)=>(
              <StatBar key={car.id+k} label={k.toUpperCase()} value={v} delay={i*90}/>
            ))}
          </div>
        )}
        {panel==="HISTORY" && (
          <div key={car.id+"h"}>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:14,
              color:"rgba(255,255,255,0.5)", lineHeight:1.7, marginBottom:16 }}>{car.desc}</p>
            {[["MAKE",car.make],["MODEL",car.model],["YEAR",car.year],["NICKNAME",car.nickname]].map(([l,v])=>(
              <div key={l} style={{
                display:"flex", justifyContent:"space-between",
                marginBottom:10, paddingBottom:9,
                borderBottom:"1px solid rgba(255,255,255,0.05)",
              }}>
                <span style={{ fontSize:10, color:B.muted, fontWeight:700, letterSpacing:"0.2em" }}>{l}</span>
                <span style={{ fontSize:16, color:B.white, fontWeight:700, fontStyle:"italic" }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV — car dots + progress ── */}
      <div style={{ flexShrink:0, background:"rgba(0,0,0,0.8)",
        borderTop:`1px solid ${B.dim}`, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>

        <div style={{ display:"flex", alignItems:"stretch", height:58 }}>
          {/* Prev */}
          <button onClick={()=>goTo((carIdx-1+CARS.length)%CARS.length)}
            style={{ background:"none", border:"none", cursor:"pointer",
              padding:"0 18px", color:"rgba(255,255,255,0.35)", fontSize:22 }}>‹</button>

          {/* Car selector dots */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            {CARS.map((c,i)=>{
              const active = i === carIdx;
              return(
                <button key={c.id} onClick={()=>goTo(i)} style={{
                  background:"none", border:"none", cursor:"pointer", padding:4,
                }}>
                  <div style={{
                    width: active ? 28 : 7, height:7,
                    background: active ? B.red : "rgba(255,255,255,0.2)",
                    borderRadius:4, transition:"all 0.3s",
                    boxShadow: active ? `0 0 8px ${B.red}` : "none",
                  }}/>
                </button>
              );
            })}
            {/* Follow dot */}
            <button onClick={()=>setShowFollow(true)} style={{
              background:"none", border:"none", cursor:"pointer", padding:4 }}>
              <div style={{
                width:7, height:7, borderRadius:"50%",
                border:`1.5px solid ${B.red}`, opacity:0.6,
              }}/>
            </button>
          </div>

          {/* Next */}
          <button onClick={()=>{
            if(carIdx === CARS.length-1) setShowFollow(true);
            else goTo(carIdx+1);
          }} style={{ background:"none", border:"none", cursor:"pointer",
            padding:"0 18px", color:"rgba(255,255,255,0.35)", fontSize:22 }}>›</button>
        </div>
      </div>
    </div>
  );
}
