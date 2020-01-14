const OS = require('os');
const Path = require('path');
const FS = require('fs');
const YAML = require('yaml');

const BLOCKWARE_CLUSTER_SERVICE_CONFIG_FILE = ".blockware/cluster-service.yml";

const BLOCKWARE_CLUSTER_SERVICE_DEFAULT_PORT = "35100";

const USER_HOMEDIR = OS.homedir();

const BLOCKWARE_DIR = Path.join(USER_HOMEDIR, '.blockware');
const CLUSTER_CONFIG_FILE = Path.join(USER_HOMEDIR, BLOCKWARE_CLUSTER_SERVICE_CONFIG_FILE);
const PROVIDERS_DIR = Path.join(BLOCKWARE_DIR, 'providers');

class ClusterConfiguration {
    constructor() {
        this._clusterConfig = null;
    }

    getClusterServicePort() {
        return this.getClusterConfig().cluster.port;
    }

    getBlockwareBasedir() {
        return BLOCKWARE_DIR;
    }

    /**
     * Gets the base directory of a provider
     * @return {string}
     */
    getProvidersBasedir() {
        return PROVIDERS_DIR;
    }

    /**
     * Gets an array of all provider definitions along with their paths
     *
     * @param [kind] {string} if provided will only return definitions of this kind
     * @return {{path:string,definition:{}}[]}
     */
    getProviderDefinitions(kind) {
        if (!FS.existsSync(this.getProvidersBasedir())) {
            return [];
        }

        const providerFolders = FS.readdirSync(this.getProvidersBasedir());

        return providerFolders
            .map((folder) => Path.join(this.getProvidersBasedir(), folder))
            .map((path) => {
                const ymlPath = Path.join(path, 'blockware.yml');
                const yamlPath = Path.join(path, 'blockware.yml');

                let realPath = ymlPath;
                let exists = false;
                if (FS.existsSync(ymlPath)) {
                    exists = true
                } else if (FS.existsSync(yamlPath)) {
                    exists = true;
                    realPath = yamlPath
                }

                return {
                    path,
                    ymlPath: realPath,
                    exists
                };
            })
            .filter((obj) => obj.exists)
            .map((obj) => {
                const raw = FS.readFileSync(obj.ymlPath).toString();
                return YAML.parseAllDocuments(raw).map((doc) => doc.toJSON()).map((data) => {
                    return {
                        ymlPath: obj.ymlPath,
                        path: obj.path,
                        definition: data
                    };
                });
            })
            .reduce((prev, current) => {
                return prev.concat(current)
            })
            .filter((out) => {
                if (kind) {
                    return out.definition.kind && out.definition.kind.toLowerCase() === kind.toLowerCase();
                }

                return !!out.definition.kind;
            });
    }

    getClusterConfigFile() {
        return CLUSTER_CONFIG_FILE;
    }

    getClusterConfig() {
        if (this._clusterConfig != null) {
            return this._clusterConfig;
        }


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

        console.log('Read cluster config from file: %s', CLUSTER_CONFIG_FILE);

        return this._clusterConfig;
    }

    getClusterServiceAddress() {
        const clusterPort = this.getClusterServicePort();

        return 'http://localhost:' + clusterPort;
    }
}

module.exports = ClusterConfiguration;