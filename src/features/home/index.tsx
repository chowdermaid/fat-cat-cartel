import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { EventsPreview } from "./components/EventsPreview";

export function HomePage() {
  return (
    <div>
      <Hero />
      <About />
      <EventsPreview />
    </div>
  );
}
