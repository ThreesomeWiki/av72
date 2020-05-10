const proxy = require('ip-proxy-pool');
const { promisify } = require('util');

const timeAsync = promisify(setTimeout);

const getIps = async () => {
    await timeAsync(5000);
    proxy.run();
    await timeAsync(5000);
    getIps();
};

getIps();
