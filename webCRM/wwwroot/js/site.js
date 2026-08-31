// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

let loadingCount = 0;

function startLoading(title = 'กำลังโหลดข้อมูล...', description = 'กรุณารอสักครู่', isAutoFetch = false) {
    loadingCount++;
    // If auto fetch triggers while a custom loading title is already displayed, preserve the custom title
    if (isAutoFetch && loadingCount > 1) {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (overlay && overlay.classList.contains('show')) {
            return;
        }
    }
    showLoading(title, description);
}

function stopLoading(force = false) {
    loadingCount--;
    if (force || loadingCount <= 0) {
        loadingCount = 0;
        hideLoading();
    }
}

function showLoading(title = 'กำลังบันทึกข้อมูล', description = 'ระบบกำลังดำเนินการบันทึกข้อมูลของคุณ กรุณารอสักครู่...') {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
        const titleEl = document.getElementById('loadingTitle');
        const descEl = document.getElementById('loadingDescription');
        if (titleEl) titleEl.innerText = title;
        if (descEl) descEl.innerText = description;
        overlay.classList.add('show');
    }
}

function hideLoading() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// Global fetch interceptor to show loading overlay automatically on API calls
(function() {
    if (typeof window !== 'undefined' && window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const options = args[1] || {};
            const skipLoading = options && options.skipLoading === true;
            
            if (!skipLoading) {
                const title = (options && options.loadingTitle) ? options.loadingTitle : 'กำลังโหลดข้อมูล...';
                const description = (options && options.loadingDescription) ? options.loadingDescription : 'กรุณารอสักครู่';
                startLoading(title, description, true);
            }
            
            try {
                const response = await originalFetch.apply(this, args);
                return response;
            } finally {
                if (!skipLoading) {
                    stopLoading();
                }
            }
        };
    }
})();

function showAlert(type, title, text, confirmCallback = null) {
    Swal.fire({
        icon: type, // 'success', 'error', 'warning', 'info', 'question'
        title: title,
        text: text,
        confirmButtonColor: '#0b3d91',
        confirmButtonText: 'ตกลง',
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed && typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
}

// Sidebar toggle logic
document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('crmSidebar');
    const hideBtn = document.getElementById('hideSidebarBtn');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    const hideIcon = document.getElementById('hideSidebarIcon');

    function toggleSidebar() {
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            if (hideIcon) {
                if (sidebar.classList.contains('collapsed')) {
                    hideIcon.classList.remove('bi-chevron-double-left');
                    hideIcon.classList.add('bi-chevron-double-right');
                } else {
                    hideIcon.classList.remove('bi-chevron-double-right');
                    hideIcon.classList.add('bi-chevron-double-left');
                }
            }
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 320);
        }
    }

    if (sidebar) {
        sidebar.addEventListener('transitionend', function () {
            window.dispatchEvent(new Event('resize'));
        });
    }

    if (hideBtn) {
        hideBtn.addEventListener('click', toggleSidebar);
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }
});
