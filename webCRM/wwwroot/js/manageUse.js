// Global variables for data management
let allUsersData = [];
let allRolesData = [];
let allPagesData = [];
let selectedRoleId = null;
let selectedRoleName = '';
let usersDataTable = null;
let rolesDataTable = null;

$(document).ready(function () {
    // Initialize page data
    initPage();

    // Event listeners for searching & filtering users
    $('#userSearchInput').on('keyup input', function () {
        filterUsersTable();
    });

    $('#userRoleFilter').on('change', function () {
        filterUsersTable();
    });

    // Save user role event
    $('#btnSaveUserRole').on('click', function () {
        saveUserRole();
    });

    // Save role pages permission event
    $('#btnSaveRolePages').on('click', function () {
        saveRolePagesPermission();
    });

    // Select / Deselect all pages
    $('#btnSelectAllPages').on('click', function () {
        $('.page-checkbox').prop('checked', true);
    });

    $('#btnDeselectAllPages').on('click', function () {
        $('.page-checkbox').prop('checked', false);
    });

    // Create new role event
    $('#btnCreateRole').on('click', function () {
        createNewRole();
    });
});

async function initPage() {
    toggleGlobalLoading(true, 'กำลังโหลดข้อมูล...', 'ระบบกำลังโหลดข้อมูลผู้ใช้งาน บทบาท และสิทธิ์หน้าจอ กรุณารอสักครู่');
    try {
        await Promise.all([
            loadRolesData(),
            loadPagesData()
        ]);
        await loadUsersData();
    } catch (err) {
        console.error("Error initializing page:", err);
    } finally {
        toggleGlobalLoading(false);
    }
}

//LOAD USERS DATA
async function loadUsersData() {
    $('#userSearchInput').val('');
    $('#userRoleFilter').val('');
    $('#usersTableBody').html(`
        <tr>
            <td colspan="6" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                กำลังโหลดข้อมูลผู้ใช้งาน...
            </td>
        </tr>
    `);

    try {
        const response = await $.ajax({
            url: '/ManageUser/GetpersonalwithRole',
            type: 'GET',
            data: {
                page: 1,
                pageSize: 2000,
                search: '',
                depart_code: '',
                branch_no: '',
                abbreviation: ''
            },
            dataType: 'json',
            timeout: 30000
        });
        allUsersData = parseApiResponse(response);
        $('#statTotalUsers').text(allUsersData.length);
        $('#userCountBadge').text(allUsersData.length);

        renderUsersTable(allUsersData);
    } catch (error) {
        console.error("Failed to load users data:", error);
        allUsersData = [];
        $('#statTotalUsers').text(0);
        $('#userCountBadge').text(0);
        $('#usersTableBody').html(`
            <tr>
                <td colspan="6" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้งาน 
                    <button class="btn btn-sm btn-outline-danger ms-2 rounded-pill px-3" onclick="loadUsersData()">
                        <i class="bi bi-arrow-clockwise me-1"></i>ลองใหม่
                    </button>
                </td>
            </tr>
        `);
    }
}

function getUserRoleCount(user) {
    if (!user) return 0;
    if (Array.isArray(user.role)) {
        return user.role.filter(r => r && (r.role_id || r.role_name)).length;
    } else if (user.role && typeof user.role === 'object') {
        return (user.role.role_id || user.role.role_name) ? 1 : 0;
    } else if (user.role || user.role_id) {
        return 1;
    }
    return 0;
}

function getUserRoleInfo(user) {
    let roleId = '';
    let roleName = '';
    if (Array.isArray(user.role) && user.role.length > 0) {
        roleId = user.role[0].role_id || '';
        const names = user.role.map(r => {
            const id = r.role_id || '';
            return r.role_name || getRoleNameById(id) || id;
        }).filter(Boolean);
        roleName = names.join(', ');
    } else if (user.role && typeof user.role === 'object') {
        roleId = user.role.role_id || '';
        roleName = getRoleNameById(roleId) || roleId;
    } else {
        roleId = user.role_id || '';
        roleName = getRoleNameById(roleId);
    }

    return {
        roleId: roleId,
        roleName: roleName || 'ยังไม่กำหนด'
    };
}

