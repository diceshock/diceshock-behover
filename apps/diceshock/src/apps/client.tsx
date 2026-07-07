import { SessionProvider } from "@hono/auth-js/react";

import { RouterClient } from "@tanstack/react-router/ssr/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { createRouter } from "./router";

// After a deploy, old chunk hashes disappear from the CDN. When the browser
// tries to lazy-load a route chunk that no longer exists, Vite fires this event.
// Force a clean page reload so the new HTML (with fresh chunk URLs) is fetched.
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault(); // suppress console error
  window.location.reload();
});

const root = document.getElementById("root")!;
const router = createRouter();

hydrateRoot(
  root,
  <StrictMode>
    <SessionProvider>
      <RouterClient router={router} />
    </SessionProvider>
  </StrictMode>,
);
