import type {AstroIntegration, RouteData} from "astro";
import {fileURLToPath} from "node:url";

type Options = {
    ghostRoutes: string[],
}

export default function ghostRouteIntegration(options: Options): AstroIntegration {
    const missingRoutes = new Set(options.ghostRoutes);

    const ghostEntrypoint = fileURLToPath(new URL('./ghost-route.astro', import.meta.url));

    return {
        name: 'demo-ghost-route',
        hooks: {
            "astro:config:setup": ({injectRoute, updateConfig, command}) => {
                injectRoute({
                    pattern: '[...path]',
                    entrypoint: ghostEntrypoint,
                    prerender: true,
                });

                updateConfig({
                    vite: {
                        plugins: [{
                            name: 'demo-ghost-route',
                            resolveId(id) {
                                if (id === 'virtual:ghost-route-registry') {
                                    return id;
                                }
                            },
                            load(id) {
                                if (id === 'virtual:ghost-route-registry') {
                                    return `export const routeRegistry = ${JSON.stringify(Array.from(missingRoutes))};`;
                                }
                            }
                        }]
                    },
                })
            },
            'astro:build:setup': ({pages, updateConfig}) => {
                for (const page of pages.values()) {
                    missingRoutes.delete(page.route.route);
                }
            },
        }
    };
}
