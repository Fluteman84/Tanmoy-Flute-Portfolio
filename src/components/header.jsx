import { useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "./ui/button";

export const tools = [
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
  return (
    <header className="portfolio-header" id="top" onKeyDown={(event) => {
      if (event.key === "Escape" && expanded) {
        setExpanded(false);
        event.currentTarget.querySelector(".mobile-nav-toggle").focus();
      }
    }}>
      <div className="site-frame header-inner">
        <Wordmark href={toolPage ? "index.html" : "#top"} />
        {toolPage ? (
          <nav className="header-actions" aria-label="Main navigation">
            <ToolsMenu />
            <Button asChild variant="outline">
              <a href="index.html"><ArrowLeft aria-hidden="true" /> Portfolio</a>
            </Button>
          </nav>
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