function renderUsersTable(data) {
    if ($.fn.DataTable.isDataTable('#usersTable')) {
        try {
            $('#usersTable').DataTable().destroy();
        } catch (e) {
            console.warn("DataTable destroy warning:", e);
        }
    }
    usersDataTable = null;

    const tbody = $('#usersTableBody');
    tbody.empty();

    const userList = Array.isArray(data) ? [...data] : parseApiResponse(data);

    if (!userList || userList.length === 0) {
        tbody.html('<tr><td colspan="6" class="text-center py-4 text-muted">ไม่พบข้อมูลผู้ใช้งานในระบบ</td></tr>');
        return;
    }

    try {
        // Sort data: 1. Role count descending (most roles first) 2. personnel_code descending (highest code first)
        userList.sort((a, b) => {
            if (!a) return 1;
            if (!b) return -1;
            const countA = getUserRoleCount(a);
            const countB = getUserRoleCount(b);
            if (countB !== countA) {
                return countB - countA;
            }
            const codeA = (a.personnel_code || '').toString();
            const codeB = (b.personnel_code || '').toString();
            return codeB.localeCompare(codeA, undefined, { numeric: true, sensitivity: 'base' });
        });

        userList.forEach((user) => {
            if (!user) return;
            const code = user.personnel_code || '-';
            const name = user.thname || '-';
            const branch = user.branch || '-';
            const department = user.department || user.section || '';
            const position = user.position || '';

            const { roleId, roleName } = getUserRoleInfo(user);
            const badgeClass = (roleId && roleName !== 'ยังไม่กำหนด') ? 'bg-primary' : 'bg-secondary';

            const row = `
                <tr>
                    <td class="fw-bold text-dark">${escapeHtml(code)}</td>
                    <td>
                        <div class="fw-semibold text-dark">${escapeHtml(name)}</div>
                        ${position ? `<small class="text-muted d-block">${escapeHtml(position)}</small>` : ''}
                    </td>
                    <td>
                        <span class="text-dark small d-block">${escapeHtml(branch)}</span>
                        ${department ? `<span class="text-muted small d-block">${escapeHtml(department)}</span>` : ''}
                    </td>
                    <td><span class="badge role-badge ${badgeClass}">${escapeHtml(roleName)}</span></td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-3" 
                                onclick="openEditUserRoleModal('${escapeHtml(code)}', '${escapeHtml(name)}')">
                            <i class="bi bi-pencil-square me-1"></i>จัดการสิทธิ์
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        usersDataTable = $('#usersTable').DataTable({
            language: {
                search: "ค้นหาในตาราง:",
                lengthMenu: "แสดง _MENU_ รายการต่อหน้า",
                info: "แสดง _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
                paginate: {
                    first: "หน้าแรก",
                    last: "หน้าสุดท้าย",
                    next: "ถัดไป",
                    previous: "ก่อนหน้า"
                },
                zeroRecords: "ไม่พบข้อมูลที่ตรงกับการค้นหา"
            },
            pageLength: 10,
            dom: '<"d-flex justify-content-between align-items-center mb-2"l>rt<"d-flex justify-content-between align-items-center mt-3"ip>',
            order: []
        });
    } catch (err) {
        console.error("Error rendering users table:", err);
    }
}

function filterUsersTable() {
    if (!usersDataTable) return;
    const searchVal = $('#userSearchInput').val();
    const roleFilterVal = $('#userRoleFilter').val();

    usersDataTable.search(searchVal);
    if (roleFilterVal) {
        usersDataTable.column(3).search(roleFilterVal);
    } else {
        usersDataTable.column(3).search('');
    }
    usersDataTable.draw();
}

// LOAD ROLES DATA
async function loadRolesData() {
    try {
        const response = await $.ajax({
            url: '/ManageUser/GetCRMRoles',
            type: 'GET',
            dataType: 'json'
        });

        allRolesData = parseApiResponse(response);
        $('#statTotalRoles').text(allRolesData.length);
        renderRolesFilterDropdown(allRolesData);
        renderRolesSelectionList(allRolesData);
        renderRolesTable(allRolesData);
    } catch (error) {
        console.error("Failed to load roles data:", error);
    }
}

function renderRolesFilterDropdown(roles) {
    const userFilter = $('#userRoleFilter');
    const modalSelect = $('#modalRoleSelect');

    userFilter.find('option:not(:first)').remove();
    modalSelect.find('option:not(:first)').remove();

    roles.forEach(role => {
        const id = role.role_id || '';
        const name = role.role_name || '';

        if (id) {
            userFilter.append(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
            modalSelect.append(`<option value="${escapeHtml(id)}">${escapeHtml(name)} (${escapeHtml(id)})</option>`);
        }
    });
}

function renderRolesSelectionList(roles) {
    const list = $('#roleSelectionList');
    list.empty();

    if (!roles || roles.length === 0) {
        list.html('<div class="text-center text-muted py-3">ไม่พบบทบาทในระบบ</div>');
        return;
    }

    roles.forEach((role, index) => {
        const id = role.role_id || role.roleId || role.id || '';
        const name = role.role_name || role.roleName || role.name || id;

        const item = `
            <div class="role-item p-3 bg-light rounded-3 d-flex align-items-center justify-content-between" 
                 id="role-item-${id}" onclick="selectRoleForPermissions('${escapeHtml(id)}', '${escapeHtml(name)}')">
                <div>
                    <div class="fw-bold text-dark">${escapeHtml(name)}</div>
                    <span class="text-muted small">ID: ${escapeHtml(id)}</span>
                </div>
                <i class="bi bi-chevron-right text-secondary fs-6"></i>
            </div>
        `;
        list.append(item);
    });
}

function renderRolesTable(roles) {
    if (rolesDataTable) {
        rolesDataTable.destroy();
    }

    const tbody = $('#rolesTableBody');
    tbody.empty();

    if (!roles || roles.length === 0) {
        tbody.html('<tr><td colspan="5" class="text-center py-4 text-muted">ไม่พบบทบาทในระบบ</td></tr>');
        return;
    }

    roles.forEach((role, index) => {
        const id = role.role_id || '-';
        const name = role.role_name || '-';
        const createdBy = role.create_by || '-';
        const status = role.status || '-';

        const isEnable = status === 'enable';
        const statusText = isEnable ? 'ใช้งาน' : 'ไม่ใช้งาน';
        const statusColor = isEnable ? 'success' : 'danger';

        const row = `
            <tr>
                <td class="fw-bold text-primary">${escapeHtml(id)}</td>
                <td class="fw-bold text-dark">${escapeHtml(name)}</td>
                <td><span class="text-muted small">${escapeHtml(createdBy)}</span></td>
                <td>
                    <div class="form-check form-switch d-flex align-items-center mb-0" style="cursor: pointer;">
                        <input class="form-check-input me-2" type="checkbox" role="switch" 
                               id="roleStatusSwitch_${escapeHtml(id)}" 
                               style="cursor: pointer; width: 2.25em; height: 1.25em;" 
                               ${isEnable ? 'checked' : ''} 
                               onchange="toggleCRMRoleStatus('${escapeHtml(id)}', '${escapeHtml(name)}', this.checked)">
                        <label class="form-check-label text-${statusColor} fw-semibold" for="roleStatusSwitch_${escapeHtml(id)}" style="cursor: pointer;">
                            ${escapeHtml(statusText)}
                        </label>
                    </div>
                </td>
            </tr>
        `;
        tbody.append(row);
    });

    rolesDataTable = $('#rolesTable').DataTable({
        language: {
            search: "ค้นหาบทบาท:",
            lengthMenu: "แสดง _MENU_ รายการต่อหน้า",
            info: "แสดง _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
            paginate: { first: "หน้าแรก", last: "หน้าสุดท้าย", next: "ถัดไป", previous: "ก่อนหน้า" },
            zeroRecords: "ไม่พบบทบาท"
        },
        pageLength: 10
    });
}

async function toggleCRMRoleStatus(roleId, roleName, isChecked) {
    if (!roleId || roleId === '-') {
        Swal.fire({ icon: 'warning', title: 'ไม่พบรหัสบทบาท' });
        return;
    }

    const newStatus = isChecked ? 'enable' : 'disable';
    const statusLabel = isChecked ? 'ใช้งาน' : 'ไม่ใช้งาน';

    const confirmResult = await Swal.fire({
        title: 'ยืนยันการปรับสถานะสิทธิ์?',
        text: `คุณต้องการปรับสถานะบทบาท "${roleName}" เป็น "${statusLabel}" ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ตกลง',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmResult.isConfirmed) {
        $(`#roleStatusSwitch_${roleId}`).prop('checked', !isChecked);
        return;
    }

    toggleGlobalLoading(true);
    try {
        const response = await $.ajax({
            url: '/ManageUser/UpdateCRMRole',
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({
                role_id: roleId.toString(),
                status: newStatus
            })
        });

        if (response && (response.status === 'success' || response.status === true)) {
            Swal.fire({
                icon: 'success',
                title: 'อัปเดตสถานะสำเร็จ!',
                text: `ปรับสถานะบทบาท "${roleName}" เป็น "${statusLabel}" เรียบร้อยแล้ว`,
                timer: 1500,
                showConfirmButton: false
            });
            await loadRolesData();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: response ? (response.message || response.detail || 'ไม่สามารถอัปเดตสถานะบทบาทได้') : 'ไม่พบการตอบรับจากเซิร์ฟเวอร์'
            });
            $(`#roleStatusSwitch_${roleId}`).prop('checked', !isChecked);
        }
    } catch (error) {
        console.error("Update CRM Role status error:", error);
        const serverMsg = error.responseJSON ? (error.responseJSON.message || error.responseJSON.detail) : null;
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาดในการปรับสถานะ',
            text: serverMsg || error.statusText || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
        });
        $(`#roleStatusSwitch_${roleId}`).prop('checked', !isChecked);
    } finally {
        toggleGlobalLoading(false);
    }
}

