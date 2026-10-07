// ============================================================
// app-base.js
// ------------------------------------------------------------
// รองรับการ deploy แอปใต้ sub-path ของ reverse proxy
// (เช่น Nginx Proxy Manager -> https://host/crmweb)
//
// โค้ด JS เดิมเรียก API ด้วย absolute path เช่น
//   fetch('/Suggestions/PostNotification')
//   $.ajax({ url: '/Home/GetNotification' })
//   window.location.href = '/Login?...'
//
// เมื่อแอปอยู่ใต้ /crmweb path เหล่านี้จะต้องถูกเติม prefix
// เป็น /crmweb/Suggestions/... มิฉะนั้นจะได้ 404
//
// ไฟล์นี้ wrap fetch / XMLHttpRequest / jQuery.ajax ให้เติม
// base path อัตโนมัติ จึงไม่ต้องแก้ไฟล์ JS ทีละไฟล์ และยัง
// ทำงานที่ root (base = "") ตอนรัน local ได้ด้วย
//
// ค่า window.appBase ถูกฉีดจาก _Layout.cshtml ตาม PathBase
// ที่ฝั่ง server รู้ (เช่น "/crmweb" หรือ "")
// ============================================================
(function () {
    'use strict';

    // normalize: ตัด trailing slash ("/crmweb/" -> "/crmweb")
    var base = (window.appBase || '').replace(/\/+$/, '');

    // ไม่มี base path (รันที่ root) -> ไม่ต้องทำอะไร
    if (!base) {
        window.appUrl = function (u) { return u; };
        return;
    }

    // เติม base ให้ URL ถ้าเป็น path แบบ absolute ภายในแอป
    // ("/Foo") แต่ไม่แตะ:
    //   - URL เต็ม (http://, https://, //cdn...)
    //   - path ที่มี base อยู่แล้ว ("/crmweb/...")
    //   - anchor / data / blob / javascript / mailto / tel
    function withBase(url) {
        if (typeof url !== 'string' || url.length === 0) {
            return url;
        }

        if (!url.startsWith('/')) {
            return url; // relative หรือ absolute-URL -> ปล่อยผ่าน
        }

        if (url.startsWith('//')) {
            return url; // protocol-relative URL
        }

        // อยู่ภายใต้ base แล้ว ("/crmweb" หรือ "/crmweb/...")
        if (url === base || url.startsWith(base + '/')) {
            return url;
        }

        return base + url;
    }

    // export ให้โค้ดอื่นเรียกใช้ได้โดยตรงถ้าต้องการ
    window.appUrl = withBase;

    // -------- wrap window.fetch --------
    if (typeof window.fetch === 'function') {
        var originalFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
            if (typeof input === 'string') {
                input = withBase(input);
            } else if (input && typeof input === 'object' && 'url' in input) {
                // Request object
                try {
                    input = new Request(withBase(input.url), input);
                } catch (e) {
                    /* ปล่อยผ่านถ้า clone ไม่ได้ */
                }
            }
            return originalFetch(input, init);
        };
    }

    // -------- wrap XMLHttpRequest.open --------
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

    // -------- wrap jQuery.ajax (ถ้า jQuery โหลดแล้ว) --------
    // ครอบคลุม $.ajax, $.get, $.post ที่เรียกภายใน
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
        // jQuery อาจโหลดทีหลัง -> รอ DOMContentLoaded แล้วลองอีกครั้ง
        document.addEventListener('DOMContentLoaded', function () {
            hookJquery(window.jQuery);
        });
    }
})();
