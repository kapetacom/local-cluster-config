const OS = require('os');
const Path = require('path');
const FS = require('fs');
const YAML = require('yaml');

const BLOCKWARE_CLUSTER_SERVICE_CONFIG_FILE = ".blockware/cluster-service.yml";
const BLOCKWARE_CLUSTER_SERVICE_DEFAULT_PORT = "35100";

const USER_HOMEDIR = OS.homedir();
const CLUSTER_CONFIG_FILE = Path.join(USER_HOMEDIR, BLOCKWARE_CLUSTER_SERVICE_CONFIG_FILE);

class ClusterConfiguration {
    constructor() {
        this._clusterConfig = null;
    }

    getClusterServicePort() {
        return this.getClusterConfig().cluster.port;
    }

    getClusterConfig() {
        if (this._clusterConfig != null) {
            return this._clusterConfig;
        }

        const userHomeDir = OS.homedir();



        this._clusterConfig = {};

        if (FS.existsSync(CLUSTER_CONFIG_FILE)) {
            const rawYAML = FS.readFileSync(CLUSTER_CONFIG_FILE).toString();

            this._clusterConfig = YAML.parse(rawYAML);
        }

        if (!this._clusterConfig.cluster) {
            this._clusterConfig.cluster = {};
        }

        if (!this._clusterConfig.cluster.port) {
            this._clusterConfig.cluster.port = BLOCKWARE_CLUSTER_SERVICE_DEFAULT_PORT;
        }

        console.log('Read cluster config from file: %s', configFile);

        return this._clusterConfig;
    }

    getClusterServiceAddress() {
        const clusterPort = this.getClusterServicePort();

        return 'http://localhost:' + clusterPort;
    }
}

module.exports = ClusterConfiguration;