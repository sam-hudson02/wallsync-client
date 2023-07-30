
// dynamic import
export const importTermImages = async () => {
    const terminalImage = await import('terminal-image');
    return terminalImage;
}
