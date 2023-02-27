const OS = require('os');
const Path = require('path');
const FS = require('fs');
const YAML = require('yaml');
const Glob = require('glob');

const BLOCKWARE_CLUSTER_SERVICE_CONFIG_FILE = "cluster-service.yml";

const BLOCKWARE_CLUSTER_SERVICE_DEFAULT_PORT = "35100";

const BLOCKWARE_CLUSTER_SERVICE_DEFAULT_HOST = "127.0.0.1"; //Be specific about IPv4

const BLOCKWARE_DIR = process?.env?.BLOCKWARE_HOME ?? Path.join(OS.homedir(), '.blockware');

const CLUSTER_CONFIG_FILE = Path.join(BLOCKWARE_DIR, BLOCKWARE_CLUSTER_SERVICE_CONFIG_FILE);

const REPOSITORY_DIR = Path.join(BLOCKWARE_DIR, 'repository');

const AUTH_TOKEN_PATH = process?.env?.BLOCKWARE_CREDENTIALS ?
    process.env.BLOCKWARE_CREDENTIALS :
    Path.join(BLOCKWARE_DIR, 'authentication.json');

const PROVIDER_TYPES = [
    'core/block-type',
    'core/resource-type-extension',
    'core/resource-type-internal',
    'core/resource-type-operator',
    'core/language-target',
    'core/deployment-target',
];

class ClusterConfiguration {
    constructor() {
        this._clusterConfig = null;
    }

    getClusterServicePort() {
        return this.getClusterConfig().cluster.port;
    }

    getClusterServiceHost() {
        return this.getClusterConfig().cluster.host;
    }

    getBlockwareBasedir() {
        return BLOCKWARE_DIR;
    }

    getAuthenticationPath() {
        return AUTH_TOKEN_PATH;
    }

    /**
     * Gets the base directory of a provider
     * @return {string}
     */
    getRepositoryBasedir() {
        return REPOSITORY_DIR;
    }

    getRepositoryAssetPath(handle, name, version) {
        return Path.join(this.getRepositoryBasedir(), handle, name, version);
    }

    getRepositoryAssetInfoPath(handle, name, version) {
        const assetBase = this.getRepositoryAssetPath(handle, name, version);
        const base = Path.join(this.getRepositoryAssetPath(handle, name, version), '.blockware');

        return {
            baseDir: base,
            assetFile: Path.join(assetBase, 'blockware.yml'),
            versionFile: Path.join(base, 'version.yml'),
        };
    }

    /**
     * Gets an array of all provider definitions along with their paths
     *
     * @param [kindFilter] {string|string[]} if provided will only return definitions of this kind
     * @return {{ymlPath:string,path:string,version:string,hasWeb:boolean,definition:{}}[]}
     */
    getProviderDefinitions(kindFilter) {
        if (!kindFilter) {
            kindFilter = [
                ...PROVIDER_TYPES
            ]
        }
        return this.getDefinitions(kindFilter)
    }

    /**
     * Gets an array of all definitions along with their paths from the local repository
     *
     * @param [kindFilter] {string|string[]} if provided will only return definitions of this kind
     * @return {{ymlPath:string,path:string,version:string,hasWeb:boolean,definition:{}}[]}
     */
    getDefinitions(kindFilter) {
        if (!FS.existsSync(this.getRepositoryBasedir())) {
            return [];
        }

        if (kindFilter &&
            !Array.isArray(kindFilter)) {
            kindFilter = [kindFilter];
        }

        if (kindFilter) {
            kindFilter = kindFilter.map(k => k.toLowerCase());
        }

        const ymlFiles = Glob.sync('**/@(blockware.yml)', {cwd: this.getRepositoryBasedir()});

        const lists = ymlFiles
            .map((folder) => Path.join(this.getRepositoryBasedir(), folder))
            .map((ymlPath) => {
                return {
                    path: Path.dirname(ymlPath),
                    ymlPath
                };
            })
            .map((obj) => {
                const raw = FS.readFileSync(obj.ymlPath).toString();
                let version = 'local';
                const versionInfoFile = Path.join(obj.path, '.blockware','version.yml');
                if (FS.existsSync(versionInfoFile)) {
                    version = YAML.parse(FS.readFileSync(versionInfoFile).toString()).version;
                }

                return YAML.parseAllDocuments(raw).map((doc) => doc.toJSON()).map((data) => {
                    return {
                        ymlPath: obj.ymlPath,
                        path: obj.path,
                        version,
                        definition: data,
                        hasWeb: FS.existsSync(Path.join(obj.path, 'web'))
                    };
                });
            });

        let definitions = [];
        lists.forEach((list) => {
            definitions = definitions.concat(list);
        });

        return definitions
            .filter((out) => {
                if (kindFilter) {
                    return out.definition.kind && kindFilter.indexOf(out.definition.kind.toLowerCase()) > -1;
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

        if (!this._clusterConfig.cluster.host) {
            this._clusterConfig.cluster.host = BLOCKWARE_CLUSTER_SERVICE_DEFAULT_HOST;
        }

        console.log('Read cluster config from file: %s', CLUSTER_CONFIG_FILE);

        return this._clusterConfig;
    }

    getClusterServiceAddress() {
        const clusterPort = this.getClusterServicePort();
        const host = this.getClusterServiceHost();
        return `http://${host}:${clusterPort}`;
    }
}

module.exports = ClusterConfiguration;