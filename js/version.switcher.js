var Switcher = {
    init: function() {
        this.selector = $('#version-selector');
        this.populateSelector();
        // Bind the change event
        this.selector.change(function() {
            var version = $(this).val();
            Switcher.setVersion(version);
        });
    },
    url: 'https://cdn.jsdelivr.net/npm/nerdamer',
    versions: [
        'latest',
        '1.1.7', '1.1.6', '1.1.5', '1.1.4', '1.1.3', '1.1.2', '1.1.1', '1.1.0', '1.0.4', '1.0.2',
        '1.0.1', '1.0.0', '0.8.4', '0.8.3', '0.8.2', '0.8.1', '0.8.0', '0.7.16', '0.7.15', '0.7.11'
    ],
    modules: ['nerdamer.core', 'Algebra', 'Calculus', 'Extra', 'Solve'],
    populateSelector: function() {
        this.versions.forEach(function(version) {
            Switcher.selector.append($('<option>', {text: version, value:version}));
        });
    },
    setVersion: function(version) {
        $('.version').each(function(i, o) {
            var script = $(o);
            var src = script.attr('src');
            // Split the src in the url and the version/file
            var url_parts = src.split('@');
            // Split into version, file
            var version_parts = url_parts[1].split('/');
            // Replace the version
            version_parts[0] = version;
            // Join it all back together
            url_parts[1] = version_parts.join('/');
            script.attr('src', url_parts.join('@'));
            script.remove();
            $('head').append(script);
        });
        
        var check = setInterval(function() {
            setVersion();

            if($('#version').html() === version) {
                // Stop the loop if the version was updated.
                clearInterval(check); 
                setSupported();
            }
        }, 100);
    }
};


Switcher.init();