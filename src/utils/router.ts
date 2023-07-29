export type Route = {
    key: string,
    handler: (data: string) => void
}

type RouteMap = Map<string, (data: string) => void>;

export class Router {
    private routes: RouteMap
    constructor(routes?: Route[]) {
        this.routes = new Map();
        if (routes) {
            this.addRoutes(routes);
        }
    }

    public addRoutes(routes: Route[]) {
        routes.forEach(route => {
            console.log(`Adding route ${route.key}`);
            this.routes.set(route.key, route.handler);
        });
    }

    public deleteRoute(key: string) {
        this.routes.delete(key);
    }

    public getRoutes() {
        return this.routes;
    }

    public route(key: string, data: string) {
        const route = this.routes.get(key);
        if (route) {
            route(data);
        } else {
            console.log(`No route found for ${key}`);
        }
    }
}


