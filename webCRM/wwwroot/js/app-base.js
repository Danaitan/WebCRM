
(function () {
    'use strict';

    var base = (window.appBase || '').replace(/\/+$/, '');

    if (!base) {
        window.appUrl = function (u) { return u; };
        return;
    }

    function withBase(url) {
        if (typeof url !== 'string' || url.length === 0) {
            return url;
        }

        if (!url.startsWith('/')) {
            return url;
        }

        if (url.startsWith('//')) {
            return url;
        }

        if (url === base || url.startsWith(base + '/')) {
            return url;
        }

        return base + url;
    }

    window.appUrl = withBase;

    if (typeof window.fetch === 'function') {
        var originalFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
            if (typeof input === 'string') {
                input = withBase(input);
            } else if (input && typeof input === 'object' && 'url' in input) {
                try {
                    input = new Request(withBase(input.url), input);
                } catch (e) {
                }
            }
            return originalFetch(input, init);
        };
    }

    if (window.XMLHttpRequest && XMLHttpRequest.prototype.open) {
        var originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url) {
            if (typeof url === 'string') {
                url = withBase(url);
            }
            return originalOpen.apply(
                this,
                [method, url].concat(
                    Array.prototype.slice.call(arguments, 2)));
        };
    }

    function hookJquery($) {
        if (!$ || !$.ajaxPrefilter) {
            return;
        }
        $.ajaxPrefilter(function (options) {
            if (options && typeof options.url === 'string') {
                options.url = withBase(options.url);
            }
        });
    }

    if (window.jQuery) {
        hookJquery(window.jQuery);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            hookJquery(window.jQuery);
        });
    }

    window.appNavigate = function (url) {
        window.location.assign(withBase(url));
    };

    document.addEventListener('click', function (e) {
        if (e.button !== 0) {
            return;
        }
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }
        if (e.defaultPrevented) {
            return;
        }

        var a = e.target.closest && e.target.closest('a');
        if (!a) {
            return;
        }

        var targetAttr = a.getAttribute('target');
        if (targetAttr && targetAttr !== '_self') {
            return;
        }

        var href = a.getAttribute('href');
        if (!href) {
            return;
        }

        if (href.charAt(0) === '#'
            || href.startsWith('javascript:')
            || href.startsWith('mailto:')
            || href.startsWith('tel:')
            || href.startsWith('data:')
            || href.startsWith('blob:')
            || href.startsWith('http://')
            || href.startsWith('https://')
            || href.startsWith('//')) {
            return;
        }

        if (href.charAt(0) !== '/') {
            return;
        }

        var target = withBase(href);
        if (target === href) {
            return;
        }

        e.preventDefault();
        window.location.assign(target);
    }, true);
})();
