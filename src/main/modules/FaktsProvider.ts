import EventEmitter from 'events';
import { readFileSync, watch } from 'fs';

export interface FaktsConfig {
    s3Endpoint?: string;
    authToken?: string;
    [key: string]: any;
}

export class FaktsProvider extends EventEmitter {
    private faktsFilePath: string;
    public currentConfig: FaktsConfig | null = null;

    constructor(filePath: string) {
        super();
        this.faktsFilePath = filePath;
    }

    /**
     * Reads the fakts store and emits a 'config-changed' event anytime the configuration is updated.
     */
    async initialize() {
        this.loadFakts();

        // Watch for config file updates (simulating dynamic environment updates)
        try {
             watch(this.faktsFilePath, (eventType) => {
                 if (eventType === 'change') {
                     this.loadFakts();
                 }
             });
        } catch(e) {
             console.warn(`Watch config file failed on ${this.faktsFilePath}`);
        }
    }

    private loadFakts() {
        try {
            const data = readFileSync(this.faktsFilePath, 'utf-8');
            this.currentConfig = JSON.parse(data);
            this.emit('config-changed', this.currentConfig);
        } catch (e: any) {
             console.error(`Failed to load Fakts config from ${this.faktsFilePath}:`, e.message);
             this.currentConfig = {};
             // Emit config-changed or error if needed
        }
    }
}
