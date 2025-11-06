import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

const baseConfig = defineConfig({
  plugins: [tsconfigPaths()],
});

export default baseConfig;
