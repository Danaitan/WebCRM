// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

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
        }
    }

    if (hideBtn) {
        hideBtn.addEventListener('click', toggleSidebar);
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }
});
