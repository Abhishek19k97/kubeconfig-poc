// const express = require("express");
// const PropertiesReader = require('properties-reader');
// const k8s = require('@kubernetes/client-node');

// const app = express();

// // Set up the Kubernetes client
// const kc = new k8s.KubeConfig();
// kc.loadFromDefault();

// const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// const readPropertyFromData = (data) => {
//     const properties = PropertiesReader().read(data).getAllProperties();
//     return properties;
//   };

// let currentConfig = {}; // Store the current configuration

// // Function to read and parse the ConfigMap data
// const readConfigFromConfigMap = async () => {
//     try {
//         const result = await k8sApi.readNamespacedConfigMap('node-config-prop', 'default'); // Replace with your config map name and namespace
//         const configData = readPropertyFromData(result.body.data['config.properties']);
//         const configNewData = readPropertyFromData(result.body.data['configNew.properties']);
//         currentConfig = { ...configData, ...configNewData };
//         console.log("Updated config:", currentConfig);
//     } catch (err) {
//         console.error(`Error fetching config map: ${err.message} ${JSON.stringify(err)}`);
//     }
// };

// // Function to watch for changes to the ConfigMap
// // const watchConfigMap = () => {
// //     const watch = new k8s.Watch(kc);
// //     watch.watch('/api/v1/namespaces/default/configmaps/node-config-prop', {}, (type, obj) => {
// //         if (type === 'MODIFIED') {
// //             console.log("ConfigMap modified. Updating config.");
// //             readConfigFromConfigMap();
// //         }
// //     });
// // };
// // const watchConfigMap = () => {
//     const watch = new k8s.Watch(kc);
//     // console.log("k8s watcher initiated for the first time");
//     // const watchRequest = watch.watch('/api/v1/namespaces/default/configmaps/node-config-prop', {}, (type, obj) => {
//     //     console.log("k8s watcher triggered");
//     //     if (type === 'ADDED') {
//     //         console.log('new object:');
//     //     } else if (type === 'MODIFIED') {
//     //         console.log('changed object:');
//     //         readConfigFromConfigMap();
//     //     } else if (type === 'DELETED') {
//     //         console.log('deleted object:');
//     //     } else {
//     //         console.log('unknown type: ' + type);
//     //     }
//     //     console.log(obj);
//     // }, (err) => {
//     //     if (err) {
//     //         console.error('Error occurred during watch:', err);
//     //     }
//     // });

//     // Ensure your watcher is actually connecting
//     watch.watch('/api/v1/namespaces/default/configmaps/node-config-prop',
//     (type, object) => {
//       console.log('Received an event:', type, object);
//       console.log("k8s watcher triggered");
//         if (type === 'ADDED') {
//             console.log('new object:');
//         } else if (type === 'MODIFIED') {
//             console.log('changed object:');
//             readConfigFromConfigMap();
//         } else if (type === 'DELETED') {
//             console.log('deleted object:');
//         } else {
//             console.log('unknown type: ' + type);
//         }
//         console.log(obj);
//     },
//     (err) => {
//       console.error('Failed to initialize watch:', err);
//     },
//     // Optional params; you can ignore this if not needed
//     {},
//     // The done callback is called when the watch is closed
//     (err, result) => {
//       if (err) {
//         console.error('Watch closed with error:', err);
//       } else {
//         console.log('Watch closed gracefully.');
//       }
//     }
//   );

//     // Optionally, you can handle the watch request lifecycle (e.g., close the watch when needed)
//     // For example, you can close the watch when your Node.js application exits:
//     // process.on('exit', () => {
//     //     if (watchRequest) {
//     //         watchRequest.abort();
//     //     }
//     // });
// // };

// // Read the initial ConfigMap data
// readConfigFromConfigMap();

// // Watch for changes to the ConfigMap
// // watchConfigMap();

// app.get('/', (req, res) => {
//     res.send(`App config prop success with k8s resource watcher`);  
// });

// app.get('/k8s-config', (req, res) => {
//     res.json(currentConfig);
// });

// app.listen(3003, () => {
//     console.log('Server is running on port 3003');
// });




const express = require("express");
const PropertiesReader = require('properties-reader');
const k8s = require('@kubernetes/client-node');

const app = express();

// Set up the Kubernetes client
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sWatch = new k8s.Watch(kc);

const readPropertyFromData = (data) => {
    const properties = PropertiesReader().read(data).getAllProperties();
    return properties;
};

let config = {};

// Watch function for ConfigMap
const startWatchingConfigMap = () => {
    const watchPath = `/api/v1/namespaces/default/configmaps/node-config-prop`;
    
    k8sWatch.watch(watchPath,
        {},
        (type, object) => {
            console.log('type, obj:', type, object);
            if (type === 'ADDED' || type === 'MODIFIED') {
                console.log('ConfigMap changed:', object);
                
                if (object && object.data) {
                    config = {
                        ...config,
                        ...readPropertyFromData(object.data['config.properties']),
                        ...readPropertyFromData(object.data['configNew.properties'])
                    };
                }
                console.log('Updated Config from K8s:', config);
            }
        },
        (err) => {
            if (err) {
                console.error('Watch closed with error:', err);
            } else {
                console.log('Watch closed gracefully.');
            }
            setTimeout(startWatchingConfigMap, 5000); // Restart the watch if it closes
        }
    );
};

startWatchingConfigMap();

app.get('/', (req, res) => {
    res.send(`App config prop success - Greeting: ${config.greeting || "Default Greeting"}, Name: ${config.name || "Default Name"}, City: ${config.city || "Default city"}, isXCC: ${config.isXCC || 'false'}`);  
});

app.get('/config', (req, res) => {
    res.send(`Greeting: ${config.greeting || "Default Greeting"}, Name: ${config.name || "Default Name"}, City: ${config.city || "Default city"}, isXCC: ${config.isXCC || 'false'}`);
});

// Endpoint to fetch the config map
app.get('/k8s-config', async (req, res) => {
    try {
        const result = await k8sApi.readNamespacedConfigMap('node-config-prop', 'default');
        let configData = readPropertyFromData(result.body.data['config.properties']);
        let configNewData = readPropertyFromData(result.body.data['configNew.properties']);
        res.json({ data: {...configData, ...configNewData} });
    } catch (err) {
        res.status(500).send(`Error fetching config map: ${err.message} ${JSON.stringify(err)}`);
    }
});

app.listen(3003, (err) => {
    if (!err) console.log('App is running');  
});