import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight, Copy, Play, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Header, links, tools, Wordmark } from "./components/header";
import { Button } from "./components/ui/button";
import { aboutDetails, categories, filters, gallery, instagramPosts, journey, projects, testimonials, youtubeVideos } from "./content";
import hero from "../assets/images/hero-photo.jpg";

const media = import.meta.glob("./media/*.webp", { eager: true, query: "?url", import: "default" });
const photo = (filename) => media[`./media/${filename}`];
const socials = [
  ["Instagram", "https://www.instagram.com/tanmoyflute/"],
  ["YouTube", "https://www.youtube.com/@Tanmoyflute"],
  ["Facebook", "https://www.facebook.com/tanmoy.flute.5/"],
];
const email = "84.tanmoy.84@gmail.com";

function ExternalLink({ href, children, ...props }) {
  return <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;
}

function Hero() {
  return (
    <section className="hero site-frame">
      <div className="hero-copy">
        <p className="artist-disciplines">Bansuri <span aria-hidden="true">/</span> Sitar <span aria-hidden="true">/</span> Music education</p>
        <h1>Tanmoy<br /><em>Pramanik</em></h1>
        <p className="hero-tagline">Breathing melodies through bamboo.<br />Tying emotions with strings.</p>
        <div className="hero-actions">
          <Button asChild size="lg"><a href="#performances"><Play aria-hidden="true" /> Watch performances</a></Button>
          <Button asChild variant="outline" size="lg"><a href="#music-categories">Explore music <ArrowDown aria-hidden="true" /></a></Button>
        </div>
      </div>
      <figure className="hero-portrait">
        <div className="portrait-window">
          <img src={hero} alt="Tanmoy Pramanik playing the bansuri" width="1339" height="1864" fetchPriority="high" />
        </div>
        <figcaption><span>Tanmoy Flute</span><span>Indian bamboo flute</span></figcaption>
      </figure>
    </section>
  );
}

