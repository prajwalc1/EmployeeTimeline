/**
 * Schwarzenberg Tech Employee Time Management System
 * Module Manager - Inspired by Odoo's architecture
 * 
 * This script handles loading and managing application modules
 */

const fs = require('fs');
const path = require('path');
const configManager = require('../server-config');

class ModuleManager {
  constructor() {
    this.modules = {};
    this.availableModules = {};
    this.modulePath = process.env.MODULE_PATH || path.join(__dirname);
    this.initialized = false;
  }
  
  /**
   * Initialize the module system
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }
    
    console.log('Initializing Module Manager...');
    
    try {
      // Discover available modules
      await this.discoverModules();
      
      // Load enabled modules
      await this.loadEnabledModules();
      
      this.initialized = true;
      
      console.log('Module Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Module Manager:', error);
      return false;
    }
  }
  
  /**
   * Discover available modules
   */
  async discoverModules() {
    try {
      const moduleDirs = fs.readdirSync(this.modulePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const moduleName of moduleDirs) {
        const manifestPath = path.join(this.modulePath, moduleName, 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            this.registerModule(moduleName, manifest, path.join(this.modulePath, moduleName));
          } catch (error) {
            console.error(`Error loading manifest for module ${moduleName}:`, error);
          }
        }
      }
      
      console.log(`Discovered ${Object.keys(this.availableModules).length} modules`);
    } catch (error) {
      console.error('Error discovering modules:', error);
      throw error;
    }
  }
  
  /**
   * Register a module
   * @param {string} name - Module name
   * @param {object} manifest - Module manifest
   * @param {string} path - Module path
   */
  registerModule(name, manifest, modulePath) {
    this.availableModules[name] = {
      name,
      manifest,
      path: modulePath,
      loaded: false
    };
    
    console.log(`Registered module: ${name} (${manifest.version})`);
  }
  
  /**
   * Load all enabled modules
   */
  async loadEnabledModules() {
    // Get all modules that should be loaded
    const modulesToLoad = [];
    
    // First, add all modules marked as required
    for (const [name, module] of Object.entries(this.availableModules)) {
      if (module.manifest.required) {
        modulesToLoad.push(name);
      }
    }
    
    // Then, add all modules that are enabled in the config
    for (const [name, module] of Object.entries(this.availableModules)) {
      if (!modulesToLoad.includes(name)) {
        const isEnabled = configManager.get(`modules.${name}.enabled`, module.manifest.autoInstall || false);
        
        if (isEnabled) {
          modulesToLoad.push(name);
        }
      }
    }
    
    // Sort modules by dependencies
    const sortedModules = this.sortModulesByDependencies(modulesToLoad);
    
    // Load modules in order
    for (const moduleName of sortedModules) {
      await this.loadModule(moduleName);
    }
  }
  
  /**
   * Load a single module
   * @param {string} name - Module name
   */
  async loadModule(name) {
    try {
      if (this.modules[name]) {
        console.log(`Module ${name} is already loaded`);
        return true;
      }
      
      const moduleInfo = this.availableModules[name];
      
      if (!moduleInfo) {
        console.error(`Module ${name} is not available`);
        return false;
      }
      
      // Check dependencies
      const dependencies = moduleInfo.manifest.depends || [];
      
      for (const dependency of dependencies) {
        if (!this.modules[dependency]) {
          // Try to load dependency first
          const success = await this.loadModule(dependency);
          
          if (!success) {
            console.error(`Failed to load dependency ${dependency} for module ${name}`);
            return false;
          }
        }
      }
      
      // Load the module
      console.log(`Loading module: ${name}`);
      
      const modulePath = path.join(moduleInfo.path, 'index.js');
      const ModuleClass = require(modulePath);
      const module = new ModuleClass();
      
      // Initialize the module
      await module.initialize();
      
      // Register the module
      this.modules[name] = module;
      this.availableModules[name].loaded = true;
      
      console.log(`Module ${name} loaded successfully`);
      return true;
    } catch (error) {
      console.error(`Error loading module ${name}:`, error);
      return false;
    }
  }
  
  /**
   * Sort modules by dependencies
   * @param {string[]} moduleNames - List of module names
   * @returns {string[]} Sorted module names
   */
  sortModulesByDependencies(moduleNames) {
    const result = [];
    const visited = {};
    const temp = {};
    
    const visit = (name) => {
      if (temp[name]) {
        // Circular dependency detected
        throw new Error(`Circular dependency detected for module ${name}`);
      }
      
      if (visited[name]) {
        return;
      }
      
      temp[name] = true;
      
      const module = this.availableModules[name];
      if (module) {
        const dependencies = module.manifest.depends || [];
        
        for (const dependency of dependencies) {
          if (moduleNames.includes(dependency)) {
            visit(dependency);
          }
        }
      }
      
      temp[name] = false;
      visited[name] = true;
      result.push(name);
    };
    
    try {
      for (const name of moduleNames) {
        visit(name);
      }
      
      return result;
    } catch (error) {
      console.error('Error sorting modules:', error);
      return moduleNames; // Fallback to original order
    }
  }
  
  /**
   * Get a loaded module instance
   * @param {string} name - Module name
   * @returns {object|null} Module instance
   */
  getModule(name) {
    return this.modules[name] || null;
  }
  
  /**
   * Check if a module is loaded
   * @param {string} name - Module name
   * @returns {boolean} Whether the module is loaded
   */
  isModuleLoaded(name) {
    return !!this.modules[name];
  }
  
  /**
   * Get all loaded modules
   * @returns {object[]} List of loaded modules
   */
  getLoadedModules() {
    return Object.values(this.modules);
  }
  
  /**
   * Get all available modules
   * @returns {object[]} List of all available modules
   */
  getAvailableModules() {
    return Object.entries(this.availableModules).map(([name, info]) => ({
      name,
      version: info.manifest.version,
      description: info.manifest.description,
      author: info.manifest.author,
      category: info.manifest.category,
      loaded: info.loaded,
      required: info.manifest.required || false,
      autoInstall: info.manifest.autoInstall || false,
      depends: info.manifest.depends || []
    }));
  }
  
  /**
   * Install a module
   * @param {string} name - Module name
   * @returns {boolean} Success status
   */
  async installModule(name) {
    try {
      const moduleInfo = this.availableModules[name];
      
      if (!moduleInfo) {
        console.error(`Module ${name} is not available`);
        return false;
      }
      
      if (this.isModuleLoaded(name)) {
        console.log(`Module ${name} is already installed`);
        return true;
      }
      
      // Enable the module in the configuration
      configManager.set(`modules.${name}.enabled`, true);
      configManager.save();
      
      // Load the module
      const success = await this.loadModule(name);
      
      return success;
    } catch (error) {
      console.error(`Error installing module ${name}:`, error);
      return false;
    }
  }
  
  /**
   * Uninstall a module
   * @param {string} name - Module name
   * @returns {boolean} Success status
   */
  async uninstallModule(name) {
    try {
      if (!this.isModuleLoaded(name)) {
        console.log(`Module ${name} is not installed`);
        return true;
      }
      
      const moduleInfo = this.availableModules[name];
      
      if (moduleInfo && moduleInfo.manifest.required) {
        console.error(`Cannot uninstall required module ${name}`);
        return false;
      }
      
      // Check if other modules depend on this one
      const dependentModules = [];
      
      for (const [moduleName, info] of Object.entries(this.availableModules)) {
        if (moduleName !== name && this.isModuleLoaded(moduleName)) {
          const dependencies = info.manifest.depends || [];
          
          if (dependencies.includes(name)) {
            dependentModules.push(moduleName);
          }
        }
      }
      
      if (dependentModules.length > 0) {
        console.error(`Cannot uninstall module ${name} because the following modules depend on it: ${dependentModules.join(', ')}`);
        return false;
      }
      
      // Disable the module in the configuration
      configManager.set(`modules.${name}.enabled`, false);
      configManager.save();
      
      // Remove the module
      delete this.modules[name];
      this.availableModules[name].loaded = false;
      
      console.log(`Module ${name} uninstalled successfully`);
      return true;
    } catch (error) {
      console.error(`Error uninstalling module ${name}:`, error);
      return false;
    }
  }
}

// Create a singleton instance
const moduleManager = new ModuleManager();

module.exports = moduleManager;