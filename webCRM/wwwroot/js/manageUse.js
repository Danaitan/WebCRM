// Global variables for data management
let allUsersData = [];
let allRolesData = [];
let allPagesData = [];
let allFuncsData = [];
let allBranchesData = [];
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
        $('.page-checkbox:not(:disabled)').prop('checked', true);
    });

    $('#btnDeselectAllPages').on('click', function () {
        $('.page-checkbox:not(:disabled)').prop('checked', false);
    });

    // Function modal events
    $('#btnSaveRoleFuncs').on('click', function () {
        saveRoleFuncPermissions();
    });

    $('#btnSelectAllFuncs').on('click', function () {
        $('.func-checkbox:visible:not(:disabled)').prop('checked', true);
    });

    $('#btnDeselectAllFuncs').on('click', function () {
        $('.func-checkbox:visible:not(:disabled)').prop('checked', false);
    });

    $('#funcSearchInput').on('keyup input', function () {
        filterFuncList();
    });

    // Parent checkbox change event (toggle children)
    $(document).on('change', '.page-parent-checkbox', function () {
        const parentId = $(this).data('page-id');
        const isChecked = $(this).is(':checked');
        $(`.page-child-checkbox[data-parent-id="${parentId}"]:not(:disabled)`).prop('checked', isChecked);
    });

    // Child checkbox change event (ensure parent is checked if child is checked)
    $(document).on('change', '.page-child-checkbox', function () {
        const parentId = $(this).data('parent-id');
        const isChecked = $(this).is(':checked');
        if (isChecked) {
            $(`.page-parent-checkbox[data-page-id="${parentId}"]:not(:disabled)`).prop('checked', true);
        }
    });

    // Create new role event
    $('#btnCreateRole').on('click', function () {
        createNewRole();
    });

    // Branch search and selection events in user modal
    $('#branchSearchInput').on('keyup input', function () {
        filterBranchCheckboxes();
    });

    // Branch box click event in user modal (toggle selection and background color)
    $(document).on('click', '.branch-checkbox-item', function () {
        const checkbox = $(this).find('.branch-checkbox');
        const nextState = !checkbox.prop('checked');
        toggleBranchItemState($(this), nextState);
        updateBranchSelectedCount();
    });

    $('#btnSelectAllBranches').on('click', function () {
        $('.branch-checkbox-item:visible').each(function () {
            toggleBranchItemState($(this), true);
        });
        updateBranchSelectedCount();
    });

    $('#btnDeselectAllBranches').on('click', function () {
        $('.branch-checkbox-item:visible').each(function () {
            toggleBranchItemState($(this), false);
        });
        updateBranchSelectedCount();
    });

    // Auto focus search field on select2 open
    $(document).on('select2:open', () => {
        const searchInput = document.querySelector('.select2-container--open .select2-search__field');
        if (searchInput) {
            searchInput.focus();
        }
    });
});

async function initPage() {
    toggleGlobalLoading(true, 'กำลังโหลดข้อมูล...', 'ระบบกำลังโหลดข้อมูลผู้ใช้งาน บทบาท สิทธิ์หน้าจอ และสาขา กรุณารอสักครู่');
    try {
        await Promise.all([
            loadRolesData(),
            loadPagesData(),
            loadFuncsData(),
            loadBranchesData()
        ]);
        await loadUsersData();
    } catch (err) {
        console.error("Error initializing page:", err);
    } finally {
        toggleGlobalLoading(false);
    }
}

