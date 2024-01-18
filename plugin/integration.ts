import type {AstroIntegration, RouteData} from "astro";
import {fileURLToPath} from "node:url";


type Options = {
    ghostRoutes: string[],
}

export default function ghostRouteIntegration(options: Options): AstroIntegration {
    const ghostRoutes = new Set(options.ghostRoutes);

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
                                    return `export const routeRegistry = ${JSON.stringify(Array.from(ghostRoutes))};`;
                                }
                            },
                            configureServer: command === 'dev' ? makeDevMiddleware(ghostRoutes) : undefined,
                        }]
                    },
                })
            },
            'astro:build:setup': ({pages, updateConfig}) => {
                for (const page of pages.values()) {
                    ghostRoutes.delete(page.route.route);
                }
            },
        }
    };
}

function makeDevMiddleware(ghostRoutes: Set<string>) {
    return {
        order: 'pre',
        handler: (server) => {
            server.middlewares.use((req, res, next) => {
                function handleImplicitHeaders(method: Function) {
                    return function (...args) {
                        if (!res.headersSent) {
                            const code = res.statusCode;
                            // Don't handle error 500 because Vite's dev server has a
                            // special handle for it anyway.
                            if (code >= 400 && code !== 500 && ghostRoutes.has(`/${code}`)) {
                                res.statusCode = 302;
                                res.setHeader('location', `/${code}`);

                                return method.apply(res, args);
                            }
                        }
                        return method.apply(res, args);
                    }
                }

                res.send = handleImplicitHeaders(res.send);
                res.write = handleImplicitHeaders(res.write);
                res.end = handleImplicitHeaders(res.end);

                const writeHead = res.writeHead;

                res.writeHead = function (code, ...args) {
                    // Don't handle error 500 because Vite's dev server has a
                    // special handle for it anyway.
                    if (code >= 400 && code !== 500 && ghostRoutes.has(`/${code}`)) {
                        res.setHeader('location', `/${code}`);
                        code = 302;
                    }
                    return writeHead.call(res, code, ...args);
                };

                next();
            });
        }
    };
}
