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
    this.loadedModules = [];
    this.modulesDir = path.join(__dirname);
    this.coreModules = ['core', 'timeTracking', 'leaveManagement', 'reporting', 'admin'];
  }

  /**
   * Initialize the module system
   */
  async initialize() {
    console.log('Initializing module system...');
    
    try {
      // Ensure the modules directory exists
      if (!fs.existsSync(this.modulesDir)) {
        fs.mkdirSync(this.modulesDir, { recursive: true });
      }
      
      // Discover available modules
      await this.discoverModules();
      
      // Load enabled modules
      await this.loadEnabledModules();
      
      console.log(`Module system initialized with ${this.loadedModules.length} modules`);
      return true;
    } catch (error) {
      console.error('Error initializing module system:', error);
      return false;
    }
  }

  /**
   * Discover available modules
   */
  async discoverModules() {
    try {
      // Read the modules directory
      const modules = fs.readdirSync(this.modulesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
        .map(dirent => dirent.name);
      
      // Register each module
      for (const moduleName of modules) {
        const modulePath = path.join(this.modulesDir, moduleName);
        const manifestPath = path.join(modulePath, 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            this.registerModule(moduleName, manifest, modulePath);
          } catch (err) {
            console.error(`Error loading module manifest for ${moduleName}:`, err);
          }
        }
      }
      
      // Additionally check for core modules that might be defined in the project structure
      for (const coreName of this.coreModules) {
        if (!this.modules[coreName]) {
          const corePath = path.join(this.modulesDir, coreName);
          if (fs.existsSync(corePath) && fs.statSync(corePath).isDirectory()) {
            // Create a default manifest
            this.registerModule(coreName, {
              name: coreName,
              version: '1.0.0',
              description: `Core ${coreName} module`,
              category: 'Core',
              depends: [],
              autoInstall: true
            }, corePath);
          }
        }
      }
      
      console.log(`Discovered ${Object.keys(this.modules).length} modules`);
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
    this.modules[name] = {
      name,
      path: modulePath,
      manifest,
      loaded: false,
      instance: null
    };
    
    console.log(`Registered module: ${name} (${manifest.version})`);
  }

  /**
   * Load all enabled modules
   */
  async loadEnabledModules() {
    try {
      // Get enabled modules from config
      const enabledModules = [];
      
      // First check core modules from config
      for (const coreName of this.coreModules) {
        const enabled = configManager.get(`modules.${coreName}.enabled`, false);
        if (enabled && this.modules[coreName]) {
          enabledModules.push(coreName);
        }
      }
      
      // Then check other registered modules
      for (const [name, module] of Object.entries(this.modules)) {
        if (!this.coreModules.includes(name)) {
          const enabled = configManager.get(`modules.${name}.enabled`, module.manifest.autoInstall || false);
          if (enabled) {
            enabledModules.push(name);
          }
        }
      }
      
      // Sort modules by dependencies
      const sortedModules = this.sortModulesByDependencies(enabledModules);
      
      // Load modules in order
      for (const moduleName of sortedModules) {
        await this.loadModule(moduleName);
      }
    } catch (error) {
      console.error('Error loading enabled modules:', error);
      throw error;
    }
  }

  /**
   * Load a single module
   * @param {string} name - Module name
   */
  async loadModule(name) {
    try {
      const module = this.modules[name];
      
      if (!module) {
        console.error(`Cannot load module ${name}: Module not found`);
        return false;
      }
      
      if (module.loaded) {
        return true;
      }
      
      console.log(`Loading module: ${name}`);
      
      // Check dependencies
      const dependencies = module.manifest.depends || [];
      for (const dependency of dependencies) {
        if (!this.modules[dependency] || !this.modules[dependency].loaded) {
          console.error(`Cannot load module ${name}: Dependency ${dependency} not loaded`);
          return false;
        }
      }
      
      // Try to load the module
      const indexPath = path.join(module.path, 'index.js');
      if (fs.existsSync(indexPath)) {
        try {
          const ModuleClass = require(indexPath);
          module.instance = new ModuleClass();
          
          // Initialize the module if it has an initialize method
          if (typeof module.instance.initialize === 'function') {
            await module.instance.initialize();
          }
          
          module.loaded = true;
          this.loadedModules.push(name);
          console.log(`Module loaded: ${name}`);
          return true;
        } catch (err) {
          console.error(`Error initializing module ${name}:`, err);
          return false;
        }
      } else {
        // For modules without an index.js file, just mark as loaded
        module.loaded = true;
        this.loadedModules.push(name);
        console.log(`Module loaded: ${name} (no index.js found)`);
        return true;
      }
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
    const sortedModules = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (name) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected in modules: ${name}`);
      }
      
      visiting.add(name);
      
      const module = this.modules[name];
      if (module) {
        const dependencies = module.manifest.depends || [];
        for (const dependency of dependencies) {
          if (moduleNames.includes(dependency)) {
            visit(dependency);
          }
        }
      }
      
      visiting.delete(name);
      visited.add(name);
      sortedModules.push(name);
    };
    
    for (const name of moduleNames) {
      try {
        visit(name);
      } catch (error) {
        console.error('Error sorting modules:', error);
      }
    }
    
    return sortedModules;
  }

  /**
   * Get a loaded module instance
   * @param {string} name - Module name
   * @returns {object|null} Module instance
   */
  getModule(name) {
    if (this.modules[name] && this.modules[name].loaded) {
      return this.modules[name].instance;
    }
    return null;
  }

  /**
   * Check if a module is loaded
   * @param {string} name - Module name
   * @returns {boolean} Whether the module is loaded
   */
  isModuleLoaded(name) {
    return this.loadedModules.includes(name);
  }

  /**
   * Get all loaded modules
   * @returns {object[]} List of loaded modules
   */
  getLoadedModules() {
    return this.loadedModules.map(name => ({
      name,
      version: this.modules[name].manifest.version,
      description: this.modules[name].manifest.description
    }));
  }

  /**
   * Get all available modules
   * @returns {object[]} List of all available modules
   */
  getAvailableModules() {
    return Object.entries(this.modules).map(([name, module]) => ({
      name,
      version: module.manifest.version,
      description: module.manifest.description,
      loaded: module.loaded,
      enabled: configManager.get(`modules.${name}.enabled`, false)
    }));
  }

  /**
   * Install a module
   * @param {string} name - Module name
   * @returns {boolean} Success status
   */
  async installModule(name) {
    if (!this.modules[name]) {
      console.error(`Cannot install module ${name}: Module not found`);
      return false;
    }
    
    if (this.modules[name].loaded) {
      console.log(`Module ${name} is already installed and loaded`);
      return true;
    }
    
    // Enable the module in config
    configManager.set(`modules.${name}.enabled`, true);
    
    // Load the module
    return await this.loadModule(name);
  }

  /**
   * Uninstall a module
   * @param {string} name - Module name
   * @returns {boolean} Success status
   */
  async uninstallModule(name) {
    if (!this.modules[name]) {
      console.error(`Cannot uninstall module ${name}: Module not found`);
      return false;
    }
    
    // Check if any loaded modules depend on this one
    for (const loadedName of this.loadedModules) {
      const dependencies = this.modules[loadedName].manifest.depends || [];
      if (dependencies.includes(name)) {
        console.error(`Cannot uninstall module ${name}: Module ${loadedName} depends on it`);
        return false;
      }
    }
    
    // Disable the module in config
    configManager.set(`modules.${name}.enabled`, false);
    
    // Remove from loaded modules
    const index = this.loadedModules.indexOf(name);
    if (index !== -1) {
      this.loadedModules.splice(index, 1);
    }
    
    // Mark as unloaded
    this.modules[name].loaded = false;
    this.modules[name].instance = null;
    
    console.log(`Module uninstalled: ${name}`);
    return true;
  }
}

// Export singleton instance
const moduleManager = new ModuleManager();
module.exports = moduleManager;