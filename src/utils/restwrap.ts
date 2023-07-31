import { Results } from "../cli/types.js";

export class Wrapper {
    baseUrl: string;

    constructor(url: string) {
        this.baseUrl = url;
    }

    async doCall(endpoint: string, method: string, body?: any) {
        let options: any = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
        };
        if (body) {
            body = JSON.stringify(body);
            options['body'] = body;
        }
        const url = this.baseUrl + endpoint;
        const response = await fetch(url, options);
        if (response.status !== 200) {
            throw new Error('Error in API call');
        }
        const data = await response.json();
        return data;
    }


    async search(searchTerm: string, clientId: string): Promise<Results[]> {
        const endpoint = '/search';
        const method = 'POST';
        const body = {
            name: searchTerm,
            clientId: clientId
        };
        const data = await this.doCall(endpoint, method, body);
        return data.results;
    }

    async setWallpaper(name: string, clientId: string): Promise<string> {
        const endpoint = '/setWallpaper';
        const method = 'POST';
        const body = {
            name: name,
            clientId: clientId
        };
        const data = await this.doCall(endpoint, method, body);
        return data.name;
    }

    async reddit(url: string, clientId: string): Promise<Results[]> {
        const endpoint = '/reddit';
        const method = 'POST';
        const body = {
            url: url,
            clientId: clientId
        };
        const data = await this.doCall(endpoint, method, body);
        return data.results;
    }

    async random(clientId: string): Promise<string> {
        const endpoint = '/random';
        const method = 'POST';
        const body = {
            clientId: clientId
        };
        const data = await this.doCall(endpoint, method, body);
        return data.results;
    }

    async save(name: string, data: string, clientId: string): Promise<string> {
        const endpoint = '/save';
        const method = 'POST';
        const body = {
            name: name,
            data: data,
            clientId: clientId
        };
        const response = await this.doCall(endpoint, method, body);
        return response.name;
    }

    async download(name: string, url: string, clientId: string): Promise<string> {
        const endpoint = '/download';
        const method = 'POST';
        const body = {
            name: name,
            url: url,
            clientId: clientId
        };
        const response = await this.doCall(endpoint, method, body);
        return response.name;
    }
}
