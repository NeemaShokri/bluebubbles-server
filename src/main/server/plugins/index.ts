import { Server } from "@server/index";
import { PluginLogger } from "@server/logger/builtins/pluginLogger";
import { ServerDatabase } from "@server/databases/server";
import { Plugin } from "@server/databases/server/entity";

import { PluginBase } from "./base";
import {
    IPluginConfigPropItem,
    IPluginDBConfig,
    IPluginProperties,
    IPluginTypes,
    PluginConstructorParams
} from "./types";
import { PluginTypeMinMaxMap } from "./constants";
import { getPluginIdentifier, parseIdentifier } from "./helpers";

// IMPORT PLUGINS HERE
import DefaultUI from "./ui/default";
import DefaultTray from "./tray/default";
import NgrokPlugin from "./general/ngrok";
import CaffeinatePlugin from "./general/caffeinate";
import NetworkCheckerPlugin from "./general/networkChecker";

/**
 * This is just a helper method to slightly simplify logging. It's
 * essentially a proxy to the server's logger
 */
const logger = {
    info(message: any) {
        Server().logger.info(message);
    },
    debug(message: any) {
        Server().logger.debug(message);
    },
    warn(message: any) {
        Server().logger.warn(message);
    },
    error(message: any) {
        Server().logger.error(message);
    }
};

// REGISTER PLUGINS HERE
const registeredPlugins: any[] = [DefaultUI, DefaultTray, NgrokPlugin, CaffeinatePlugin, NetworkCheckerPlugin];

type LoggerList = { [key: string]: PluginLogger };

class PluginManager {
    private plugins: PluginBase[] = [];

    private pluginProperties: IPluginDBConfig = {};

    private loggers: LoggerList = {};

    get pluginLoggers(): LoggerList {
        return this.loggers;
    }

    async loadPlugins() {
        // If plugins are
        if (this.plugins.length > 0) return;

        logger.info("Loading plugins...");

        // First, import all the plugins
        await this.initiatePlugins();

        logger.info("Loading plugin configurations...");

        // Second, we need to create database entries for the plugins and their configs
        for (const item of this.plugins) {
            try {
                // Get the plugin's info
                let plugin = await Server().db.plugins().findOne({ name: item.config.name, type: item.config.type });

                // If the config doesn't exist yet, create it as disabled (unless it's a default)
                if (!plugin) {
                    // Build the plugin object
                    const newPlugin = await ServerDatabase.createPlugin({
                        name: item.config.name,
                        enabled: false,
                        displayName: item.config.displayName,
                        type: item.config.type,
                        description: item.config.description,
                        version: item.config.version,
                        properties: item.config.properties
                    });

                    // Save the plugin to the database
                    plugin = await Server().db.plugins().save(newPlugin);
                }

                // Save the plugin properties to the map
                this.pluginProperties[getPluginIdentifier(plugin.type as IPluginTypes, plugin.name)] = {
                    enabled: plugin.enabled,
                    properties: plugin.properties as IPluginConfigPropItem[]
                };

                logger.info(`  -> Loaded ${item.id}...`);
            } catch (ex) {
                logger.error(`Failed to load plugin configuration for, "${item.id}"`);
                console.trace();
            }
        }

        logger.info(`Successfully loaded ${Object.keys(this.pluginProperties).length} plugins!`);
    }

