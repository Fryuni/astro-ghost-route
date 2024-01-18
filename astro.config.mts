import { defineConfig } from 'astro/config';
import ghostRouteIntegration from "./plugin/integration.ts";


// https://astro.build/config
export default defineConfig({
    integrations: [
        ghostRouteIntegration({
            ghostRoutes: ['/404', '/500', '/301'],
        })
    ]
});
