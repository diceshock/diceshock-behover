import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { createRouter } from "./router";
import { RouterClient } from "@tanstack/react-router/ssr/client";

const root = document.getElementById("root")!;
const router = createRouter();

hydrateRoot(
    root,
    <StrictMode>
        <RouterClient router={router} />
    </StrictMode>
);
