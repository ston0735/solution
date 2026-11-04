import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useSiteContent } from "@/contexts/SiteContentContext";
import { LineContact } from "@/components/LineContact";
import WrapColorPreview from "@/components/WrapColorPreview";
import type { BlogPost } from "@shared/siteContent";

function PageHero({
  eyebrow,
  title,
  description,
  src,
  alt,
}: {
  eyebrow: string;
  title: string;
  description: string;
  src?: string;
  alt?: string;
}) {
  return (
    <section className="relative min-h-[430px] overflow-hidden border-b border-white/10 bg-[#11120f] px-5 pb-14 pt-36 sm:px-8 lg:min-h-[510px] lg:px-10 lg:pb-20">
      {src && (
        <img
          src={src}
          alt={alt || ""}
          className="absolute inset-0 h-full w-full object-cover object-center opacity-46"
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,7,0.96)_0%,rgba(7,8,7,0.7)_54%,rgba(7,8,7,0.25)_100%),linear-gradient(0deg,#0b0b0a_0%,transparent_60%)]" />
      <div className="relative mx-auto max-w-[1600px] pt-10">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display mt-6 max-w-5xl text-[clamp(3.2rem,8vw,8rem)] font-semibold uppercase leading-[0.84] tracking-[-0.055em] text-white">
          {title}
        </h1>
        <p className="mt-7 max-w-2xl whitespace-pre-line text-base leading-7 text-white/70">
          {description}
        </p>
      </div>
    </section>
  );
}

function ContentBand({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-l border-[#a9ff44] pl-5">
      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {title}
      </h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/58">
        {description}
      </p>
    </div>
  );
}

export function ServicesPage() {
  const { text } = useSiteContent();
  return (
    <main>
      <PageHero
        eyebrow={text("page.services.eyebrow")}
        title={text("page.services.title")}
        description={text("page.services.intro")}
        src={text("page.services.image")}
        alt={text("page.services.imageAlt")}
      />
      <section className="bg-[#0b0b0a] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-[1600px] space-y-5">
          {[0, 1, 2].map(index => (
            <article
              id={`service-${index}`}
              key={index}
              className="grid scroll-mt-28 overflow-hidden border border-white/12 bg-[#11120f] md:min-h-[350px] md:grid-cols-[0.95fr_1.05fr]"
            >
              <div
                className={`relative min-h-56 md:min-h-full ${index === 1 ? "md:order-2" : ""}`}
              >
                <img
                  src={text(`services.${index}.image`)}
                  alt={text(`services.${index}.imageAlt`)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
                <p className="eyebrow">
                  {text(`services.${index}.number`)}　
                  {text(`services.${index}.english`)}
                </p>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {text(`services.${index}.title`)}
                </h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/61">
                  {text(`services.${index}.description`)}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/12 pt-5">
                  <span className="text-xs tracking-wide text-white/48">
                    {text(`services.${index}.detail`)}
                  </span>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#a9ff44] hover:text-white"
                  >
                    {text("page.services.cta")}
                    <ArrowUpRight
                      size={15}
                      aria-label={text(`services.${index}.ctaAriaLabel`)}
                    />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function AiColorPage() {
  const { text, image } = useSiteContent();
  return (
    <main>
      <PageHero
        eyebrow={text("page.ai.eyebrow")}
        title={text("page.ai.title")}
        description={text("page.ai.intro")}
        src={image("page.ai.image")}
        alt={text("page.ai.imageAlt")}
      />
      <WrapColorPreview />
    </main>
  );
}

export function ProcessPage() {
  const { text } = useSiteContent();
  return (
    <main>
      <PageHero
        eyebrow={text("page.process.eyebrow")}
        title={text("page.process.title")}
        description={text("page.process.intro")}
        src={imageSafe(text("page.process.image"))}
        alt={text("page.process.imageAlt")}
      />
      <section className="bg-[#cfd1cb] px-5 py-16 text-[#11130e] sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid divide-y divide-black/20 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {[0, 1, 2, 3].map(index => (
              <article
                key={index}
                className="py-7 sm:px-6 sm:first:pl-0 lg:min-h-64 lg:py-10"
              >
                <p className="font-display text-sm tracking-widest text-[#56732d]">
                  {text(`process.${index}.number`)}
                </p>
                <h2 className="mt-8 text-xl font-bold">
                  {text(`process.${index}.title`)}
                </h2>
                <p className="mt-3 text-sm leading-6 text-black/60">
                  {text(`process.${index}.description`)}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-10 border-t border-black/20 pt-8">
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 bg-[#161912] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#35472b]"
            >
              {text("page.services.cta")}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
function imageSafe(path: string) {
  return path;
}

export function BlogPage() {
  const { text, content } = useSiteContent();
  const posts = content.posts
    .filter(post => post.published)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <main>
      <PageHero
        eyebrow={text("page.blog.eyebrow")}
        title={text("page.blog.title")}
        description={text("page.blog.intro")}
        src={imageSafe(text("page.blog.image"))}
        alt={text("page.blog.imageAlt")}
      />
      <section className="bg-[#0b0b0a] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-[1600px]">
          {posts.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map(post => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="border border-white/12 bg-[#11120f] px-7 py-12 text-center sm:p-16">
              <CalendarDays className="mx-auto h-7 w-7 text-[#a9ff44]" />
              <h2 className="mt-5 text-xl font-semibold text-white">
                {text("page.blog.emptyTitle")}
              </h2>
              <p className="mx-auto mt-3 max-w-xl whitespace-pre-line text-sm leading-7 text-white/52">
                {text("page.blog.emptyDescription")}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
function BlogCard({ post }: { post: BlogPost }) {
  const { text } = useSiteContent();
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group overflow-hidden border border-white/12 bg-[#11120f] transition-colors hover:border-[#a9ff44]/60"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-black">
        <img
          src={post.image}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="p-5">
        <div className="flex flex-wrap justify-between gap-2 text-[0.62rem] font-semibold tracking-widest text-[#a9ff44]">
          <span>{post.category}</span>
          <time>{post.date}</time>
        </div>
        <h2 className="mt-4 text-lg font-bold text-white">{post.title}</h2>
        <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-white/55">
          {post.summary}
        </p>
        <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-white/80">
          {text("page.blog.readCta")} <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
export function BlogDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { content, text } = useSiteContent();
  const post = content.posts.find(item => item.published && item.slug === slug);
  if (!post)
    return (
      <main className="min-h-[70vh] bg-[#0b0b0a] px-5 py-40 text-center">
        <h1 className="text-2xl font-bold text-white">
          {text("page.blog.notFoundTitle")}
        </h1>
        <Link href="/blog" className="mt-5 inline-block text-[#a9ff44]">
          {text("page.blog.backCta")}
        </Link>
      </main>
    );
  return (
    <main>
      <PageHero
        eyebrow={post.category}
        title={post.title}
        description={post.summary}
        src={post.image}
        alt={post.title}
      />
      <article className="mx-auto max-w-4xl bg-[#0b0b0a] px-5 py-16 text-white sm:px-8 lg:py-24">
        <div className="flex items-center gap-2 text-xs text-white/45">
          <Clock3 size={14} />
          {post.date}
        </div>
        <p className="mt-8 whitespace-pre-line text-base leading-8 text-white/75">
          {post.body}
        </p>
        <Link
          href="/blog"
          className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-[#a9ff44]"
        >
          {text("page.blog.backCta")}
          <ArrowRight size={15} />
        </Link>
      </article>
    </main>
  );
}

export function AboutPage() {
  const { text, image } = useSiteContent();
  return (
    <main>
      <PageHero
        eyebrow={text("page.about.eyebrow")}
        title={text("page.about.title")}
        description={text("page.about.intro")}
        src={image("page.about.image")}
        alt={text("page.about.imageAlt")}
      />
      <section className="bg-[#10110e] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-[1600px] gap-8 md:grid-cols-3">
          {[0, 1, 2].map(index => (
            <article className="border-t border-[#a9ff44]/60 pt-5" key={index}>
              <ShieldCheck size={20} className="text-[#a9ff44]" />
              <h2 className="mt-6 font-display text-xl tracking-wider text-white">
                {text(`about.value.${index}.label`)}
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/55">
                {text(`about.value.${index}.copy`)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ContactPage() {
  const { text, image } = useSiteContent();
  return (
    <main>
      <PageHero
        eyebrow={text("page.contact.eyebrow")}
        title={text("page.contact.title")}
        description={text("page.contact.intro")}
        src={image("page.contact.image")}
        alt={text("page.contact.imageAlt")}
      />
      <section className="bg-[#10110e] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="eyebrow">{text("page.contact.formTitle")}</p>
            <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-7 text-white/55">
              {text("page.contact.formIntro")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/50">
              {[0, 1, 2].map(index => (
                <span className="border border-white/15 px-3 py-2" key={index}>
                  {text(`page.contact.topic.${index}`)}
                </span>
              ))}
            </div>
          </div>
          <LineContact
            labelOverride={text("page.contact.submitCta")}
            className="w-full md:w-auto"
          />
        </div>
      </section>
    </main>
  );
}

export function NotFoundPage() {
  const { text } = useSiteContent();
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#0b0b0a] px-6 py-40 text-center text-white">
      <section>
        <p className="eyebrow">SOLUTION / 404</p>
        <h1 className="font-display mt-4 text-5xl font-semibold">
          {text("error.notFoundTitle")}
        </h1>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-[#a9ff44]"
        >
          {text("error.notFoundBack")}
          <ArrowRight size={15} />
        </Link>
      </section>
    </main>
  );
}
