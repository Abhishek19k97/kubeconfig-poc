const fs = require('fs');
const express = require("express");
const path = require('path');
const chokidar = require("chokidar");
const PropertiesReader = require('properties-reader');
const app = express();

const configMapDirectoryPath = '/config'; 
let configMapData = {};

// Function to read a ConfigMap data from a file
const readConfigMap = (filePath) => {
    const config = PropertiesReader(filePath);
    return config.getAllProperties();
  };

// Watch for changes in the ConfigMap directory
const watchConfigMaps = () => {
    const watcher = chokidar.watch(configMapDirectoryPath, { persistent: true });
  
    watcher.on('change', (filePath) => {
      console.log(`ConfigMap file ${filePath} has changed.`);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        configMapData = {...configMapData, ...readConfigMap(filePath)};
        console.log('Updated ConfigMap data:', configMapData);
      }
    });
    watcher.on('error', (error) => {
      console.error('Error watching ConfigMap directory:', error);
    });
  };
  
  // Function to read all initial ConfigMap data
  const readInitialConfigMaps = () => {
    const files = fs.readdirSync(configMapDirectoryPath);
  
    for (const file of files) {
      const filePath = path.join(configMapDirectoryPath, file);
      if (fs.statSync(filePath).isFile()) {
        configMapData = {...configMapData, ...readConfigMap(filePath)};
        console.log(`Initial ConfigMap data from ${filePath}:`, configMapData);
      }
    }
  };
  
  // Start by reading the initial ConfigMap data
  readInitialConfigMaps();
  
  // Then, start watching the ConfigMap directory for changes
  watchConfigMaps();

app.get('/', (req, res) => {
    res.send(`App config prop success - Greeting: ${configMapData.greeting || "Default Greeting"}, Name: ${configMapData.name || "Default Name"}, City: ${configMapData.city || "Default city"}, isXCC: ${configMapData.isXCC || 'false'}`);  
});

app.get('/config', (req, res) => {
    res.send(`Greeting: ${configMapData.greeting || "Default Greeting"}, Name: ${configMapData.name || "Default Name"}, City: ${configMapData.city || "Default city"}, isXCC: ${configMapData.isXCC || 'false'}`);
});

app.listen(3003, (err) => {
    if (!err) console.log('App is running');  
});