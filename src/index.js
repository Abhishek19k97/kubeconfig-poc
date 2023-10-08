const express = require("express");
const PropertiesReader = require('properties-reader');
const k8s = require('@kubernetes/client-node');
const NodeCache = require("node-cache");

const app = express();

// Set up the Kubernetes client
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const readPropertyFromData = (data) => {
    const properties = PropertiesReader().read(data).getAllProperties();
    return properties;
};

const cache = new NodeCache({ stdTTL: 30 }); // Cache data for 30 seconds

const fetchAndCacheConfigData = async () => {
    try {
        const cachedConfig = cache.get("config");
        console.log("cached data.", cachedConfig);
        // Check if the cached data is still valid (not expired)
        if (cachedConfig) {
            console.log("Using cached config data.", cachedConfig);
            return cachedConfig;
        }
        const result = await k8sApi.readNamespacedConfigMap('node-config-prop', 'default');
        const configMapData = result.body.data;
        console.log("Using fresh configmap data.", configMapData);
        // Process all properties files from the ConfigMap
        const mergedConfig = {};
        // Assuming each property file has a unique key in the ConfigMap data
        for (const key in configMapData) {
            if (configMapData.hasOwnProperty(key)) {
                const properties = readPropertyFromData(configMapData[key]);
                mergedConfig[key] = properties;
            }
        }
        // Cache the config data with a new TTL
        cache.set("config", mergedConfig, 30); // Cache for 30 seconds
        return mergedConfig;
    } catch (err) {
        console.error(`Error fetching and caching config map: ${err.message}`);
    }
};

app.get('/', (req, res) => {
    res.send(`Node app Configmap cache`);  
});

// Endpoint to fetch the config map
app.get('/k8s-config', async (req, res) => {
    try {
        const config = await fetchAndCacheConfigData();
        res.json({ data: config });
    } catch (err) {
        res.status(500).send(`Error fetching config map: ${err.message} ${JSON.stringify(err)}`);
    }
});

app.listen(3003, (err) => {
    if (!err) console.log('App is running');  
});