const EventEmitter = require('events');
const puppeteer = require('puppeteer');

class Puppeteer extends EventEmitter {

  constructor({siteKey, interval, host, port, server, threads, proxy}) {
    super();
    this.inited = false;
    this.dead = false;
    this.host = host;
    this.port = port;
    this.server = server;
    this.browser = null;
    this.page = null;
    this.proxy = proxy;
    this.options = {siteKey, interval, threads};
  }

  async getBrowser() {
    if (this.browser) {
      return this.browser;
    }
    this.browser = await puppeteer.launch({ args: this.proxy ? ['--no-sandbox','--proxy-server='+this.proxy] : ['--no-sandbox'] });
    return this.browser;
  }

  async getPage() {
    this.page = await (await this.getBrowser()).newPage();
    return this.page;
  }

  async init() {

    if (this.dead) {
      throw new Error('This miner has been killed');
    }

    //if (this.inited) {
    //  return this.page;
    //}

    const url = process.env.COINHIVE_PUPPETEER_URL || `http://${this.host}:${this.port}`;
    for(var i = 0; i < 2; i = i+1) {
      let page = await this.getPage();
      await page.goto(url);
      await page.evaluate(({siteKey, interval, threads}) => window.init({siteKey, interval, threads}), this.options);
      await this.sleep(2000);
    }
    this.inited = true;

    return this.page;
  }

  async start() {
    await this.init();
    return this.page.evaluate(() => window.start());
  }

  async stop() {
    await this.init();
    return this.page.evaluate(() => window.stop());
  }

  async kill() {
    try {
      await this.stop();
    } catch (e) { console.log('Error stopping miner', e) }
    try {
      const browser = await this.getBrowser();
      await browser.close();
    } catch (e) { console.log('Error closing browser', e) }
    try {
      if (this.server) {
        this.server.close();
      }
    } catch (e) { console.log('Error closing server', e) }
    this.dead = true;
  }

  async rpc(method, args) {
    await this.init();
    return this.page.evaluate((method, args) => window.miner[method].apply(window.miner, args), method, args)
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}

module.exports = function getPuppeteer(options = {}) {
  return new Puppeteer(options);
}