async function loadBranchesData() {
    try {
        const response = await $.ajax({
            url: '/ManageUser/getBranchListForCRM',
            type: 'GET',
            dataType: 'json'
        });
        allBranchesData = parseApiResponse(response) || response || [];
    } catch (error) {
        console.error("Failed to load branches data:", error);
        allBranchesData = [];
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

function isRoleActive(roleItem, defaultRoleId = null) {
    if (!roleItem) return false;

    if (typeof roleItem === 'object' && roleItem !== null) {
        const status = (roleItem.role_status || roleItem.status || '').toString().toLowerCase().trim();
        if (status && status !== 'enable') {
            return false;
        }
    }

    const id = (typeof roleItem === 'object' && roleItem !== null)
        ? (roleItem.role_id || defaultRoleId)
        : (roleItem || defaultRoleId);

    if (id && allRolesData && allRolesData.length > 0) {
        const masterRole = allRolesData.find(r => (r.role_id || '').toString() === id.toString());
        if (masterRole) {
            const masterStatus = (masterRole.status || masterRole.role_status || '').toString().toLowerCase().trim();
            if (masterStatus !== 'enable') {
                return false;
            }
        }
    }

    return true;
}

function getUserRoleCount(user) {
    return extractUserRoles(user).length;
}

function getUserRoleInfo(user) {
    const roles = extractUserRoles(user);
    let roleId = '';
    let roleName = '';
    if (roles.length > 0) {
        roleId = roles[0].role_id || '';
        const names = roles.map(r => r.role_name).filter(Boolean);
        roleName = names.join(', ');
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

            const varFunc = getUserVariableFunc(user);
            let branchDisplayHtml = '';
            if (varFunc) {
                const branchCodes = varFunc.split(',').map(s => s.trim()).filter(Boolean);
                if (branchCodes.length > 0) {
                    const branchNames = branchCodes.map(c => {
                        const found = (allBranchesData || []).find(b => (b.offcde || b.Offcde || '').toString().trim() === c);
                        return found ? (found.branch_name || found.BranchName || c) : c;
                    });
                    const summary = branchNames.slice(0, 2).join(', ') + (branchNames.length > 2 ? ` (+${branchNames.length - 2})` : '');
                    branchDisplayHtml = `<div class="mt-1 small text-muted text-truncate" style="max-width: 220px;" title="สาขาที่รับผิดชอบ: ${escapeHtml(branchNames.join(', '))}">
                        <i class="bi bi-geo-alt-fill text-danger me-1"></i><span class="text-dark fw-medium">${escapeHtml(summary)}</span>
                    </div>`;
                }
            }

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
                    <td>
                        <span class="badge role-badge ${badgeClass}">${escapeHtml(roleName)}</span>
                        ${branchDisplayHtml}
                    </td>
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

async function loadRolesData() {
    try {
        const response = await $.ajax({
            url: '/ManageUser/GetCRMRoles',
            type: 'GET',
            dataType: 'json'
        });
        allRolesData = parseApiResponse(response) || [];
        allRolesData.sort((a, b) => {
            const statusA = (a.status || a.role_status || '').toString().toLowerCase().trim();
            const statusB = (b.status || b.role_status || '').toString().toLowerCase().trim();
            const isEnableA = statusA === 'enable' ? 0 : 1;
            const isEnableB = statusB === 'enable' ? 0 : 1;
            if (isEnableA !== isEnableB) {
                return isEnableA - isEnableB;
            }
            return (a.role_id || '').toString().localeCompare((b.role_id || '').toString(), undefined, { numeric: true });
        });

        const filterRoles = allRolesData.filter(role => {
            const status = (role.status || role.role_status || '').toString().toLowerCase().trim();
            return status === 'enable';
        });
        $('#statTotalRoles').text(filterRoles.length);
        renderRolesFilterDropdown(filterRoles);
        renderRolesSelectionList(filterRoles);
        renderRolesTable(allRolesData);
    } catch (error) {
        console.error("Failed to load roles data:", error);
    }
}

function renderRolesFilterDropdown(roles) {
    const userFilter = $('#userRoleFilter');
    if (userFilter.hasClass('select2-hidden-accessible')) {
        userFilter.select2('destroy');
    }
    userFilter.find('option:not(:first)').remove();

    roles.forEach(role => {
        const id = role.role_id || '';
        const name = role.role_name || '';

        if (id) {
            userFilter.append(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
        }
    });

    if (typeof $.fn !== 'undefined' && $.fn.select2) {
        userFilter.select2({
            theme: 'bootstrap-5',
            placeholder: '-- กรองตามบทบาทสิทธิ์ทั้งหมด --',
            allowClear: true,
            width: '100%'
        }).on('change', function () {
            filterUsersTable();
        });
    }
}

function renderRolesSelectionList(roles) {
    const list = $('#roleSelectionList');
    list.empty();

    if (!roles || roles.length === 0) {
        list.html('<div class="text-center text-muted py-3">ไม่พบบทบาทในระบบ</div>');
        return;
    }
    roles.forEach((role, index) => {
        const id = role.role_id || '';
        const name = role.role_name || '';

        const item = `
            <div class="role-item p-3 bg-light rounded-3 d-flex align-items-center justify-content-between gap-2" 
                 id="role-item-${id}" onclick="selectRoleForPermissions('${escapeHtml(id)}', '${escapeHtml(name)}')">
                <div style="min-width: 0;">
                    <div class="fw-bold text-dark text-truncate">${escapeHtml(name)}</div>
                    <span class="text-muted small">ID: ${escapeHtml(id)}</span>
                </div>
                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                    <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-2 py-1 shadow-sm" 
                            title="จัดการสิทธิ์ฟังก์ชัน"
                            onclick="event.stopPropagation(); openManageRoleFuncModal('${escapeHtml(id)}', '${escapeHtml(name)}')">
                        <i class="bi bi-sliders me-1"></i>จัดการสิทธิ์
                    </button>
                </div>
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
        const status = (role.status || role.role_status || '').toString().toLowerCase().trim();

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
        order: [],
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

function getPageIcon(page) {
    if (!page) return 'bi-window-sidebar';
    if (page.icon) return page.icon;
    const title = (page.Title || '').toLowerCase();
    const path = (page.Path || '').toLowerCase();
    const id = String(page.Id || '');

    if (id === '1' || title.includes('dashboard')) return 'bi-speedometer2';
    if (path.includes('dashboardprospectcall') || (title.includes('ติดต่อ') && title.includes('ลูกค้า'))) return 'bi-telephone-inbound';
    if (path.includes('dashboardsuggestion') || path.includes('suggestion') || title.includes('ข้อเสนอแนะ') || title.includes('ร้องเรียน')) return 'bi-chat-left-dots';
    if (path.includes('customerdetail') || (title.includes('ข้อมูล') && title.includes('ลูกค้า'))) return 'bi-person-vcard';
    if (path.includes('campain') || title.includes('campaign create')) return 'bi-megaphone';
    if (path.includes('prospectsetup') || title.includes('prospect setup')) return 'bi-people-fill';
    if (path.includes('productapprove') || title.includes('approve')) return 'bi-shield-check';
    if (path.includes('prospectassign') || title.includes('prospect assign')) return 'bi-person-check';
    if (path.includes('prospectcall') || title.includes('ขายและติดตาม') || title.includes('ขาย')) return 'bi-telephone';
    if (path.includes('manageuser') || title.includes('ตั้งค่าผู้ใช้')) return 'bi-person-gear';

    return 'bi-window-sidebar';
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
        
        let totalCount = 0;
        allPagesData.forEach(p => {
            totalCount++;
            if (p.dropdown && Array.isArray(p.dropdown)) {
                totalCount += p.dropdown.length;
            }
        });
        $('#statTotalPages').text(totalCount);
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
    $('#btnHeaderManageFuncs').prop('disabled', false);

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
    const currentRole = (allRolesData || []).find(r => r.role_id == roleId);
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
        const icon = getPageIcon(page);
        const hasDropdown = page.dropdown && Array.isArray(page.dropdown) && page.dropdown.length > 0;

        // ตรวจสอบว่าเป็น Public Page หรือไม่ (1, 2, 8)
        const isPublicPage = PagePublic.some(id => String(id) === String(pageId));

        // Check if parent page is assigned to role
        const isChecked = isPublicPage ||
            assignedPageIds.some(id => String(id) === String(pageId)) ||
            (page.assignedRoles && Array.isArray(page.assignedRoles) && page.assignedRoles.some(r => String(r) === String(roleId)));

        if (hasDropdown) {
            // Render Parent with Dropdown / Submenus
            let subItemsHtml = '';
            page.dropdown.forEach(child => {
                const childId = child.Id || '';
                const childName = child.Title || '';
                const childUrl = child.Path || '';
                const childIcon = getPageIcon(child);
                const isChildPublic = PagePublic.some(id => String(id) === String(childId));
                const isChildChecked = isChildPublic ||
                    assignedPageIds.some(id => String(id) === String(childId)) ||
                    (child.assignedRoles && Array.isArray(child.assignedRoles) && child.assignedRoles.some(r => String(r) === String(roleId)));

                subItemsHtml += `
                    <div class="col-12 col-md-6 col-lg-4">
                        <div class="page-child-card p-2 px-3 d-flex align-items-center justify-content-between h-100">
                            <div class="d-flex align-items-center gap-2" style="min-width: 0;">
                                <div class="bg-white p-1 px-2 rounded text-primary border shadow-sm d-flex align-items-center justify-content-center flex-shrink-0" style="width: 32px; height: 32px;">
                                    <i class="bi ${escapeHtml(childIcon)} fs-6"></i>
                                </div>
                                <div style="min-width: 0;">
                                    <div class="fw-semibold text-dark small mb-0 text-truncate d-flex align-items-center gap-1">
                                        <span class="text-truncate">${escapeHtml(childName)}</span>
                                    </div>
                                    <span class="text-muted text-truncate d-block" style="font-size: 0.75rem;">${escapeHtml(childUrl || 'ID: ' + childId)}</span>
                                </div>
                            </div>
                            <div class="form-check form-switch fs-5 mb-0 ms-2 flex-shrink-0">
                                <input class="form-check-input page-checkbox page-child-checkbox" type="checkbox" 
                                       id="page_chk_${escapeHtml(childId)}"
                                       data-page-id="${escapeHtml(childId)}" 
                                       data-parent-id="${escapeHtml(pageId)}"
                                       data-page-name="${escapeHtml(childName)}" 
                                       data-initial-checked="${isChildChecked ? 'true' : 'false'}"
                                       ${isChildChecked ? 'checked' : ''} 
                                       ${isChildPublic ? 'disabled' : ''} />
                            </div>
                        </div>
                    </div>
                `;
            });

            const collapseId = `collapse_page_${escapeHtml(pageId)}`;
            const parentCard = `
                <div class="col-12">
                    <div class="page-perm-card page-parent-card p-3 shadow-sm rounded-3">
                        <div class="d-flex align-items-center justify-content-between gap-2">
                            <!-- Clickable Header Area for Expand / Collapse -->
                            <div class="d-flex align-items-center gap-3 flex-grow-1 user-select-none page-parent-header" 
                                 style="cursor: pointer; min-width: 0;" 
                                 data-bs-toggle="collapse" 
                                 data-bs-target="#${collapseId}" 
                                 aria-expanded="false" 
                                 aria-controls="${collapseId}">
                                <div class="bg-primary bg-opacity-10 p-2 rounded-3 text-primary d-flex align-items-center justify-content-center flex-shrink-0" style="width: 42px; height: 42px;">
                                    <i class="bi ${escapeHtml(icon)} fs-5"></i>
                                </div>
                                <div class="flex-grow-1" style="min-width: 0;">
                                    <div class="d-flex align-items-center gap-2 flex-wrap">
                                        <span class="fw-bold text-dark fs-6 text-truncate">${escapeHtml(pageName)}</span>
                                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill small px-2">
                                            <i class="bi bi-diagram-3 me-1"></i>${page.dropdown.length} เมนูย่อย
                                        </span>
                                    </div>
                                    <span class="text-muted small text-truncate d-block">${escapeHtml(pageUrl || 'Page ID: ' + pageId)}</span>
                                </div>
                                <div class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 d-flex align-items-center gap-1 flex-shrink-0 me-1">
                                    <span style="font-size: 0.8rem;">เมนูย่อย</span>
                                    <i class="bi bi-chevron-down toggle-icon transition-icon" style="font-size: 0.75rem;"></i>
                                </div>
                            </div>
                            <!-- Switch Button Area with clear separation -->
                            <div class="d-flex align-items-center flex-shrink-0 ps-3 border-start" style="min-width: 55px; justify-content: center;">
                                <div class="form-check form-switch fs-5 mb-0">
                                    <input class="form-check-input page-checkbox page-parent-checkbox" type="checkbox" role="switch"
                                           id="page_chk_${escapeHtml(pageId)}"
                                           data-page-id="${escapeHtml(pageId)}" 
                                           data-page-name="${escapeHtml(pageName)}" 
                                           data-has-children="true"
                                           data-initial-checked="${isChecked ? 'true' : 'false'}"
                                           ${isChecked ? 'checked' : ''} 
                                           ${isPublicPage ? 'disabled' : ''} 
                                           style="cursor: pointer;" />
                                </div>
                            </div>
                        </div>
                        <div class="collapse" id="${collapseId}">
                            <div class="pt-3 border-top mt-2">
                                <div class="text-muted small fw-semibold mb-2 d-flex align-items-center gap-1">
                                    <i class="bi bi-arrow-return-right text-primary"></i>
                                    <span>รายการเมนูย่อย (${page.dropdown.length} รายการ):</span>
                                </div>
                                <div class="row g-2">
                                    ${subItemsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.append(parentCard);
        } else {
            // Standalone page without dropdown
            const card = `
                <div class="col-12 col-md-6">
                    <div class="page-perm-card p-3 bg-white d-flex align-items-center justify-content-between h-100">
                        <div class="d-flex align-items-center gap-3">
                            <div class="bg-light p-2 rounded-3 text-primary d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                                <i class="bi ${escapeHtml(icon)} fs-5"></i>
                            </div>
                            <div>
                                <div class="fw-bold text-dark mb-0 d-flex align-items-center gap-1">
                                    <span>${escapeHtml(pageName)}</span>
                                </div>
                                <span class="text-muted small">${escapeHtml(pageUrl || 'Page ID: ' + pageId)}</span>
                            </div>
                        </div>
                        <div class="form-check form-switch fs-5 mb-0">
                            <input class="form-check-input page-checkbox" type="checkbox" 
                                   id="page_chk_${escapeHtml(pageId)}"
                                   data-page-id="${escapeHtml(pageId)}" 
                                   data-page-name="${escapeHtml(pageName)}" 
                                   data-initial-checked="${isChecked ? 'true' : 'false'}"
                                   ${isChecked ? 'checked' : ''} 
                                   ${isPublicPage ? 'disabled' : ''} />
                        </div>
                    </div>
                </div>
            `;
            container.append(card);
        }
    });
}

// ACTION HANDLERS (POST APIS)
function extractUserRoles(user) {
    if (!user) return [];
    let rolesList = [];
    if (Array.isArray(user.role)) {
        rolesList = user.role
            .filter(r => isRoleActive(r))
            .map(r => {
                if (typeof r === 'object' && r !== null) {
                    const id = r.role_id || r.roleId || r.id || '';
                    const name = r.role_name || r.roleName || r.name || getRoleNameById(id) || id;
                    return { role_id: id, role_name: name, variable_func: r.variable_func || user.variable_func || '' };
                }
                const id = (r || '').toString();
                return { role_id: id, role_name: getRoleNameById(id) || id, variable_func: user.variable_func || '' };
            })
            .filter(r => r.role_id);
    } else if (user.role && typeof user.role === 'object') {
        if (isRoleActive(user.role)) {
            const id = user.role.role_id || user.role.roleId || user.role.id || '';
            const name = user.role.role_name || user.role.roleName || user.role.name || getRoleNameById(id) || id;
            if (id) rolesList.push({ role_id: id, role_name: name, variable_func: user.role.variable_func || user.variable_func || '' });
        }
    } else if (user.role_id || user.role) {
        const status = user.role_status || user.status;
        const roleObj = status ? { role_id: user.role_id || user.role, status: status, role_status: status } : (user.role_id || user.role);
        if (isRoleActive(roleObj, user.role_id || user.role)) {
            const id = (user.role_id || user.role).toString();
            if (id) rolesList.push({ role_id: id, role_name: getRoleNameById(id) || id, variable_func: user.variable_func || '' });
        }
    }
    return rolesList;
}

function getUserVariableFunc(user) {
    if (!user) return '';
    if (user.variable_func !== undefined && user.variable_func !== null) {
        return user.variable_func.toString().trim();
    }
    if (user.variableFunc !== undefined && user.variableFunc !== null) {
        return user.variableFunc.toString().trim();
    }
    if (Array.isArray(user.role) && user.role.length > 0) {
        for (const r of user.role) {
            if (typeof r === 'object' && r !== null) {
                if (r.variable_func !== undefined && r.variable_func !== null && r.variable_func !== '') return r.variable_func.toString().trim();
                if (r.variableFunc !== undefined && r.variableFunc !== null && r.variableFunc !== '') return r.variableFunc.toString().trim();
            }
        }
    }
    if (user.role && typeof user.role === 'object') {
        if (user.role.variable_func !== undefined && user.role.variable_func !== null) return user.role.variable_func.toString().trim();
        if (user.role.variableFunc !== undefined && user.role.variableFunc !== null) return user.role.variableFunc.toString().trim();
    }
    return '';
}

function openEditUserRoleModal(code, name) {
    const user = allUsersData.find(u => (u.personnel_code || '').toString() === code.toString());
    $('#modalPersonnelCode').text(code);
    $('#modalPersonnelName').text(name || (user ? user.thname : '-'));
    $('#editUserRoleModal').data('personnel_code', code);

    const userRoles = extractUserRoles(user);
    const currentRoleId = (userRoles.length > 0) ? (userRoles[0].role_id || '').toString() : '';
    $('#editUserRoleModal').data('initial_role_id', currentRoleId);

    const initialVariableFunc = getUserVariableFunc(user);
    $('#editUserRoleModal').data('initial_variable_func', initialVariableFunc);

    renderModalRoleSelect(currentRoleId);

    let selectedBranches = [];
    if (initialVariableFunc) {
        selectedBranches = initialVariableFunc.split(',').map(s => s.trim()).filter(Boolean);
    }
    renderModalBranchCheckboxes(selectedBranches);

    const modal = new bootstrap.Modal(document.getElementById('editUserRoleModal'));
    modal.show();
}

function renderModalRoleSelect(currentRoleId) {
    const modalSelect = $('#modalRoleSelect');
    if (modalSelect.hasClass('select2-hidden-accessible')) {
        modalSelect.select2('destroy');
    }

    modalSelect.empty();
    modalSelect.append('<option value="">-- ยังไม่กำหนดบทบาท / ไม่มีสิทธิ์ --</option>');

    const enableRoles = (allRolesData || []).filter(role => {
        const status = (role.status || role.role_status || '').toString().toLowerCase().trim();
        return status === 'enable';
    });

    enableRoles.forEach(role => {
        const id = (role.role_id || '').toString();
        const name = role.role_name || '';
        if (id) {
            const isSelected = (id === (currentRoleId || '').toString()) ? 'selected' : '';
            modalSelect.append(`<option value="${escapeHtml(id)}" ${isSelected}>${escapeHtml(name)} (${escapeHtml(id)})</option>`);
        }
    });

    modalSelect.val(currentRoleId || '');

    if (typeof $.fn !== 'undefined' && $.fn.select2) {
        modalSelect.select2({
            theme: 'bootstrap-5',
            dropdownParent: $('#editUserRoleModal'),
            placeholder: '-- เลือกบทบาทสิทธิ์ --',
            allowClear: false,
            width: '100%',
            language: {
                noResults: function () {
                    return 'ไม่พบบทบาทที่ค้นหา';
                }
            }
        });
    }
}

function renderModalBranchCheckboxes(selectedBranches = []) {
    const container = $('#modalBranchCheckboxContainer');
    $('#branchSearchInput').val('');
    container.empty();

    if (!allBranchesData || allBranchesData.length === 0) {
        container.html('<div class="text-center text-muted py-5 small"><i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>ไม่พบข้อมูลสาขา</div>');
        updateBranchSelectedCount();
        return;
    }

    let html = '<div class="row g-2">';
    allBranchesData.forEach(branch => {
        const offcde = (branch.offcde || '').toString().trim();
        const branchName = branch.branch_name || '';
        if (offcde) {
            const isChecked = selectedBranches.includes(offcde);
            const label = branchName ? `${offcde} - ${branchName}` : offcde;
            const selectedClass = isChecked ? 'selected' : '';
            html += `
                <div class="col-12 col-md-6 branch-item-col" data-search-text="${escapeHtml(label.toLowerCase())}">
                    <div class="branch-checkbox-item py-2 px-3 rounded-3 shadow-sm d-flex align-items-center justify-content-between h-100 ${selectedClass}" 
                         title="${escapeHtml(label)}">
                        <div class="d-flex align-items-center gap-2 overflow-hidden pe-2">
                            <i class="bi bi-building ${isChecked ? 'text-white' : 'text-primary'} branch-icon flex-shrink-0"></i>
                            <span class="small text-truncate branch-label fw-medium">${escapeHtml(label)}</span>
                        </div>
                        <i class="bi bi-check-circle-fill branch-check-icon flex-shrink-0 ${isChecked ? '' : 'd-none'}"></i>
                        <input class="branch-checkbox d-none" type="checkbox" value="${escapeHtml(offcde)}" ${isChecked ? 'checked' : ''}>
                    </div>
                </div>
            `;
        }
    });
    html += '</div>';

    container.html(html);
    updateBranchSelectedCount();
}

function toggleBranchItemState($item, isChecked) {
    const checkbox = $item.find('.branch-checkbox');
    checkbox.prop('checked', isChecked);
    if (isChecked) {
        $item.addClass('selected');
        $item.find('.branch-icon').removeClass('text-primary').addClass('text-white');
        $item.find('.branch-check-icon').removeClass('d-none');
    } else {
        $item.removeClass('selected');
        $item.find('.branch-icon').removeClass('text-white').addClass('text-primary');
        $item.find('.branch-check-icon').addClass('d-none');
    }
}

function filterBranchCheckboxes() {
    const term = ($('#branchSearchInput').val() || '').toLowerCase().trim();
    $('.branch-item-col').each(function () {
        const text = $(this).data('search-text') || '';
        if (!term || text.includes(term)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

function updateBranchSelectedCount() {
    const count = $('.branch-checkbox:checked').length;
    $('#branchSelectedCount').text(`เลือก ${count} สาขา`);
}

async function saveUserRole() {
    const personnelCode = $('#editUserRoleModal').data('personnel_code');
    const initialRoleId = ($('#editUserRoleModal').data('initial_role_id') || '').toString();
    const selectedRoleId = ($('#modalRoleSelect').val() || '').toString();

    const initialVariableFunc = ($('#editUserRoleModal').data('initial_variable_func') || '').toString().trim();
    const branchValues = $('.branch-checkbox:checked').map(function () { return $(this).val(); }).get();
    const newVariableFunc = branchValues.join(',');

    const isRoleChanged = (selectedRoleId !== initialRoleId);
    const isVariableFuncChanged = (newVariableFunc !== initialVariableFunc);

    if (!isRoleChanged && !isVariableFuncChanged) {
        const modalEl = document.getElementById('editUserRoleModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        return;
    }

    const user = allUsersData.find(u => (u.personnel_code || '').toString() === personnelCode.toString());
    const existingRoles = extractUserRoles(user);

    toggleGlobalLoading(true, 'กำลังบันทึกข้อมูล...', 'กำลังอัปเดตบทบาทสิทธิ์และสาขาที่รับผิดชอบ กรุณารอสักครู่');
    try {
        // 1. ถอดสิทธิ์เดิมออกทั้งหมดหากมีสิทธิ์เดิมที่ไม่ตรงกับสิทธิ์ใหม่
        if (isRoleChanged) {
            for (const oldRole of existingRoles) {
                const oldRoleId = (oldRole.role_id || '').toString();
                if (oldRoleId && oldRoleId !== selectedRoleId) {
                    await $.ajax({
                        url: '/ManageUser/PostCRMPersonalRole',
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            personnel_code: personnelCode,
                            role_id: oldRoleId,
                            status: 'unable'
                        })
                    });
                }
            }

            // มอบหมายสิทธิ์ใหม่หากมีการเลือกสิทธิ์
            if (selectedRoleId) {
                const response = await $.ajax({
                    url: '/ManageUser/PostCRMPersonalRole',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        personnel_code: personnelCode,
                        role_id: selectedRoleId,
                        status: 'enable'
                    })
                });

                if (!response || (response.status !== 'success' && response.status !== true)) {
                    throw new Error(response ? (response.message || 'ไม่สามารถกำหนดสิทธิ์ได้') : 'เกิดข้อผิดพลาดในการกำหนดสิทธิ์');
                }
            }
        }

        // 2. อัปเดต variable_func (สาขาที่รับผิดชอบ)
        const activeRoleId = selectedRoleId || initialRoleId;
        if (isVariableFuncChanged || (selectedRoleId && isRoleChanged)) {
            const varResponse = await $.ajax({
                url: '/ManageUser/UpdateVariableFunc',
                type: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify({
                    personnel_code: personnelCode,
                    role_id: activeRoleId || '',
                    variable_func: newVariableFunc
                })
            });

            if (varResponse && varResponse.status === 'error') {
                console.warn("Update variable_func returned error:", varResponse.message || varResponse.detail);
            }
        }

        const modalEl = document.getElementById('editUserRoleModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ!',
            text: 'อัปเดตบทบาทสิทธิ์และสาขาที่รับผิดชอบเรียบร้อยแล้ว',
            timer: 1500,
            showConfirmButton: false
        });

        await loadUsersData();
    } catch (error) {
        console.error("Save user role error:", error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
        });
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

    const roleName = selectedRoleName || getRoleNameById(selectedRoleId) || selectedRoleId.toString();
    const items = [];

    pageCheckboxes.each(function () {
        if ($(this).is(':disabled')) return;

        const pageId = $(this).data('page-id');
        const isActive = $(this).is(':checked'); 
        const initialChecked = String($(this).attr('data-initial-checked')) === 'true';

        if (isActive !== initialChecked) {
            if (pageId !== undefined && pageId !== null && pageId !== '') {
                items.push({
                    RoleId: selectedRoleId.toString(),
                    PageId: pageId.toString(),
                    RoleName: roleName,
                    IsActive: isActive
                });
            }
        }
    });

    if (items.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'ไม่มีการเปลี่ยนแปลง',
            text: 'สิทธิ์การเข้าถึงของบทบาทนี้ไม่มีการเปลี่ยนแปลง',
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }

    toggleGlobalLoading(true, 'กำลังบันทึกสิทธิ์การเข้าถึง...', `ระบบกำลังบันทึกสิทธิ์หน้าจอ ${items.length} รายการ กรุณารอสักครู่`);
    try {
        let successCount = 0;
        let errorCount = 0;

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

async function loadFuncsData() {
    try {
        const response = await $.ajax({
            url: '/ManageUser/GetFunc',
            type: 'GET',
            dataType: 'json'
        });
        allFuncsData = parseApiResponse(response) || [];
    } catch (error) {
        console.error("Failed to load functions data:", error);
        allFuncsData = [];
    }
}

function getFuncIcon(funcId, funcName) {
    const name = (funcName || '').toLowerCase();
    const id = (funcId || '').toLowerCase();
    if (name.includes('view') || name.includes('ดู')) return 'bi-eye-fill text-info';
    if (name.includes('edit') || name.includes('แก้ไข')) return 'bi-pencil-square text-warning';
    if (name.includes('close') || name.includes('ปิด')) return 'bi-x-circle-fill text-danger';
    if (name.includes('campaign') || name.includes('แคมเปญ')) return 'bi-megaphone-fill text-primary';
    if (name.includes('create') || name.includes('สร้าง') || name.includes('เพิ่ม')) return 'bi-plus-circle-fill text-success';
    if (name.includes('delete') || name.includes('ลบ')) return 'bi-trash-fill text-danger';
    if (name.includes('approve') || name.includes('อนุมัติ')) return 'bi-shield-check text-success';
    if (name.includes('export') || name.includes('ดาวน์โหลด')) return 'bi-download text-primary';
    return 'bi-gear-fill text-primary';
}

async function openManageRoleFuncModal(roleId, roleName) {
    if (!roleId) return;
    const name = roleName || getRoleNameById(roleId) || roleId;
    $('#modalFuncRoleName').text(name);
    $('#modalFuncRoleId').text(roleId);
    $('#manageRoleFuncModal').data('role_id', roleId);
    $('#manageRoleFuncModal').data('role_name', name);
    $('#funcSearchInput').val('');

    if (!allFuncsData || allFuncsData.length === 0) {
        $('#modalFuncListContainer').html(`
            <div class="col-12 text-center text-muted py-4">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                กำลังโหลดข้อมูลฟังก์ชัน...
            </div>
        `);
        await loadFuncsData();
    }

    renderModalFuncList(roleId);

    const modal = new bootstrap.Modal(document.getElementById('manageRoleFuncModal'));
    modal.show();
}

function openSelectedRoleFuncModal() {
    if (!selectedRoleId) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเลือกบทบาท',
            text: 'กรุณาเลือกบทบาทจากรายการด้านซ้ายก่อนจัดการฟังก์ชัน'
        });
        return;
    }
    openManageRoleFuncModal(selectedRoleId, selectedRoleName);
}

function filterFuncList() {
    const roleId = ($('#manageRoleFuncModal').data('role_id') || '').toString();
    const searchVal = $('#funcSearchInput').val();
    renderModalFuncList(roleId, searchVal);
}

function renderModalFuncList(roleId, filterText = '') {
    const container = $('#modalFuncListContainer');
    container.empty();

    if (!allFuncsData || allFuncsData.length === 0) {
        container.html(`
            <div class="col-12 text-center text-muted py-4">
                <i class="bi bi-info-circle fs-3 d-block mb-2 text-secondary"></i>
                ไม่พบรายการฟังก์ชันในระบบ
            </div>
        `);
        $('#funcCountSummary').text('พบ 0 รายการ');
        return;
    }

    const currentRole = (allRolesData || []).find(r => (r.role_id || '').toString() === (roleId || '').toString());
    let activeFuncIds = new Set();
    if (currentRole) {
        const rawFuncs = currentRole.Func || currentRole.func || currentRole.RoleFunc || currentRole.role_func || currentRole.functions || currentRole.Functions || currentRole.func_id || [];
        if (Array.isArray(rawFuncs)) {
            rawFuncs.forEach(f => {
                if (typeof f === 'object' && f !== null) {
                    const fId = (f.func_id || f.funcId || f.id || f.RID || '').toString();
                    const status = (f.status || f.func_status || '').toString().toLowerCase().trim();
                    if (status === '' || status === 'enable') {
                        if (fId) activeFuncIds.add(fId);
                    }
                } else if (f !== undefined && f !== null) {
                    activeFuncIds.add(f.toString());
                }
            });
        }
    }

    const search = (filterText || '').toLowerCase().trim();
    const filteredFuncs = allFuncsData.filter(func => {
        if (!search) return true;
        const id = (func.func_id || func.RID || '').toString().toLowerCase();
        const name = (func.func_name || '').toString().toLowerCase();
        const desc = (func.description || '').toString().toLowerCase();
        return id.includes(search) || name.includes(search) || desc.includes(search);
    });

    if (filteredFuncs.length === 0) {
        container.html(`
            <div class="col-12 text-center text-muted py-4">
                <i class="bi bi-search fs-3 d-block mb-2 text-secondary"></i>
                ไม่พบฟังก์ชันที่ตรงกับ "${escapeHtml(filterText)}"
            </div>
        `);
        $('#funcCountSummary').text(`แสดง 0 จาก ${allFuncsData.length} รายการ`);
        return;
    }

    $('#funcCountSummary').text(`แสดง ${filteredFuncs.length} จาก ${allFuncsData.length} รายการ`);

    filteredFuncs.forEach(func => {
        const funcId = (func.func_id || func.RID || '').toString();
        const funcName = func.func_name || func.description || '-';
        const funcDesc = func.description || '';
        const isAssigned = activeFuncIds.has(funcId);
        const iconClass = getFuncIcon(funcId, funcName);

        const card = `
            <div class="col-12 col-md-6 func-item-col" data-func-id="${escapeHtml(funcId)}" data-func-name="${escapeHtml(funcName)}">
                <div class="func-perm-card p-3 d-flex align-items-center justify-content-between h-100 shadow-sm">
                    <div class="d-flex align-items-center gap-3" style="min-width: 0;">
                        <div class="func-icon-box bg-light border shadow-sm">
                            <i class="bi ${escapeHtml(iconClass)}"></i>
                        </div>
                        <div style="min-width: 0;">
                            <div class="fw-bold text-dark text-truncate d-flex align-items-center gap-2">
                                <span>${escapeHtml(funcName)}</span>
                                <span class="badge bg-secondary-subtle text-secondary border small px-2 py-0" style="font-size: 0.72rem;">${escapeHtml(funcId)}</span>
                            </div>
                            <span class="text-muted small text-truncate d-block" style="font-size: 0.8rem;">${escapeHtml(funcDesc || 'รหัสฟังก์ชัน: ' + funcId)}</span>
                        </div>
                    </div>
                    <div class="form-check form-switch fs-5 mb-0 ms-2 flex-shrink-0">
                        <input class="form-check-input func-checkbox" type="checkbox" role="switch"
                               id="func_chk_${escapeHtml(funcId)}"
                               data-func-id="${escapeHtml(funcId)}"
                               data-func-name="${escapeHtml(funcName)}"
                               data-initial-checked="${isAssigned ? 'true' : 'false'}"
                               ${isAssigned ? 'checked' : ''}
                               style="cursor: pointer; width: 2.25em; height: 1.25em;" />
                    </div>
                </div>
            </div>
        `;
        container.append(card);
    });
}

async function saveRoleFuncPermissions() {
    const roleId = ($('#manageRoleFuncModal').data('role_id') || '').toString();
    const roleName = $('#manageRoleFuncModal').data('role_name') || getRoleNameById(roleId) || roleId;

    if (!roleId) {
        Swal.fire({
            icon: 'warning',
            title: 'ไม่พบรหัสบทบาท',
            text: 'กรุณาเลือกบทบาทที่ต้องการบันทึกสิทธิ์'
        });
        return;
    }

    const funcCheckboxes = $('.func-checkbox');
    if (funcCheckboxes.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'ไม่พบฟังก์ชัน',
            text: 'ไม่มีรายการฟังก์ชันให้กำหนดสิทธิ์'
        });
        return;
    }

    const items = [];
    funcCheckboxes.each(function () {
        if ($(this).is(':disabled')) return;
        const funcId = $(this).data('func-id');
        const isChecked = $(this).is(':checked');
        const initialChecked = String($(this).attr('data-initial-checked')) === 'true';

        if (isChecked !== initialChecked) {
            if (funcId) {
                items.push({
                    role_id: roleId,
                    func_id: funcId.toString(),
                    status: isChecked ? 'enable' : 'unable'
                });
            }
        }
    });

    if (items.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'ไม่มีการเปลี่ยนแปลง',
            text: 'สิทธิ์ฟังก์ชันของบทบาทนี้ไม่มีการเปลี่ยนแปลง',
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }

    toggleGlobalLoading(true, 'กำลังบันทึกสิทธิ์ฟังก์ชัน...', `ระบบกำลังบันทึกสิทธิ์ฟังก์ชัน ${items.length} รายการ กรุณารอสักครู่`);
    try {
        let successCount = 0;
        let errorCount = 0;

        for (const payload of items) {
            try {
                const response = await $.ajax({
                    url: '/ManageUser/UpsertRoleFunc',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(payload)
                });
                if (response && (response.status === 'success' || response.status === true)) {
                    successCount++;
                } else {
                    errorCount++;
                    console.warn(`Failed to update func ${payload.func_id}:`, response ? response.message : 'Unknown');
                }
            } catch (err) {
                errorCount++;
                console.error(`Error updating func ${payload.func_id}:`, err);
            }
        }

        const modalEl = document.getElementById('manageRoleFuncModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        if (errorCount === 0) {
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสิทธิ์ฟังก์ชันสำเร็จ!',
                text: `บันทึกสิทธิ์ฟังก์ชันสำหรับบทบาท "${roleName}" เรียบร้อยแล้ว (${successCount} รายการ)`,
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

        await loadRolesData();
    } catch (error) {
        console.error("Save role functions error:", error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์ฟังก์ชัน' });
    } finally {
        toggleGlobalLoading(false);
    }
}

