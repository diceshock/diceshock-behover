import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const baseConfig = defineConfig({
  plugins: [tsconfigPaths()],
});

export default baseConfig;
