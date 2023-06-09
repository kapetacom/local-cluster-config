# node-cluster-config

Node library for getting cluster configuration

## Example

```javascript
const request = require('request');
const ClusterConfiguration = require('@kapeta/local-cluster-config');

//Gets the address of the cluster service - e.g. "http://localhost:30500"
const clusterAddress = ClusterConfiguration.getClusterServiceAddress();

request(clusterAddress + '/assets', (err, response, body) => {
    if (err) {
        console.error('Failed to get assets', err.stack);
        return;
    }

    console.log('Received assets\n%s', JSON.stringify(JSON.parse(body), null, 2));
});
```
