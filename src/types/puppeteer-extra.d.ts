declare module 'puppeteer-extra' {
    import { Browser, LaunchOptions } from 'puppeteer';
    
    interface PuppeteerExtra {
        use(plugin: any): void;
        launch(options?: LaunchOptions): Promise<Browser>;
    }

    const puppeteer: PuppeteerExtra;
    export default puppeteer;
}

declare module 'puppeteer-extra-plugin-stealth' {
    const StealthPlugin: () => any;
    export default StealthPlugin;
} 