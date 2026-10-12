import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Check, LogIn, LogOut } from "lucide-react";

const CONFIGURATOR_PATH = "/vehicle-configurator/index.html";

function StudioLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0a] px-5 text-[#f3f4ee]">
      <div className="border-l border-[#a9ff44] pl-5">
        <p className="text-[0.62rem] font-bold tracking-[0.18em] text-[#a9ff44]">
          MEMBER ACCESS
        </p>
        <p className="mt-3 text-sm text-white/60">正在確認會員登入狀態…</p>
      </div>
    </main>
  );
}

function SignInWall() {
  return (
    <main className="min-h-screen bg-[#0b0b0a] px-5 py-8 text-[#f3f4ee] sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[86vh] max-w-[1040px] flex-col justify-between border border-white/10 bg-[radial-gradient(circle_at_90%_8%,rgba(169,255,68,0.13),transparent_26rem)] p-7 sm:p-12">
        <a
          href="/member"
          className="inline-flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.14em] text-white/55 transition-colors hover:text-[#a9ff44]"
        >
          <ArrowLeft size={15} /> 返回會員專區
        </a>
        <section className="max-w-3xl py-16">
          <p className="text-[0.62rem] font-bold tracking-[0.2em] text-[#a9ff44]">
            MEMBER-ONLY TOOL
          </p>
          <h1 className="mt-5 font-display text-[clamp(3.2rem,9vw,7.8rem)] font-medium uppercase leading-[0.79] tracking-[-0.055em] text-white">
            VEHICLE
            <br />
            STUDIO
          </h1>
          <p className="mt-8 max-w-xl text-base leading-8 text-white/62">
            新版 3D 車色配置器已整合到 Solution 會員工作區，支援多車款、360°
            旋轉、車身改色、漆面質感與部位客製化。登入後即可使用。
          </p>
          <div className="mt-10 grid gap-px border border-white/12 bg-white/10 sm:grid-cols-3">
            {["5 個內建車款", "360° 旋轉與縮放", "車色與漆面客製化"].map(
              (item, index) => (
                <div className="bg-[#0b0b0a] p-5" key={item}>
                  <span className="text-[0.62rem] font-bold tracking-[0.16em] text-[#a9ff44]">
                    0{index + 1}
                  </span>
                  <p className="mt-6 text-sm font-semibold text-white/80">
                    {item}
                  </p>
                </div>
              ),
            )}
          </div>
          <button
            type="button"
            onClick={startLogin}
            className="mt-10 inline-flex items-center gap-3 bg-[#a9ff44] px-6 py-4 text-[0.7rem] font-extrabold tracking-[0.14em] text-[#10130a] transition-transform hover:-translate-y-0.5"
          >
            <LogIn size={17} /> 登入後開啟 3D 工作室
          </button>
        </section>
        <p className="text-[0.62rem] tracking-[0.12em] text-white/35">
          SOLUTION AUTOMOTIVE STUDIO · PRIVATE WORKSPACE
        </p>
      </div>
    </main>
  );
}

function VehicleStudioWorkspace({
  name,
  email,
  onLogout,
}: {
  name: string;
  email?: string;
  onLogout: () => void;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0b0b0a] text-[#f3f4ee]">
      <header className="border-b border-white/10 bg-[#0b0b0a]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <a
            href="/member"
            className="group inline-flex items-center gap-2 text-[0.68rem] font-bold tracking-[0.15em] text-white/65 transition-colors hover:text-[#a9ff44]"
          >
            <ArrowLeft size={16} /> MEMBER AREA
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 border border-[#a9ff44]/45 bg-[#a9ff44]/10 px-3 py-2 text-[0.59rem] font-bold tracking-[0.12em] text-[#a9ff44] sm:flex">
              <Check size={13} /> {name} · 會員登入中
            </span>
            {email ? (
              <span className="hidden text-[0.58rem] text-white/35 lg:inline">
                {email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 text-[0.62rem] font-bold tracking-[0.13em] text-white/50 transition-colors hover:text-white"
            >
              <LogOut size={15} /> 登出
            </button>
          </div>
        </div>
      </header>

      <section className="border-b border-white/10 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-[0.62rem] font-bold tracking-[0.2em] text-[#a9ff44]">
              PRIVATE MEMBER TOOL · BETA
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.8rem,6vw,6rem)] font-medium uppercase leading-[0.8] tracking-[-0.055em]">
              VEHICLE STUDIO
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/55">
            由會員提供的新版 3D Car Configurator。所有模型與改色操作在瀏覽器內完成，檔案不會自動上傳或公開。
          </p>
        </div>
      </section>

      <section className="px-3 py-3 sm:px-6 sm:py-6 lg:px-10">
        <div className="mx-auto max-w-[1600px] overflow-hidden border border-white/12 bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <iframe
            title="Solution 3D Car Configurator"
            src={CONFIGURATOR_PATH}
            className="block h-[calc(100vh-180px)] min-h-[700px] w-full border-0 bg-[#eef0f2]"
            allow="fullscreen"
          />
        </div>
      </section>
    </main>
  );
}

export default function MemberVehicleStudio() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  if (loading) return <StudioLoading />;
  if (!isAuthenticated) return <SignInWall />;
  return (
    <VehicleStudioWorkspace
      name={user?.name?.trim() || "Solution 會員"}
      email={user?.email}
      onLogout={() => void logout()}
    />
  );
}
