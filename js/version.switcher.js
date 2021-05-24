var Switcher = {
    init: function () {
        this.selector = $('#version-selector');
        this.populateSelector();
        // Bind the change event
        this.selector.change(function () {
            var version = $(this).val();
            $('.loader').show();
            Switcher.setVersion(version);
        });
    },
    url: 'https://cdn.jsdelivr.net/npm/nerdamer',
    versions: [
        '1.1.11', '1.1.10','1.1.9', '1.1.8', '1.1.7', '1.1.6', '1.1.5', 
        '1.1.4', '1.1.3', '1.1.2', '1.1.1', '1.1.0', '1.0.4', '1.0.2', '1.0.1', 
        '1.0.0', '0.8.4', '0.8.3', '0.8.2', '0.8.1', '0.8.0', '0.7.16', '0.7.15',
        '0.7.11'
    ],
    modules: ['nerdamer.core', 'Algebra', 'Calculus', 'Extra', 'Solve'],
    populateSelector: function () {
        this.versions.forEach(function (version) {
            Switcher.selector.append($('<option>', {text: version, value: version}));
        });
    },
    loadModules: function () {
        var core = nerdamer.getCore();
        
        var loadModules = function(arr) {
            if(arr.length === 0) {
                Switcher.modulesReady = true;
                return;
            }
            // Get the first module
            var m = $(arr.shift());
            var name = m.data('name');
            try {
                // Set an interval and check if it's loaded before moving on
                Switcher.load(m);
                var interval = setInterval(function() {
                    if(typeof core[name] !== 'undefined') {
                        clearInterval(interval);
                        return loadModules(arr);
                    }
                    console.log('loading', name);
                }, 100);
            }
            catch(e) {
                alert('Error loading '+name+'. Please pick a different version.');
            }
        };
        
        var modules = $('.module').toArray();
        loadModules(modules);
        
        
    },
    load: function (o) {
        var script = o;
        var src = script.attr('src');
        // Split the src in the url and the version/file
        var url_parts = src.split('@');
        // Split into version, file
        var version_parts = url_parts[1].split('/');
        // Replace the version
        version_parts[0] = this.version;
        // Join it all back together
        url_parts[1] = version_parts.join('/');
        script.attr('src', url_parts.join('@'));
        script.remove();
        $('head').append(script);
    },
    setVersion: function (version) {
        this.modulesReady = false;
        this.version = version;
        // Load the core
        this.load($('#core'));
        // Initiate the core to a blank object
        var check = setInterval(function () {
            // Keep checking to make sure that the version is actually loaded
            if(nerdamer.version() === version) {
                // Stop the loop if the version was updated.
                clearInterval(check);
                Switcher.loadModules();
            }
        }, 100);
        
        // Watch for the modules to be ready
        var watchModules = setInterval(function() {
            if(Switcher.modulesReady) {
                clearInterval(watchModules);
                setVersion();
                setSupported();
                // Hide the loader
                $('.loader').hide();
            }
        }, 100);
    }
};


Switcher.init();