    async startPlugins() {
        logger.info(`Starting ${this.plugins.length} plugins...`);

        // Determine if anything needs to be enabled, based on the type's max/min instances
        // This is a safety feature
        for (const pluginType of Object.keys(PluginTypeMinMaxMap)) {
            logger.info(`  -> Starting ${pluginType} plugins...`);
            const { min, max } = PluginTypeMinMaxMap[pluginType];

            // Start the plugins that are already enabled
            const plugins = this.getPluginsByType(pluginType as IPluginTypes);
            for (const plugin of plugins) {
                const props = this.getPluginProperties(plugin.id);
                if (!props?.enabled) continue;

                try {
                    // Start the plugin, if enabled
                    logger.debug(`    -> Starting plugin: ${plugin.config.name}`);
                    await this.initiatePlugin(plugin);
                } catch (ex) {
                    logger.error(`Failed to start plugin, '${plugin.config.name}'`);
                    console.trace();
                }
            }

            // If the minimum for the type is null, we can have unlimited
            logger.debug(`    -> Instance Requirements - Min: ${min}, Max: ${max}`);
            if (min === null) {
                continue;
            }

            // Get the count for each type
            const meetsReqs = () => {
                const typeCount = this.getEnabledPluginsByType(pluginType).length;
                return typeCount >= min && typeCount <= (max ?? Number.POSITIVE_INFINITY);
            };

            // If the count for a given type of plugin doesn't meet the requirements,
            // Try to find the first one to enable (or a default)
            if (meetsReqs()) continue;
            logger.warn(`    -> Failed initial requirements test. Enabling defaults...`);

            // See if there are any defaults
            const defaults = this.plugins.filter(
                item => item.config.name === "default" && item.config.type === pluginType
            );

            // If there are defaults, turn them on
            for (const p of defaults) {
                await this.togglePlugin(p.id, true);

                // If we meet the requirements now, stop looping
                if (meetsReqs()) break;
            }

            // If we still require to turn on more, turn on any to meet the requirements
            if (meetsReqs()) continue;
            logger.warn(`    -> Failed requirements test after enabling defaults. Enabling others...`);

            const nonDefaults = this.plugins.filter(item => item.config.name !== "default");

            // If there are defaults, turn them on
            for (const p of nonDefaults) {
                await this.togglePlugin(getPluginIdentifier(p.config.type, p.config.name), true);

                // If we meet the requirements now, stop looping
                if (meetsReqs()) break;
            }

            // If all of our efforts fail, don't do anything, but show a log
            if (!meetsReqs()) {
                logger.warn(`  -> Failed to load plugins to meet instance requirements for plugin type: ${pluginType}`);
            }
        }
    }

    async unloadPlugins() {
        for (const plugin of this.plugins) {
            try {
                this.unloadPlugin(getPluginIdentifier(plugin.config.type, plugin.config.name));
            } catch (err) {
                logger.info(`Failed to unload plugin, '${plugin.config.name}': ${err}`);
            }
        }
    }

    async unloadPlugin(identifier: string) {
        const plugin = this.getPlugin(identifier);
        if (plugin) {
            await plugin.destroy();
        } else {
            throw new Error(`Plugin '${identifier}' does not exist!`);
        }
    }

    private async initiatePlugins() {
        for (const RegisteredPlugin of registeredPlugins) {
            try {
                // Instantiate the plugin
                const params: PluginConstructorParams = {
                    globalConfig: Server().config,
                    config: null // To be filled out by the plugin
                };

                const plugin = new RegisteredPlugin(params);

                // Add the plugin to the list
                this.plugins.push(plugin);

                // Register the logger with the manager
                this.registerLogger(plugin.logger);

                logger.info(`  -> Loaded ${plugin.id}...`);
            } catch (err) {
                logger.error(`Failed to load plugin!`);
                console.trace();
            }
        }
    }

    getPluginLogger(pluginName: string): PluginLogger {
        if (!Object.keys(this.loggers).includes(pluginName)) return null;
        return this.loggers[pluginName];
    }

    registerLogger(pLogger: PluginLogger) {
        if (Object.keys(this.loggers).includes(pLogger.name)) {
            throw new Error("This logger has already been registered!");
        }

        this.loggers[pLogger.name] = pLogger;
    }

    getPluginsByType(type: IPluginTypes): PluginBase[] {
        return this.plugins.filter(item => item.config.type === type);
    }

    getPlugin(identifier: string): PluginBase {
        const { name, type } = parseIdentifier(identifier);
        const plugins = this.plugins.filter(item => item.config.name === name && item.config.type === type);
        return plugins.length > 0 ? plugins[0] : null;
    }

    getPluginProperties(identifier: string): IPluginProperties {
        if (!Object.keys(this.pluginProperties).includes(identifier)) {
            return null;
        }

        return this.pluginProperties[identifier];
    }

    getPluginProperty(identifier: string, name: string): any {
        if (!Object.keys(this.pluginProperties).includes(identifier)) {
            throw new Error(`Plugin identifier '${identifier}' does not exist!`);
        }

        if (!Object.keys(this.pluginProperties[identifier].properties).includes(name)) {
            throw new Error(`Plugin property '${name}' does not exist!`);
        }

        return this.pluginProperties[identifier].properties[name].value;
    }

