import { defineConfig } from "vite";

const baseConfig = defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
});

export default baseConfig;
