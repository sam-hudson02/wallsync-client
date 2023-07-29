export function parseMessage(message: string): Map<string, string> {
    const parts = message.split('\n');
    const map = new Map<string, string>();
    for (let part of parts) {
        const [key, value] = part.split(':');
        if (!key || !value) {
            throw new Error('Invalid Message');
        }
        map.set(key.trim(), value.trim());
    }
    return map;
}