    setPluginProperty(identifier: string, name: string, value: any) {
        if (!Object.keys(this.pluginProperties).includes(identifier)) {
            throw new Error(`Plugin identifier '${identifier}' does not exist!`);
        }

        if (!Object.keys(this.pluginProperties[identifier].properties).includes(name)) {
            throw new Error(`Plugin property '${name}' does not exist!`);
        }

        this.pluginProperties[identifier].properties[name] = value;
    }

    getPluginCountByType(type: string): number {
        return this.plugins.filter(item => item.config.type === type).length;
    }

    evalDotCondition(condition: string) {
        // If there is no plugin name, return false
        if (!condition.includes(".")) return false;
        const propSplit = condition.split(".");
        if (propSplit.length < 3) return false;

        const type = propSplit[0];
        const name = propSplit[1];

        // If the plugin doesn't exist, return false
        const props = this.getPluginProperties(getPluginIdentifier(type as IPluginTypes, name));
        if (!props) return false;

        // If the config name doesn't exist, return false
        const configs = props.properties;
        const propName = propSplit[1];
        if (!Object.keys(configs).includes(propName)) return false;

        // If all validation passes, return the eval
        // eslint-disable-next-line no-unneeded-ternary
        return configs[propName] ? true : false;
    }

    isPluginRunning(identifier: string) {
        const { type, name } = parseIdentifier(identifier);
        const plugins = this.plugins.filter(
            item => item.config.name === name && item.config.type === type && item.isRunning
        );

        // eslint-disable-next-line no-unneeded-ternary
        return plugins.length > 0 ? true : false;
    }

    async initiatePlugin(plugin: PluginBase) {
        // First, check if the plugin is already initiated/running
        // Don't do anything if it is
        if (this.isPluginRunning(plugin.id)) {
            return;
        }

        // Second, check if the plugin requires any other plugins to run
        for (const identifier of plugin.config.dependencies ?? []) {
            const dep = this.getPlugin(identifier);

            // If the dependency can't be found, throw an error
            if (!dep) {
                throw new Error(`Failed to initiate plugin, ${plugin.id}; Dependency, ${identifier} does not exist!`);
            }

            // If we found the depdency, initiate it
            await this.initiatePlugin(dep);
        }

        // Lastly, startup the plugin
        await plugin.initiate();
    }

    getEnabledPlugins() {
        const enabledList = Object.keys(this.pluginProperties).filter(item => this.pluginProperties[item].enabled);
        return this.plugins.filter(item => enabledList.includes(item.id));
    }

    getEnabledPluginsByType(type: string) {
        return this.getEnabledPlugins().filter(item => item.config.type === type);
    }

    async togglePlugin(identifier: string, enabled: boolean) {
        // If we can't get any props, don't do anything
        const currentProps = this.getPluginProperties(identifier);
        if (!currentProps) return;

        // If it's already enabled/disabled, return
        if (currentProps.enabled === enabled) return;

        // Get the corresponding plugin and return if it doesn't exist
        const plugin = this.getPlugin(identifier);
        if (!plugin) return;

        // Turn the plugin on/off
        this.pluginProperties[identifier].enabled = enabled;

        // Enable it in the database
        await this.togglePluginInDB(identifier, enabled);

        // Startup/Shutdown the plugin
        if (enabled) {
            await plugin.initiate();
        } else {
            await plugin.destroy();
        }
    }

    dispatchGlobalConfigUpdate() {
        for (const i of this.plugins) {
            i.onGlobalConfigUpdate(Server().config);
        }
    }

    // eslint-disable-next-line class-methods-use-this
    private async togglePluginInDB(identifier: string, enabled: boolean) {
        const { name, type } = parseIdentifier(identifier);
        const dbPlugin = await Server().db.plugins().findOne({ name, type });
        await Server()
            .db.plugins()
            .createQueryBuilder()
            .update(Plugin)
            .set({ enabled: () => (enabled ? "1" : "0") })
            .where("id = :id", { id: dbPlugin.id })
            .execute();
    }
}

export { PluginManager };