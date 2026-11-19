import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "./ui/button";

export const tools = [
  ["singing.html", "Sargam Singing Trainer", "Follow a singer’s pitch and practice each phrase in sargam."],
  ["sheet.html", "Musician's Sheet", "Multi-instrument song reference and live performance sync."],
  ["notes.html", "Palta Generator", "Generate Aroha and Avaroha practice patterns."],
  ["notation.html", "Swaralipi Editor", "Write and export Hindustani classical notation."],
  ["tabla.html", "Tabla Taal Engine", "Practice with a tabla rhythm and metronome."],
  ["zitar.html", "Zitar Tone Reference", "Browse Gretex GT-15FX amplifier presets."],
];

export const links = [
  ["#performances", "Performances"], ["#instagram", "Reels"], ["#about", "About"],
  ["#timeline", "Journey"], ["#gallery", "Gallery"], ["#collaborations", "Projects"],
];

export function Wordmark({ href = "#top" }) {
  return <a className="wordmark" href={href}>Tanmoy <i>Flute</i></a>;
}

function ToolsMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" className="nav-tools">Tools <ChevronDown aria-hidden="true" /></Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="tools-menu" align="end" sideOffset={10} collisionPadding={16}>
          {tools.map(([href, name, description]) => (
            <DropdownMenu.Item asChild key={href}>
              <a href={href}>
                <span>{name}<small>{description}</small></span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Header({ toolPage = false }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const handlePointerDown = (event) => {
      if (!event.target.closest(".portfolio-header") && !event.target.closest(".tools-menu")) {
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expanded]);

  return (
    <header className={`portfolio-header ${toolPage ? "site-header tool-header" : ""}`} id="top" onKeyDown={(event) => {
      if (event.key === "Escape" && expanded) {
        setExpanded(false);
        event.currentTarget.querySelector(".mobile-nav-toggle")?.focus();
      }
    }}>
      <div className={`site-frame header-inner ${toolPage ? "nav-shell" : ""}`}>
        <Wordmark href={toolPage ? "index.html" : "#top"} />
        {toolPage ? (
          <>
            <nav className="header-actions tool-desktop-nav" aria-label="Main navigation">
              <ToolsMenu />
              <Button asChild variant="outline" className="notes-back-link">
                <a href="index.html"><ArrowLeft aria-hidden="true" /> Back to Stage</a>
              </Button>
            </nav>
            <Button
              className="mobile-nav-toggle"
              variant="outline"
              size="icon-lg"
              aria-expanded={expanded}
              aria-controls="tool-nav"
              aria-label={expanded ? "Close navigation" : "Open navigation"}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
            <nav
              className="portfolio-nav tool-mobile-nav"
              aria-label="Main navigation"
              id="tool-nav"
              data-open={expanded}
            >
              <a
                href="index.html"
                className="tool-mobile-back"
                onClick={() => setExpanded(false)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Back to Stage</span>
              </a>
              <ToolsMenu />
            </nav>
          </>
        ) : (
          <>
            <Button className="mobile-nav-toggle" variant="outline" size="icon-lg"
              aria-expanded={expanded} aria-controls="portfolio-nav"
              aria-label={expanded ? "Close navigation" : "Open navigation"}
              onClick={() => setExpanded(!expanded)}>
              {expanded ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
            <nav className="portfolio-nav" aria-label="Main navigation" id="portfolio-nav" data-open={expanded}>
              {links.map(([href, label]) => <a href={href} key={href} onClick={() => setExpanded(false)}>{label}</a>)}
              <ToolsMenu />
              <Button asChild className="header-booking">
                <a href="#booking" onClick={() => setExpanded(false)}>Booking <ArrowUpRight aria-hidden="true" /></a>
              </Button>
            </nav>
          </>
        )}
      </div>
    </header>
  );
}
