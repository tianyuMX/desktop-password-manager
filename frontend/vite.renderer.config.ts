import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

// https://www.electronforge.io/config/plugins/vite#viterendererconfigts
export default defineConfig({
	plugins: [vue(), vuetify()],
});
