import axios, { AxiosInstance } from 'axios';
import { getProxyForUrl } from 'proxy-from-env';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * Creates an axios instance with proxy support based on environment variables
 */
function createAxiosClient(): AxiosInstance {
    const client = axios.create();

    // Add request interceptor to handle proxy for each request
    client.interceptors.request.use((config) => {
        if (config.url) {
            const proxyUrl = getProxyForUrl(config.url);
            if (proxyUrl) {
                config.httpsAgent = new HttpsProxyAgent(proxyUrl);
            }
        }
        return config;
    });

    return client;
}

// Export a singleton axios instance with proxy support
export const axiosClient = createAxiosClient();
