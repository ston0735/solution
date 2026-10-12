import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Check,
  CircleUserRound,
  Download,
  Info,
  LoaderCircle,
  LogIn,
  LogOut,
  Maximize2,
  Orbit,
  Paintbrush,
  RotateCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_GLB_BYTES = 120 * 1024 * 1024;
const THREE_URL = "https://esm.sh/three@0.180.0?bundle";
const ORBIT_URL =
  "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls?bundle";
const GLTF_URL =
  "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader?bundle";

const COLORS = [
  ["曜石黑", "#121416"],
  ["賽道紅", "#B2182B"],
  ["鈦金灰", "#646C72"],
  ["霧冰白", "#F4F3EE"],
  ["深海藍", "#123E67"],
] as const;

type Finish = "gloss" | "satin" | "matte";

const FINISHES: Record<Finish, { name: string; roughness: number; metalness: number; clearcoat: number }> = {
  gloss: { name: "亮面", roughness: 0.17, metalness: 0.55, clearcoat: 0.92 },
  satin: { name: "緞面", roughness: 0.4, metalness: 0.4, clearcoat: 0.4 },
  matte: { name: "霧面", roughness: 0.73, metalness: 0.16, clearcoat: 0.03 },
};

function getPaintMaterials(root: any) {
  const preferred = new Set<any>();
  const fallback = new Set<any>();
  const excluded = /glass|window|light|lamp|chrome|metal|tire|tyre|wheel|rim|interior|seat|trim/;
  const paintNames = /body|paint|carpaint|car_paint|wrap|exterior/;

  root.traverse((node: any) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const label = `${node.name || ""} ${materials.map((material: any) => material?.name || "").join(" ")}`.toLowerCase();
    materials.forEach((material: any) => {
      if (!material?.color) return;
      if (!excluded.test(label)) fallback.add(material);
      if (paintNames.test(label)) preferred.add(material);
    });
  });

  const result = [...(preferred.size ? preferred : fallback)];
  result.forEach((material: any) => {
    material.userData = material.userData || {};
    material.userData.solutionPaintTarget = true;
  });
  return result;
}

function applyPaint(materials: any[], color: string, finish: Finish) {
  const profile = FINISHES[finish];
  materials.forEach((material: any) => {
    if (material.color) material.color.set(color);
    if (material.userData?.solutionPaintTarget && material.map) {
      material.map = null;
      material.vertexColors = false;
    }
    if ("roughness" in material) material.roughness = profile.roughness;
    if ("metalness" in material) material.metalness = profile.metalness;
    if ("clearcoat" in material) material.clearcoat = profile.clearcoat;
    if ("clearcoatRoughness" in material) material.clearcoatRoughness = Math.min(0.86, profile.roughness * 0.75);
    material.needsUpdate = true;
  });
}

function StudioLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0a] px-5 text-[#f3f4ee]">
      <div className="border-l border-[#a9ff44] pl-5">
        <p className="text-[0.62rem] font-bold tracking-[0.18em] text-[#a9ff44]">MEMBER ACCESS</p>
        <p className="mt-3 text-sm text-white/60">正在確認會員登入狀態…</p>
      </div>
    </main>
  );
}

function SignInWall() {
  return (
    <main className="min-h-screen bg-[#0b0b0a] px-5 py-8 text-[#f3f4ee] sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[86vh] max-w-[1040px] flex-col justify-between border border-white/10 bg-[radial-gradient(circle_at_90%_8%,rgba(169,255,68,0.13),transparent_26rem)] p-7 sm:p-12">
        <a href="/member" className="inline-flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.14em] text-white/55 transition-colors hover:text-[#a9ff44]">
          <ArrowLeft size={15} /> 返回會員專區
        </a>
        <section className="max-w-3xl py-16">
          <p className="text-[0.62rem] font-bold tracking-[0.2em] text-[#a9ff44]">MEMBER-ONLY TOOL</p>
          <h1 className="mt-5 font-display text-[clamp(3.2rem,9vw,7.8rem)] font-medium uppercase leading-[0.79] tracking-[-0.055em] text-white">
            VEHICLE<br />STUDIO
          </h1>
          <p className="mt-8 max-w-xl text-base leading-8 text-white/62">
            360° GLB 車輛展示、即時改色與漆面模擬，僅在已登入的 Solution 會員工作區提供。上傳的 GLB 預設只在你的瀏覽器本機處理，不會自動公開或存到伺服器。
          </p>
          <div className="mt-10 grid gap-px border border-white/12 bg-white/10 sm:grid-cols-3">
            {["最高 120 MB GLB", "360° 旋轉與縮放", "主車色與三種漆面"].map((item, index) => (
              <div className="bg-[#0b0b0a] p-5" key={item}>
                <span className="text-[0.62rem] font-bold tracking-[0.16em] text-[#a9ff44]">0{index + 1}</span>
                <p className="mt-6 text-sm font-semibold text-white/80">{item}</p>
              </div>
            ))}
          </div>
          <button onClick={startLogin} className="mt-10 inline-flex items-center gap-3 bg-[#a9ff44] px-6 py-4 text-[0.7rem] font-extrabold tracking-[0.14em] text-[#10130a] transition-transform hover:-translate-y-0.5">
            <LogIn size={17} /> 登入後開啟 3D 工作室
          </button>
        </section>
        <p className="text-[0.62rem] tracking-[0.12em] text-white/35">SOLUTION AUTOMOTIVE STUDIO · PRIVATE WORKSPACE</p>
      </div>
    </main>
  );
}

