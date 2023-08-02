
export async function showSpinner(signal: AbortSignal) {
    const spinner = document.getElementById('spinner');
    if (!spinner) {
        return;
    }
    spinner.style.display = 'block';
    signal.addEventListener('abort', () => {
        spinner.style.display = 'none';
    });
}
