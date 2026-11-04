import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSiteContent } from "@/contexts/SiteContentContext";
export default function SiteFooter() {
  const { text, image } = useSiteContent();
  const { user } = useAuth();
  return (
    <footer className="bg-[#0b0b0a] px-5 pt-12 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col justify-between gap-8 border-b border-white/12 pb-10 md:flex-row md:items-end">
          <Link href="/">
            <img
              src={image("global.logo")}
              alt={text("footer.logoAlt")}
              className="h-auto w-56 max-w-full object-contain"
            />
          </Link>
          <p className="max-w-sm whitespace-pre-line text-sm leading-6 text-white/45">
            {[text("footer.descriptionLine1"), text("footer.descriptionLine2")]
              .filter(Boolean)
              .join("\n")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 py-6 pr-20 text-[0.63rem] font-medium tracking-[0.1em] text-white/40">
          <span>{text("footer.copyright")}</span>
          <span>{text("footer.credit")}</span>
          <div className="flex gap-4">
            <Link href="/member" className="hover:text-white">
              {text("nav.member")}
            </Link>
            {user?.role === "admin" && (
              <Link href="/admin/content" className="text-[#a9ff44]">
                {text("global.adminLinkLabel")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
