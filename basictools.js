"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loop = exports.delay = exports.getServerIP = void 0;
const os = require('os');
function getServerIP() {
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
exports.getServerIP = getServerIP;
function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}
exports.delay = delay;
async function loop(func, interval) {
    await func();
    setTimeout(async () => {
        await loop(func, interval);
    }, interval);
}
exports.loop = loop;