function Performances() {
  const [activeVideo, setActiveVideo] = useState(null);
  return (
    <section className="performances section-space" id="performances">
      <div className="site-frame">
        <div className="section-heading section-heading-inline">
          <h2>Selected performances</h2>
          <ExternalLink href={socials[1][1]} className="text-link">YouTube channel <ArrowUpRight aria-hidden="true" /></ExternalLink>
        </div>
        <div className="video-grid">
          {youtubeVideos.map((video) => (
            <article className="video" key={video.youtubeId}>
              <div className="video-frame">
                {activeVideo === video.youtubeId ? (
                  <iframe src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
                    title={video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                ) : (
                  <button type="button" onClick={() => setActiveVideo(video.youtubeId)} aria-label={`Play ${video.title}`}>
                    <img src={photo(video.thumbnail)} loading="lazy" alt="" />
                    <span className="play-mark"><Play size={20} fill="currentColor" aria-hidden="true" /></span>
                  </button>
                )}
              </div>
              <p className="media-category">{video.category}</p>
              <h3>{video.title}</h3>
              <p>{video.description}</p>
              <ExternalLink className="text-link video-fallback" href={video.link} aria-label={`Open ${video.title} on YouTube`}>Open on YouTube <ArrowUpRight aria-hidden="true" /></ExternalLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reels() {
  return (
    <section className="site-frame section-space" id="instagram">
      <div className="section-heading section-heading-inline">
        <h2>Instagram reels</h2>
        <ExternalLink href={socials[0][1]} className="text-link">@tanmoyflute <ArrowUpRight aria-hidden="true" /></ExternalLink>
      </div>
      <div className="reels-grid">
        {instagramPosts.map((post) => (
          <ExternalLink className="reel" href={post.link} key={post.link}>
            <div className="reel-photo"><img src={photo(post.thumbnail)} alt="" loading="lazy" /><ArrowUpRight size={18} aria-hidden="true" /></div>
            <h3>{post.caption}</h3>
            <p>{post.title}</p>
          </ExternalLink>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="about section-space" id="about">
      <div className="site-frame about-layout">
        <img src={photo("About-photo-tf.webp")} alt="Portrait of Tanmoy Pramanik with his bansuri" loading="lazy" />
        <div>
          <h2>About the artist</h2>
          <p className="about-lede">Tanmoy Pramanik is an Indian bansuri performer, recording artist, and flute educator.</p>
          <p>Rooted in Hindustani classical music, his work brings the expressive phrasing of the bamboo flute to ragas, fusion compositions, and beloved melodies.</p>
          <dl className="about-details">
            {aboutDetails.map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Journey() {
  return (
    <section className="site-frame section-space editorial-layout" id="timeline">
      <h2>A journey through music</h2>
      <ol className="editorial-list">
        {journey.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}
      </ol>
    </section>
  );
}

function Gallery() {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const opener = useRef(null);
  const [filename, caption] = gallery[selected];
  const move = (step) => setSelected((current) => (current + step + gallery.length) % gallery.length);
  return (
    <section className="gallery section-space" id="gallery">
      <div className="site-frame">
        <div className="section-heading"><h2>Gallery</h2><p>Performances, studio sessions, and rehearsals.</p></div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <div className="gallery-grid">
            {gallery.map(([image, alt], index) => (
              <button key={image} type="button" aria-haspopup="dialog" aria-label={`View ${alt.toLowerCase()}`}
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setSelected(index);
                  setOpen(true);
                }}>
                <img src={photo(image)} alt={alt} loading="lazy" />
              </button>
            ))}
          </div>
          <Dialog.Portal>
            <Dialog.Overlay className="gallery-overlay" />
            <Dialog.Content className="gallery-dialog" aria-describedby={undefined} onCloseAutoFocus={(event) => {
              event.preventDefault();
              opener.current?.focus();
            }} onKeyDown={(event) => {
              if (event.key === "ArrowLeft") move(-1);
              if (event.key === "ArrowRight") move(1);
            }}>
              <Dialog.Close asChild>
                <Button size="icon-lg" className="gallery-close" aria-label="Close image preview"><X aria-hidden="true" /></Button>
              </Dialog.Close>
              <img src={photo(filename)} alt={caption} />
              <div className="gallery-caption">
                <Button variant="outline" size="icon-lg" onClick={() => move(-1)} aria-label="Previous image"><ChevronLeft aria-hidden="true" /></Button>
                <Dialog.Title aria-live="polite">{caption}</Dialog.Title>
                <Button variant="outline" size="icon-lg" onClick={() => move(1)} aria-label="Next image"><ChevronRight aria-hidden="true" /></Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </section>
  );
}

function Projects() {
  return (
    <section className="site-frame section-space editorial-layout" id="collaborations">
      <h2>Collaborations</h2>
      <div className="project-grid">
        {projects.map(([type, title, text]) => (
          <article key={type}><h3>{type}</h3><p className="project-summary">{title}</p><p>{text}</p></article>
        ))}
      </div>
    </section>
  );
}

function MusicCategories() {
  const [filter, setFilter] = useState("all");
  const visible = categories.filter(([tags]) => filter === "all" || tags.split(" ").includes(filter));
  return (
    <section className="music section-space" id="music-categories">
      <div className="site-frame">
        <div className="section-heading"><h2>Explore the music</h2></div>
        <div className="category-filters" role="group" aria-label="Filter music categories">
          {filters.map(([id, label]) => (
            <Button key={id} variant={filter === id ? "default" : "outline"}
              type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</Button>
          ))}
        </div>
        <div className="category-list" aria-live="polite">
          {visible.map(([, title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </div>
    </section>
  );
}

function PracticeTools() {
  return (
    <section className="site-frame section-space editorial-layout" id="tools">
      <h2>Practice tools</h2>
      <ul className="tool-list">
        {tools.map(([href, title, text]) => (
          <li key={href}><a href={href}><span><strong>{title}</strong><small>{text}</small></span><ArrowUpRight aria-hidden="true" /></a></li>
        ))}
      </ul>
    </section>
  );
}

function Reflections() {
  return (
    <section className="reflections section-space" id="testimonials">
      <div className="site-frame">
        <div className="section-heading"><h2>Listener reflections</h2></div>
        <div className="quote-grid">
          {testimonials.map(([quote, author]) => (
            <figure key={author}><blockquote>“{quote}”</blockquote><figcaption>{author}</figcaption></figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Booking() {
  const [message, setMessage] = useState("");
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setMessage("Email address copied.");
    } catch {
      setMessage("Copy unavailable. You can select the email address above.");
    }
  }
  return (
    <section className="booking section-space" id="booking">
      <div className="site-frame booking-layout">
        <div><h2>Let’s make music.</h2><p>Available for live concerts, studio sessions, weddings, corporate events, and creative collaborations.</p></div>
        <div className="booking-actions">
          <Button asChild size="lg"><ExternalLink href="https://forms.gle/Y43WSV6aM7VYay9m8">Send a booking inquiry <ArrowUpRight aria-hidden="true" /></ExternalLink></Button>
          <div className="booking-email">
            <a href={`mailto:${email}`}>{email}</a>
            <Button type="button" variant="ghost" size="icon" aria-label="Copy email address" onClick={copyEmail}><Copy aria-hidden="true" /></Button>
          </div>
          <p className="copy-status" role="status">{message}</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-frame">
        <div className="footer-main">
          <div><Wordmark /><p>Indian classical and contemporary fusion flautist.</p></div>
          <nav aria-label="Footer navigation">{[...links, ["#tools", "Practice tools"], ["#booking", "Booking"]].map(([href, label]) => <a href={href} key={href}>{label}</a>)}</nav>
          <div className="social-links">{socials.map(([label, href]) => <ExternalLink href={href} key={href}>{label} <ArrowUpRight aria-hidden="true" /></ExternalLink>)}</div>
        </div>
        <p className="footer-copyright">© {new Date().getFullYear()} Tanmoy Pramanik. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function Portfolio() {
  useEffect(() => {
    const target = document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ behavior: "instant" });
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Performances />
        <Reels />
        <About />
        <Journey />
        <Gallery />
        <Projects />
        <MusicCategories />
        <PracticeTools />
        <Reflections />
        <Booking />
      </main>
      <Footer />
    </>
  );
}