function VehicleStudioWorkspace({ name, email, onLogout }: { name: string; email?: string; onLogout: () => void }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const paintMaterialsRef = useRef<any[]>([]);
  const resetCameraRef = useRef<() => void>(() => {});
  const [color, setColor] = useState("#B2182B");
  const [finish, setFinish] = useState<Finish>("gloss");
  const [modelName, setModelName] = useState("尚未載入車輛模型");
  const [status, setStatus] = useState("請載入 GLB / GLTF 車輛模型開始客製化。");
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let disposed = false;
    let renderer: any;
    let controls: any;
    let resizeObserver: ResizeObserver | undefined;
    let animationFrame = 0;
    let scene: any;
    let camera: any;
    let activeModel: any;

    const setup = async () => {
      try {
        const THREE = await import(/* @vite-ignore */ THREE_URL) as any;
        const { OrbitControls } = await import(/* @vite-ignore */ ORBIT_URL) as any;
        const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
        if (disposed || !mountRef.current) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color("#e9ecef");
        scene.fog = new THREE.Fog("#e9ecef", 16, 30);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.22;
        mountRef.current.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.touchAction = "none";
        renderer.domElement.setAttribute("aria-label", "360° 車輛預覽");

        camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(7.4, 4.3, 8.2);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 4.5;
        controls.maxDistance = 14;
        controls.minPolarAngle = 0.58;
        controls.maxPolarAngle = 1.5;
        controls.target.set(0, 0.5, 0);
        controls.saveState();

        scene.add(new THREE.HemisphereLight("#ffffff", "#8b9197", 2.7));
        const key = new THREE.DirectionalLight("#ffffff", 5.2);
        key.position.set(5, 8, 5);
        scene.add(key);
        const fill = new THREE.DirectionalLight("#fff3df", 2.5);
        fill.position.set(2, 1, -7);
        scene.add(fill);
        const rim = new THREE.DirectionalLight("#c9d9ff", 1.55);
        rim.position.set(-6, 3, -5);
        scene.add(rim);

        const floor = new THREE.Mesh(
          new THREE.CircleGeometry(9.8, 64),
          new THREE.MeshStandardMaterial({ color: "#d4d8dc", metalness: 0.08, roughness: 0.88 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.68;
        scene.add(floor);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(6.2, 6.24, 80),
          new THREE.MeshBasicMaterial({ color: "#a9ff44", transparent: true, opacity: 0.3, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.66;
        scene.add(ring);

        const resize = () => {
          if (!mountRef.current) return;
          const { width, height } = mountRef.current.getBoundingClientRect();
          const safeWidth = Math.max(1, Math.floor(width));
          const safeHeight = Math.max(1, Math.floor(height));
          renderer.setSize(safeWidth, safeHeight, true);
          camera.aspect = safeWidth / safeHeight;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mountRef.current);
        resize();

        const loader = new GLTFLoader();
        (window as any).__solutionVehicleStudioLoad = (file: File) => {
          if (file.size > MAX_GLB_BYTES) {
            setStatus("檔案超過 120 MB 上限；請先壓縮或建立 LOD 版本。\n");
            return;
          }
          if (!/\.glb$|\.gltf$/i.test(file.name)) {
            setStatus("請選擇 .glb 或 .gltf 車輛模型檔。\n");
            return;
          }
          setStatus("正在解析 3D 模型…大型模型可能需要幾秒。\n");
          setIsDragging(false);
          const objectUrl = URL.createObjectURL(file);
          loader.load(objectUrl, (gltf: any) => {
            try {
              if (activeModel) scene.remove(activeModel);
              activeModel = gltf.scene;
              activeModel.updateMatrixWorld(true);
              const bounds = new THREE.Box3().setFromObject(activeModel);
              const size = bounds.getSize(new THREE.Vector3());
              const longest = Math.max(size.x, size.y, size.z);
              if (!Number.isFinite(longest) || longest === 0) throw new Error("模型沒有可顯示的幾何資料。");
              activeModel.scale.setScalar(5.4 / longest);
              activeModel.updateMatrixWorld(true);
              const finalBounds = new THREE.Box3().setFromObject(activeModel);
              const center = finalBounds.getCenter(new THREE.Vector3());
              activeModel.position.x -= center.x;
              activeModel.position.z -= center.z;
              activeModel.position.y -= finalBounds.min.y + 0.62;
              scene.add(activeModel);
              paintMaterialsRef.current = getPaintMaterials(activeModel);
              applyPaint(paintMaterialsRef.current, color, finish);
              controls.reset();
              setModelName(file.name.replace(/\.(glb|gltf)$/i, ""));
              setStatus(paintMaterialsRef.current.length ? "模型已載入，可立即調整主車色與漆面。" : "模型已載入，但找不到可改色材質；請確認車身材質名稱包含 body、paint 或 carpaint。");
            } catch (error) {
              setStatus(error instanceof Error ? error.message : "模型無法載入。\n");
            } finally {
              URL.revokeObjectURL(objectUrl);
            }
          }, undefined, () => {
            URL.revokeObjectURL(objectUrl);
            setStatus("模型載入失敗。建議優先使用單一 .glb 檔案。\n");
          });
        };
        resetCameraRef.current = () => {
          controls.reset();
          if (activeModel) activeModel.rotation.y = 0;
        };
        const animate = () => {
          animationFrame = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();
        setIsLoading(false);
      } catch (error) {
        setStatus("3D 引擎載入失敗。請確認網路可連到 Three.js CDN 後重新整理。\n");
        setIsLoading(false);
      }
    };

    void setup();
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      paintMaterialsRef.current = [];
      delete (window as any).__solutionVehicleStudioLoad;
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, []);

  useEffect(() => {
    applyPaint(paintMaterialsRef.current, color, finish);
  }, [color, finish]);

  const selectModel = (file?: File) => {
    if (!file) return;
    const load = (window as any).__solutionVehicleStudioLoad as undefined | ((nextFile: File) => void);
    if (load) load(file);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0b0b0a] text-[#f3f4ee]">
      <header className="border-b border-white/10 bg-[#0b0b0a]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <a href="/member" className="group inline-flex items-center gap-3 text-[0.68rem] font-bold tracking-[0.15em] text-white/65 transition-colors hover:text-[#a9ff44]">
            <ArrowLeft size={16} /> MEMBER AREA
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 border border-[#a9ff44]/45 bg-[#a9ff44]/10 px-3 py-2 text-[0.59rem] font-bold tracking-[0.12em] text-[#a9ff44] sm:flex"><Check size={13} /> {name} · 會員登入中</span>
            <button onClick={onLogout} className="inline-flex items-center gap-2 text-[0.62rem] font-bold tracking-[0.13em] text-white/50 transition-colors hover:text-white"><LogOut size={15} /> 登出</button>
          </div>
        </div>
      </header>

      <section className="border-b border-white/10 px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-[0.62rem] font-bold tracking-[0.2em] text-[#a9ff44]">PRIVATE MEMBER TOOL · {email || "SOLUTION ACCOUNT"}</p>
            <h1 className="mt-4 font-display text-[clamp(3rem,6.5vw,6.5rem)] font-medium uppercase leading-[0.8] tracking-[-0.055em]">VEHICLE<br />STUDIO</h1>
          </div>
          <p className="max-w-md text-sm leading-7 text-white/55">載入你已取得使用權的 GLB／GLTF 車型，在本機瀏覽器內完成 360° 旋轉、主車色與漆面質感確認。檔案不會自動上傳或公開。</p>
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto grid min-w-0 max-w-[1600px] overflow-hidden border border-white/12 bg-white/[0.035] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 min-h-[560px] border-b border-white/12 lg:min-h-[680px] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-white/12 px-5 py-4">
              <div><p className="text-[0.58rem] font-bold tracking-[0.18em] text-[#a9ff44]">360° PREVIEW</p><p className="mt-1 text-sm font-semibold text-white">{modelName}</p></div>
              <button onClick={() => resetCameraRef.current()} className="inline-flex items-center gap-2 text-[0.61rem] font-bold tracking-[0.12em] text-white/55 transition-colors hover:text-[#a9ff44]"><RotateCcw size={15} /> 重設視角</button>
            </div>
            <div ref={mountRef} className="relative min-w-0 min-h-[500px] overflow-hidden touch-none lg:min-h-[620px]">
              {isLoading && <div className="absolute inset-0 z-10 grid place-items-center bg-[#e9ecef] text-[#4e565d]"><div className="flex items-center gap-3 text-[0.65rem] font-bold tracking-[0.15em]"><LoaderCircle size={17} className="animate-spin" /> LOADING 3D ENGINE</div></div>}
              {!isLoading && modelName === "尚未載入車輛模型" && <div className="pointer-events-none absolute inset-0 z-[1] grid place-items-center px-8 text-center"><div><Orbit size={40} strokeWidth={1.25} className="mx-auto text-[#a9ff44]" /><p className="mt-4 text-[0.63rem] font-bold tracking-[0.18em] text-[#4e565d]">READY FOR YOUR GLB</p><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#606970]">從右側載入車型後，即可拖曳旋轉、滑鼠滾輪縮放並測試車身色彩。</p></div></div>}
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/12 px-5 py-4 text-[0.59rem] font-bold tracking-[0.13em] text-white/42"><span>DRAG TO ORBIT · SCROLL TO ZOOM</span><span>LOCAL-ONLY FILE PROCESSING</span></div>
          </div>

          <aside className="bg-[#0b0b0a]">
            <div className="border-b border-white/12 p-6">
              <p className="text-[0.6rem] font-bold tracking-[0.18em] text-[#a9ff44]">01 / MODEL</p>
              <h2 className="mt-3 text-xl font-bold tracking-[-0.03em]">載入車輛模型</h2>
              <input ref={fileInputRef} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="hidden" onChange={(event) => selectModel(event.target.files?.[0])} />
              <button onClick={() => fileInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectModel(event.dataTransfer.files?.[0]); }} className={`mt-5 flex w-full flex-col items-center justify-center border border-dashed px-5 py-8 text-center transition-colors ${isDragging ? "border-[#a9ff44] bg-[#a9ff44]/10" : "border-white/25 bg-white/[0.025] hover:border-[#a9ff44]/70"}`}>
                <Upload size={20} className="text-[#a9ff44]" /><strong className="mt-3 text-sm">載入 GLB / GLTF</strong><span className="mt-2 text-[0.62rem] leading-5 text-white/45">Demo 上限 120 MB<br />檔案只在本機瀏覽器處理</span>
              </button>
              <p className="mt-4 text-[0.7rem] leading-6 text-white/50">{status}</p>
            </div>

            <div className="border-b border-white/12 p-6">
              <p className="text-[0.6rem] font-bold tracking-[0.18em] text-[#a9ff44]">02 / PAINT</p>
              <h2 className="mt-3 text-xl font-bold tracking-[-0.03em]">主車色</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                {COLORS.map(([label, value]) => <button key={value} onClick={() => setColor(value)} title={label} className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${color === value ? "border-[#a9ff44] ring-2 ring-[#0b0b0a] ring-offset-2 ring-offset-[#a9ff44]" : "border-white/20"}`} style={{ backgroundColor: value }} aria-label={`套用${label}`} />)}
                <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/25 bg-[conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]" title="自訂顏色"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-7 w-7 cursor-pointer opacity-0" aria-label="自訂主車色" /></label>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {(Object.keys(FINISHES) as Finish[]).map((item) => <button key={item} onClick={() => setFinish(item)} className={`border px-2 py-3 text-[0.63rem] font-bold tracking-[0.1em] transition-colors ${finish === item ? "border-[#a9ff44] bg-[#a9ff44] text-[#10130a]" : "border-white/15 text-white/55 hover:border-white/45"}`}>{FINISHES[item].name}</button>)}
              </div>
            </div>

            <div className="p-6">
              <div className="flex gap-3"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#a9ff44]" /><div><p className="text-sm font-semibold">會員限定 · 私人工作區</p><p className="mt-2 text-[0.7rem] leading-6 text-white/48">此版本不會把 GLB 寫入 CRM 或公開網站。未來若啟用「儲存專案」功能，會另行提示儲存內容與分享權限。</p></div></div>
              <div className="mt-5 border-t border-white/10 pt-5 text-[0.62rem] leading-5 text-white/42"><Info size={13} className="mr-1 inline text-[#a9ff44]" />建議正式使用時另提供 8–15 MB 的行動版 LOD，以兼顧手機載入速度。</div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function MemberVehicleStudio() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  if (loading) return <StudioLoading />;
  if (!isAuthenticated) return <SignInWall />;
  return <VehicleStudioWorkspace name={user?.name?.trim() || "Solution 會員"} email={user?.email} onLogout={() => void logout()} />;
}