async function deleteRole(roleId, roleName) {
    if (!roleId || roleId === '-') {
        Swal.fire({ icon: 'warning', title: 'ไม่พบรหัสบทบาท' });
        return;
    }

    const confirmResult = await Swal.fire({
        title: 'ยืนยันการลบบทบาทสิทธิ์?',
        text: `คุณต้องการลบบทบาท "${roleName}" (ID: ${roleId}) ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash me-1"></i>ลบบทบาท',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmResult.isConfirmed) return;

    toggleGlobalLoading(true);
    try {
        const response = await $.ajax({
            url: '/ManageUser/DeleteCRMRole',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                role_id: roleId.toString()
            })
        });

        if (response && (response.status === 'success' || response.status === true)) {
            Swal.fire({
                icon: 'success',
                title: 'ลบบทบาทสำเร็จ!',
                text: `บทบาท "${roleName}" ถูกลบออกจากระบบเรียบร้อยแล้ว`,
                timer: 1500,
                showConfirmButton: false
            });
            await loadRolesData();
        } else {
            // Fallback: Remove locally if backend returned error but user intends UI delete or notify
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: response.message || 'ไม่สามารถลบบทบาทได้'
            });
        }
    } catch (error) {
        console.error("Delete role error:", error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
        toggleGlobalLoading(false);
    }
}


function getRoleNameById(roleId) {
    if (!roleId) return '';
    const found = allRolesData.find(r => (r.role_id) == roleId);
    return found ? (found.role_name) : '';
}

// LOAD PAGES DATA
async function loadPagesData() {
    try {
        const response = await $.ajax({
            url: '/ManageUser/GetPageSidebar',
            type: 'GET',
            dataType: 'json'
        });

        allPagesData = parseApiResponse(response);
        $('#statTotalPages').text(allPagesData.length);
    } catch (error) {
        console.error("Failed to load pages sidebar data:", error);
    }
}

function selectRoleForPermissions(roleId, roleName) {
    selectedRoleId = roleId;
    selectedRoleName = roleName;
    $('.role-item').removeClass('active');
    $(`#role-item-${roleId}`).addClass('active');

    $('#selectedRoleTitle').text(`${roleName} (${roleId})`);
    $('#btnSaveRolePages').prop('disabled', false);

    renderPagePermissionsGrid(roleId);
}

function renderPagePermissionsGrid(roleId) {
    const container = $('#pagesListContainer');
    container.empty();

    if (!allPagesData || allPagesData.length === 0) {
        container.html('<div class="col-12 text-center text-muted py-4">ไม่พบรายการหน้าจอในระบบ</div>');
        return;
    }

    // Find selected role object in allRolesData to extract assigned page IDs
    const currentRole = (allRolesData || []).find(r => (r.role_id || r.roleId || r.id) == roleId);
    let assignedPageIds = [];
    if (currentRole) {
        const rawPages = currentRole.PageId || [];
        if (Array.isArray(rawPages)) {
            assignedPageIds = rawPages.map(p => {
                if (typeof p === 'object' && p !== null) {
                    return p.PageId;
                }
                return p;
            }).filter(id => id !== undefined && id !== null);
        }
    }

    const PagePublic = [1, 2, 8];

    allPagesData.forEach(page => {
        const pageId = page.Id || '';
        const pageName = page.Title || '';
        const pageUrl = page.Path || '';
        const icon = page.icon || 'bi-window-sidebar';

        // ตรวจสอบว่าเป็น Public Page หรือไม่ (1, 2, 8)
        const isPublicPage = PagePublic.some(id => String(id) === String(pageId));

        // Check if this page is assigned to role
        const isChecked = isPublicPage ||
            assignedPageIds.some(id => String(id) === String(pageId)) ||
            (page.assignedRoles && Array.isArray(page.assignedRoles) && page.assignedRoles.some(r => String(r) === String(roleId)));

        const card = `
            <div class="col-12 col-md-6">
                <div class="page-perm-card p-3 bg-white d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div class="bg-light p-2 rounded text-primary">
                            <i class="bi ${escapeHtml(icon)} fs-5"></i>
                        </div>
                        <div>
                            <div class="fw-bold text-dark mb-0">${escapeHtml(pageName)}</div>
                            <span class="text-muted small">${escapeHtml(pageUrl || 'Page ID: ' + pageId)}</span>
                        </div>
                    </div>
                    <div class="form-check form-switch fs-5">
                        <input class="form-check-input page-checkbox" type="checkbox" 
                               data-page-id="${escapeHtml(pageId)}" 
                               data-page-name="${escapeHtml(pageName)}" 
                               ${isChecked ? 'checked' : ''} 
                               ${isPublicPage ? 'disabled' : ''} />
                    </div>
                </div>
            </div>
        `;
        container.append(card);
    });
}

// ACTION HANDLERS (POST APIS)
function extractUserRoles(user) {
    if (!user) return [];
    let rolesList = [];
    if (Array.isArray(user.role)) {
        rolesList = user.role.map(r => {
            if (typeof r === 'object' && r !== null) {
                const id = r.role_id || r.roleId || r.id || '';
                const name = r.role_name || r.roleName || r.name || getRoleNameById(id) || id;
                return { role_id: id, role_name: name };
            }
            const id = (r || '').toString();
            return { role_id: id, role_name: getRoleNameById(id) || id };
        }).filter(r => r.role_id);
    } else if (user.role && typeof user.role === 'object') {
        const id = user.role.role_id || user.role.roleId || user.role.id || '';
        const name = user.role.role_name || user.role.roleName || user.role.name || getRoleNameById(id) || id;
        if (id) rolesList.push({ role_id: id, role_name: name });
    } else if (user.role_id || user.role) {
        const id = (user.role_id || user.role).toString();
        if (id) rolesList.push({ role_id: id, role_name: getRoleNameById(id) || id });
    }
    return rolesList;
}

function openEditUserRoleModal(code, name) {
    const user = allUsersData.find(u => (u.personnel_code || '').toString() === code.toString());
    $('#modalPersonnelCode').text(code);
    $('#modalPersonnelName').text(name || (user ? user.thname : '-'));
    $('#editUserRoleModal').data('personnel_code', code);
    $('#modalRoleSelect').val('');

    renderUserRolesInModal(code);

    const modal = new bootstrap.Modal(document.getElementById('editUserRoleModal'));
    modal.show();
}

function renderUserRolesInModal(code) {
    const user = allUsersData.find(u => (u.personnel_code || '').toString() === code.toString());
    const container = $('#userCurrentRolesList');
    container.empty();

    const roles = extractUserRoles(user);
    $('#userRoleCountBadge').text(`${roles.length} บทบาท`);

    if (roles.length === 0) {
        container.html('<div class="text-center text-muted py-3 small"><i class="bi bi-info-circle me-1"></i>พนักงานท่านนี้ยังไม่มีบทบาทสิทธิ์ในระบบ</div>');
        return;
    }

    roles.forEach(role => {
        const item = `
            <div class="d-flex align-items-center justify-content-between p-2 px-3 bg-white rounded border shadow-sm">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-shield-check text-primary fs-5"></i>
                    <div>
                        <span class="fw-bold text-dark d-block text-start">${escapeHtml(role.role_name)}</span>
                        <small class="text-muted">ID: ${escapeHtml(role.role_id)}</small>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1" title="ลบสิทธิ์บทบาทนี้" 
                        onclick="removeUserRole('${escapeHtml(code)}', '${escapeHtml(role.role_id)}', '${escapeHtml(role.role_name)}')">
                    <i class="bi bi-trash me-1"></i>ลบสิทธิ์
                </button>
            </div>
        `;
        container.append(item);
    });
}

async function removeUserRole(personnelCode, roleId, roleName) {
    if (!personnelCode || !roleId) return;

    const confirmResult = await Swal.fire({
        title: 'ยืนยันถอดสิทธิ์บทบาท?',
        text: `คุณต้องการถอดสิทธิ์บทบาท "${roleName}" ออกจากพนักงานท่านนี้ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash me-1"></i>ยืนยันถอดสิทธิ์',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmResult.isConfirmed) return;

    toggleGlobalLoading(true);
    try {
        const response = await $.ajax({
            url: '/ManageUser/PostCRMPersonalRole',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                personnel_code: personnelCode,
                role_id: roleId,
                status: 'unable'
            })
        });

        if (response && (response.status === 'success' || response.status === true)) {
            Swal.fire({
                icon: 'success',
                title: 'ถอดสิทธิ์สำเร็จ!',
                text: `ถอดสิทธิ์บทบาท "${roleName}" เรียบร้อยแล้ว`,
                timer: 1500,
                showConfirmButton: false
            });

            // Update user's roles locally in memory
            const user = allUsersData.find(u => (u.personnel_code || '').toString() === personnelCode.toString());
            if (user) {
                if (Array.isArray(user.role)) {
                    user.role = user.role.filter(r => {
                        const rId = (typeof r === 'object' && r !== null) ? (r.role_id || r.roleId || r.id) : r;
                        return rId != roleId;
                    });
                } else {
                    user.role = [];
                    user.role_id = null;
                }
            }

            renderUserRolesInModal(personnelCode);
            await loadUsersData();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: response.message || 'ไม่สามารถถอดสิทธิ์ได้'
            });
        }
    } catch (error) {
        console.error("Remove user role error:", error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
        toggleGlobalLoading(false);
    }
}

async function saveUserRole() {
    const personnelCode = $('#editUserRoleModal').data('personnel_code');
    const roleId = $('#modalRoleSelect').val();

    if (!roleId) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเลือกบทบาท',
            text: 'กรุณาเลือกบทบาทสิทธิ์ที่ต้องการมอบให้แก่ผู้ใช้'
        });
        return;
    }

    toggleGlobalLoading(true);
    try {
        const response = await $.ajax({
            url: '/ManageUser/PostCRMPersonalRole',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                personnel_code: personnelCode,
                role_id: roleId,
                status: 'enable'
            })
        });

        if (response && (response.status === 'success' || response.status === true)) {
            Swal.fire({
                icon: 'success',
                title: 'เพิ่มสิทธิ์สำเร็จ!',
                text: 'เพิ่มบทบาทสิทธิ์ให้แก่ผู้ใช้งานเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });
            $('#modalRoleSelect').val('');

            // Update user's roles locally in memory
            const user = allUsersData.find(u => (u.personnel_code || '').toString() === personnelCode.toString());
            const addedRoleName = getRoleNameById(roleId) || roleId;
            if (user) {
                if (!Array.isArray(user.role)) {
                    user.role = user.role ? [user.role] : [];
                }
                const alreadyExists = user.role.some(r => {
                    const rId = (typeof r === 'object' && r !== null) ? (r.role_id || r.roleId || r.id) : r;
                    return rId == roleId;
                });
                if (!alreadyExists) {
                    user.role.push({ role_id: roleId, role_name: addedRoleName });
                }
            }

            renderUserRolesInModal(personnelCode);
            await loadUsersData();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: response.message || 'ไม่สามารถเพิ่มสิทธิ์ได้'
            });
        }
    } catch (error) {
        console.error("Save user role error:", error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
        toggleGlobalLoading(false);
    }
}


async function saveRolePagesPermission() {
    if (!selectedRoleId) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเลือกบทบาท',
            text: 'กรุณาเลือกบทบาทก่อนบันทึกสิทธิ์การเข้าถึง'
        });
        return;
    }

    const pageCheckboxes = $('.page-checkbox');
    if (pageCheckboxes.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'ไม่พบรายการหน้าจอ',
            text: 'ไม่มีรายการหน้าจอให้กำหนดสิทธิ์'
        });
        return;
    }

    toggleGlobalLoading(true, 'กำลังบันทึกสิทธิ์การเข้าถึง...', 'ระบบกำลังบันทึกสิทธิ์หน้าจอ กรุณารอสักครู่');
    try {
        let successCount = 0;
        let errorCount = 0;
        const roleName = selectedRoleName || getRoleNameById(selectedRoleId) || selectedRoleId.toString();

        const items = [];
        pageCheckboxes.each(function () {
            const pageId = $(this).data('page-id');
            const isActive = $(this).is(':checked'); // true = เปิด, false = ปิด

            if (pageId !== undefined && pageId !== null && pageId !== '') {
                items.push({
                    RoleId: selectedRoleId.toString(),
                    PageId: pageId.toString(),
                    RoleName: roleName,
                    IsActive: isActive
                });
            }
        });

        // Send requests in batches to prevent socket/connection deadlock
        const BATCH_SIZE = 5;
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);
            const batchRequests = batch.map(payload => {
                const sendPost = () => $.ajax({
                    url: '/ManageUser/PostPageRole',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(payload)
                });

                return sendPost().then(res => {
                    if (res && (res.status === 'success' || res.status === true)) {
                        successCount++;
                    } else {
                        // Retry once on failure
                        return sendPost().then(retryRes => {
                            if (retryRes && (retryRes.status === 'success' || retryRes.status === true)) {
                                successCount++;
                            } else {
                                errorCount++;
                                console.warn(`Failed to update page ${payload.PageId}:`, retryRes ? retryRes.message : 'Unknown error');
                            }
                        }).catch(err => {
                            errorCount++;
                            console.error(`Error updating page ${payload.PageId}:`, err);
                        });
                    }
                }).catch(err => {
                    // Retry once on network error
                    return sendPost().then(retryRes => {
                        if (retryRes && (retryRes.status === 'success' || retryRes.status === true)) {
                            successCount++;
                        } else {
                            errorCount++;
                            console.warn(`Failed to update page ${payload.PageId}:`, retryRes ? retryRes.message : 'Unknown error');
                        }
                    }).catch(retryErr => {
                        errorCount++;
                        console.error(`Error updating page ${payload.PageId}:`, retryErr);
                    });
                });
            });

            await Promise.all(batchRequests);
        }

        if (errorCount === 0) {
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสิทธิ์การเข้าถึงเรียบร้อย',
                text: `บันทึกสิทธิ์หน้าจอสำหรับบทบาท "${roleName}" สำเร็จทั้งหมด (${successCount} รายการ)`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'บันทึกสิทธิ์เสร็จสิ้นบางส่วน',
                text: `สำเร็จ ${successCount} รายการ, เกิดข้อผิดพลาด ${errorCount} รายการ`
            });
        }

        await loadPagesData();
        await loadRolesData();
        if (selectedRoleId) {
            renderPagePermissionsGrid(selectedRoleId);
        }
    } catch (error) {
        console.error("Save role pages error:", error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์หน้าจอ' });
    } finally {
        toggleGlobalLoading(false);
    }
}

async function createNewRole() {
    const roleName = $('#newRoleNameInput').val().trim();
    if (!roleName) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณากรอกชื่อบทบาท',
            text: 'ระบุชื่อบทบาทใหม่ที่ต้องการสร้าง'
        });
        return;
    }

    toggleGlobalLoading(true);
    try {
        const response = await $.ajax({
            url: '/ManageUser/PostCRMRole',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                role_name: roleName
            })
        });

        if (response && (response.status === 'success' || response.status === true)) {
            Swal.fire({
                icon: 'success',
                title: 'สร้างบทบาทสำเร็จ!',
                text: `สร้างบทบาท "${roleName}" เรียบร้อยแล้ว`,
                timer: 1500,
                showConfirmButton: false
            });
            $('#newRoleNameInput').val('');
            bootstrap.Modal.getInstance(document.getElementById('addRoleModal')).hide();
            await loadRolesData();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: response.message || 'ไม่สามารถสร้างบทบาทได้'
            });
        }
    } catch (error) {
        console.error("Create role error:", error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการสร้างบทบาท' });
    } finally {
        toggleGlobalLoading(false);
    }
}

function parseApiResponse(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.data && response.data.data && Array.isArray(response.data.data)) return response.data.data;
    if (response.result && Array.isArray(response.result)) return response.result;
    return [];
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toggleGlobalLoading(visible, title = 'กำลังบันทึกข้อมูล', description = 'ระบบกำลังดำเนินการบันทึกข้อมูลของคุณ กรุณารอสักครู่...') {
    const overlay = $('#globalLoadingOverlay');
    if (overlay.length) {
        if (visible) {
            $('#loadingTitle').text(title);
            $('#loadingDescription').text(description);
            overlay.addClass('show').removeClass('d-none');
        } else {
            overlay.removeClass('show').addClass('d-none');
        }
    }
}
