const os = require('os');

export function getServerIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

export function delay(time) {
    return new Promise(function(resolve) {
        setTimeout(resolve, time);
    });
}

export async function loop(func, interval){
    await func()
    setTimeout(async ()=>{
        await loop(func, interval)
    }, interval)
}