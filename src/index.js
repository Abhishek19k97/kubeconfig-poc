const express = require("express");
const PropertiesReader = require('properties-reader');
const k8s = require('@kubernetes/client-node');

const app = express();

// Set up the Kubernetes client
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const readPropertyFromData = (data) => {
    const properties = PropertiesReader().read(data).getAllProperties();
    return properties;
};

let config = {};


// Function to fetch and cache ConfigMap data
const fetchAndCacheConfigData = async () => {
    try {
        const result = await k8sApi.readNamespacedConfigMap('node-config-prop', 'default');
        let configData = readPropertyFromData(result.body.data['config.properties']);
        let configNewData = readPropertyFromData(result.body.data['configNew.properties']);
        config = {...configData, ...configNewData};
        console.log('fetchAndCacheConfigData ran config', config)
    } catch (err) {
        console.error(`Error fetching and caching config map: ${err.message}`);
    }
};

// Fetch and cache ConfigMap data during application startup
fetchAndCacheConfigData();

// Periodically fetch and cache ConfigMap data (e.g., every 5 minutes)
setInterval(fetchAndCacheConfigData, 5 * 60 * 1000); // 5 minutes


app.get('/', (req, res) => {
    res.send('Fetching fresh configmap data after every 5 minutes');  
});

app.get('/config', (req, res) => {
    res.send(`Greeting: ${config.greeting || "Default Greeting"}, Name: ${config.name || "Default Name"}, City: ${config.city || "Default city"}, isXCC: ${config.isXCC || 'false'}`);
});

app.listen(3003, (err) => {
    if (!err) console.log('App is running');  
});