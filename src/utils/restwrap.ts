
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


    async search(searchTerm: string) {
        const endpoint = '/search';
        const method = 'POST';
        const body = {
            name: searchTerm
        };
        const data = await this.doCall(endpoint, method, body);
        return data.results;
    }

    async setWallpaper(name: string) {
        const endpoint = '/setWallpaper';
        const method = 'POST';
        const body = {
            name: name
        };
        const data = await this.doCall(endpoint, method, body);
        return data.name;
    }
}
