const proxy = require('ip-proxy-pool');
const axios = require('axios');
const { promisify } = require('util');
const _ = require('lodash');
const path = require('path');
const writeFile = promisify(require('fs').writeFile);
const stat = promisify(require('fs').stat);
const timeout = promisify(setTimeout);
const execAsync = promisify(require('child_process').exec);
const m3u8ToMp4 = require('m3u8-to-mp4');
const converter = new m3u8ToMp4();

// fork('./ips.js');

const getProxy = (type = 'HTTPS') => {
    const ips = proxy.ips;
    return new Promise((resolve, reject) => {
        ips(async (err, res) => {
            if (err) return reject(err);
            const ips = res.filter(ip => true || ip.type === type);
            console.log('代理池:', ips.length);
            resolve(_.sample(ips));
        });
    });
};

const get = async (url, { disableProxy }) => {
    await timeout(1000 * 5);
    const config = { timeout: 1000 * 120 };
    if (!disableProxy) {
        const type = url.split('://')[0].toUpperCase();
        const { ip, port } = await getProxy(type);
        config.proxy = {
            host: ip,
            port,
        };
    }
    const ret = await axios.get(url, config);
    return ret;
};

const downloadMP4 = async url => {
    try {
        const baseUrl = url.split('/').reverse().slice(1).reverse().join('/');
        const name = baseUrl.split('/').reverse()[0];
        // mkdir
        await execAsync(`cd ${path.resolve(__dirname, './mp4')} && mkdir ${name}`).catch(() => {});
        // download m3u8
        await axios.get(url, { responsetype: 'arraybuffer' }).then(async data => {
            if (data.data) {
                await writeFile(path.resolve(__dirname, `./mp4/${name}/index.m3u8`), data.data, 'buffer');
            }
        });
    } catch (e) {
        console.log(e);
    }
};

const getData = async (url, type) => {
    try {
        const ret = await get(url, { disableProxy: true });
        if (ret.data.code === 0) {
            const list = ret.data.data;
            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                const title = item.title.replace(/ /g, '') + (type === 'mp4' ? '.mp4' : '');
                const exit = await stat(path.resolve(__dirname, `./${type}/${title}`)).catch(() => {});
                console.log('exit:', exit);
                if (!(exit && exit.isFile())) {
                    const urls = {
                        article: `https://www.aa4595.com/appapi/h5/getInforDetailById/${item.id}/dynamic`,
                        mp4: `https://www.aa4595.com/appapi/h5/getInforDetailById/${item.id}/mv`,
                    };
                    const article = await get(urls[type], { disableProxy: true });
                    if (article.data.code === 0) {
                        if (type === 'acticle') {
                            await writeFile(
                                path.resolve(__dirname, `./article/${title}`),
                                article.data.data.content,
                                'utf-8'
                            );
                        } else if (type === 'mp4') {
                            console.log(`https://www.845430.com${article.data.data.mvUrl}`);
                            // await converter
                            //     .setInputFile(`https://www.845430.com${article.data.data.mvUrl}`)
                            //     .setOutputFile(__dirname + `/mp4/${title}`)
                            //     .start()
                            //     .then(() => {
                            //         console.log('install success');
                            //     })
                            //     .catch(e => {
                            //         console.log('install fail', e);
                            //     });
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.log(e);
    }
};

(async () => {
    // article
    for (let i = 1; i < 10; i++) {
        // await getData(`https://www.aa4595.com/appapi/h5/inforChange/dynamic/31/6/${i}`,'article');
    }
    // video
    for (let i = 2; i < 3; i++) {
        // await getData(`https://www.aa4595.com/appapi/h5/index/getRandom/954/${i}`, 'mp4');
    }

    downloadMP4('https://www.845430.com/201907/02ff09db/index.m3u8');
})();
