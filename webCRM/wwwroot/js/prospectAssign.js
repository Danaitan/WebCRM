
let selectedCampaignCode = "";
let prospectTotalCount = 0;
let rawProspectItems = [];
let activeStatusFilter = 'all';
let allBranch = [];
let prospectPage = 1;
let prospectPageSize = 10;
let campaigns = [];
let selectedProspectIds = new Set();
// เก็บรายการ prospect ที่ผ่านการกรองปัจจุบันไว้ทั้งหมด (ทุกหน้า) เพื่อใช้กับ "เลือกทั้งหมด"
let currentFilteredProspectItems = [];

// แปลง selection key (row key ที่เลือกไว้) กลับเป็น id จริงสำหรับส่งไป assign
function resolveSelectedAssignIds() {
    const map = new Map(
        (currentFilteredProspectItems || []).map(x => [x.selectKey, x.assignId])
    );
    const ids = [];
    selectedProspectIds.forEach(selectKey => {
        const assignId = map.has(selectKey) ? map.get(selectKey) : selectKey;
        if (assignId) ids.push(assignId);
    });
    return ids;
}

async function PostNoti(PostNotiData){
    try {
        if (!PostNotiData.receiver && !PostNotiData.receiver_email) {
            console.warn("PostNoti skipped: Both receiver and receiver_email are empty.");
            return null;
        }
        const payload = {
            header: PostNotiData.header || "",
            title: PostNotiData.title || "",
            message: PostNotiData.message || "",
            receiver: PostNotiData.receiver || "",
            sender: PostNotiData.sender || "",
            create_by: PostNotiData.create_by || "",
            end_date: PostNotiData.end_date,
            receiver_email: PostNotiData.receiver_email || ""
        };

        const response = await fetch('/Suggestions/PostNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            skipLoading: true
        });
        return response;
    } catch (error) {
        console.error("Error in PostNotification:", error);
    }
}

async function sendEmail(to, cc, subject, content) {
    const ccArray = Array.isArray(cc)
        ? cc
        : (typeof cc === 'string' && cc.trim() !== '' ? cc.split(',').map(s => s.trim()).filter(Boolean) : []);
    const response = await fetch("/Suggestions/SendEmail", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            to: to,
            cc: ccArray,
            subject: subject,
            content: content
        }),
        skipLoading: true
    });

    return response;
}

async function sendPostNotiForAssign(requestData, actionType) {
    try {
        if (!requestData || !requestData.assign_to) return;

        const campaignCode = document.getElementById('filterCampaignCode')?.value || selectedCampaignCode || '';
        const campaignName = document.getElementById('filterCampaignName')?.value || '';
        const ids = requestData.id || [];
        const count = Array.isArray(ids) ? ids.length : 0;
        const remark = requestData.assign_remark || '';

        let typeName = actionType || 'Assign';
        if (requestData.assign_status === 'reassign') {
            typeName = 'ReAssign';
        } else if (requestData.assign_case === 'group') {
            typeName = 'Assign To Group';
        } else if (requestData.assign_case === 'Auto Bot') {
            typeName = 'Auto Assign';
        }

        const campaignLabel = campaignCode ? `${campaignCode}${campaignName ? ` (${campaignName})` : ''}` : '';
        const header = "Prospect Assign";
        const title = `${typeName} Prospect${campaignCode ? `: Campaign ${campaignCode}` : ''}`;

        const fullNameTh = typeof userFullNameTh !== 'undefined' ? userFullNameTh : '';
        const message =
            `ท่านได้รับการ <b>${typeName} Prospect</b>` +
            `${campaignLabel ? ` จาก Campaign <b>${campaignLabel}</b>` : ''}` +
            ` จำนวน <b>${count}</b> รายการ<br><br>` +
            `ขอขอบคุณ<br>` +
            `${fullNameTh}`;

        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 10);
        const senderId = typeof userId !== 'undefined' ? userId : '';

        const receivers = String(requestData.assign_to)
            .split(',')
            .map(r => r.trim())
            .filter(Boolean);

        for (const receiver of receivers) {
            await PostNoti({
                header: header,
                title: title,
                message: message,
                receiver: receiver,
                sender: senderId,
                create_by: senderId,
                end_date: endDate
            });

            const receiver_profile = await getProfileByCode(receiver);
            const fullNameTh = userFullNameTh || '';
            const homeUrl = `${webDomain}/Login?returnUrl=${encodeURIComponent('/ProspectCall')}`;
            const emailContent =
                `<div style="line-height: 1.7;">
                    <div>
                        ท่านได้รับการ <b>${typeName} Prospect</b>
                        ${campaignLabel ? `จาก Campaign <b>${campaignLabel}</b>` : ''}
                        จำนวน <b>${count}</b> รายการ
                    </div>

                    <div style="margin-top: 12px;">
                        <a href="${homeUrl}">
                            คลิกที่นี่เพื่อเข้าสู่ระบบCRM
                        </a>
                    </div>

                    <div style="margin-top: 16px;">
                        ขอขอบคุณ
                    </div>

                    <div style="font-weight: 600; margin-top: 2px;">
                        ${fullNameTh}
                    </div>
                </div>`;

            if (receiver_profile && receiver_profile.e_mail) {
                await sendEmail(
                    receiver_profile.e_mail,
                    null,
                    "CRM : Assign Campaign " + campaignName,
                    emailContent
                );
            }

        }

    } catch (err) {
        console.error("Error sending PostNoti for Assign:", err);
    }
}

async function getProfileByCode(personalCode) {
    try {
        const response = await fetch(`/Login/GetProfile?user=${personalCode}`, { skipLoading: true });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in getProfileByCode:", error);
        return null;
    }
}

// async function getAllBranch() {
//     if (allBranch && allBranch.length > 0) {
//         return allBranch;
//     }
//     try {
//         const branchResponse = await fetch(`/ProspectAssign/GetAllowedBranchList`);
//         if (!branchResponse.ok) {
//             throw new Error('Network response was not ok');
//         }
//         const branchData = await branchResponse.json();
//         allBranch = branchData || [];
//         return allBranch;
//     } catch (err) {
//         console.error("Error in getAllBranch:", err);
//         return [];
//     }
// }

async function getAllBranch() {
    if (allBranch && allBranch.length > 0) {
        return allBranch;
    }
    try {
        const branchResponse = await fetch('/Campain/getBranchListForCRM');
        if (!branchResponse.ok) {
            throw new Error('Network response was not ok');
        }
        const branchData = await branchResponse.json();
        allBranch = branchData || [];

        return allBranch;
    } catch (err) {
        console.error("Error in getAllBranch:", err);
        return [];
    }
}

function normalizeBranchCode(code) {
    const value = String(code ?? '').trim();
    if (!value || !/^\d+$/.test(value)) return value;

    return value.replace(/^0+/, '') || '0';
}

function parseBranchCodes(value) {
    return String(value || '')
        .split(',')
        .map(normalizeBranchCode)
        .filter(Boolean);
}

function getBranchCode(b) {
    if (!b) return '';
    return String(b.offcde || b.Offcde || '').trim();
}

function getBranchName(b) {
    if (!b) return '';
    return b.branch_name || b.branchName || b.BranchName || b.Bname || b.bname || getBranchCode(b);
}

function renderBranchDropdownOptions(allowedOffcdes) {
    const container = document.getElementById('branchOptions');

    if (!container) return;

    container.innerHTML = '';

    let branches = allBranch || [];

    // if (Array.isArray(allowedOffcdes)) {
    //     const allowedBranchCodes = new Set(
    //         allowedOffcdes.map(normalizeBranchCode).filter(Boolean)
    //     );

    //     branches = branches.filter(b =>
    //         allowedBranchCodes.has(normalizeBranchCode(getBranchCode(b)))
    //     );
    // }

    const result = allBranch
        .filter(branch => allowedOffcdes.includes(branch.offcde))
        .map(branch => {
            return branch;
    });
        
    result.forEach(b => {
        const code = getBranchCode(b);
        const name = getBranchName(b);

        if (!code) return;

        const div = document.createElement('div');
        div.className = 'branch-option';

        div.innerHTML = `
            <label>
                <input type="checkbox"
                       class="branch-checkbox"
                       value="${code}"
                       data-name="${name}">
                <span>${name}</span>
            </label>
        `;

        container.appendChild(div);
    });

    bindBranchCheckboxEvents();
}

function bindBranchCheckboxEvents() {

    document.querySelectorAll('.branch-checkbox').forEach(checkbox => {

        checkbox.addEventListener('change', function () {

            updateBranchSelectedDisplay();

            const selectedBranches = getSelectedBranchCodes();

            loadAndRenderStaffList(selectedBranches);

            // เปลี่ยนสาขา -> แสดง Prospect ตามสาขาที่เลือกใหม่
            onBranchSelectionChanged();
        });
    });
}

function getSelectedBranchCodes() {

    return Array.from(
        document.querySelectorAll('.branch-checkbox:checked')
    ).map(x => x.value);
}

function updateBranchSelectedDisplay() {

    const box = document.getElementById('branchSelectBox');

    if (!box) return;

    const selected = Array.from(
        document.querySelectorAll('.branch-checkbox:checked')
    );

    box.innerHTML = '';

    if (selected.length === 0) {

        box.innerHTML = `
            <span class="multi-select-placeholder">
                -- เลือกสาขา --
            </span>
            <span class="multi-select-arrow">▼</span>
        `;

        return;
    }

    selected.forEach(checkbox => {

        const tag = document.createElement('span');
        tag.className = 'branch-tag';

        tag.innerHTML = `
            ${checkbox.dataset.name}
            <span class="remove-branch"
                  data-value="${checkbox.value}">
                ×
            </span>
        `;

        tag.querySelector('.remove-branch')
            .addEventListener('click', function (e) {
                e.stopPropagation();
                checkbox.checked = false;
                updateBranchSelectedDisplay();
                const selectedBranches = getSelectedBranchCodes();
                loadAndRenderStaffList(selectedBranches);

                // เอาสาขาออก -> อัปเดตรายการ Prospect ตามสาขาที่เหลือ
                onBranchSelectionChanged();
            });

        box.appendChild(tag);
    });

    const arrow = document.createElement('span');

    arrow.className = 'multi-select-arrow';
    arrow.innerHTML = '▼';

    box.appendChild(arrow);
}

function initBranchMultiSelect() {

    const box = document.getElementById('branchSelectBox');
    const dropdown = document.getElementById('branchDropdownMenu');

    if (!box || !dropdown) return;

    box.addEventListener('click', function () {

        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', function (e) {

        const container = document.getElementById(
            'branchSelectContainer'
        );

        if (!container.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    const searchInput = document.getElementById('branchSearchInput');

    if (searchInput) {

        searchInput.addEventListener('input', function () {

            const keyword = this.value.toLowerCase().trim();

            document.querySelectorAll('.branch-option')
                .forEach(option => {

                    const text = option.innerText.toLowerCase();

                    option.style.display =
                        text.includes(keyword)
                            ? ''
                            : 'none';
                });
        });
    }
}

function setSelectedBranches(offcdeString) {

    const campaignBranchCodes = parseBranchCodes(offcdeString);
    renderBranchDropdownOptions(campaignBranchCodes);

    updateBranchSelectedDisplay();
    loadAndRenderStaffList([]);
}

async function getStaffList(branchId){
    try {
        const response = await fetch(`/ProspectAssign/GetStaffList?branchId=${branchId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data || [];
    } catch(err) {
        console.error("Error in getStaffList:", err);
        return [];
    }
}

async function loadAndRenderStaffList(branchIds) {

    const dropdownMenu = document.getElementById('responsibleDropdownMenu');
    const newDropdownMenu = document.getElementById('newResponsibleDropdownMenu');

    // รองรับทั้ง string และ array
    if (!Array.isArray(branchIds)) {
        branchIds = branchIds ? [branchIds] : [];
    }

    // Clear existing tags
    const selectBox = document.getElementById('responsibleSelectBox');
    if (selectBox) {
        selectBox.querySelectorAll('.branch-tag').forEach(tag => tag.remove());
    }

    const newSelectBox = document.getElementById('newResponsibleSelectBox');
    if (newSelectBox) {
        newSelectBox.querySelectorAll('.branch-tag').forEach(tag => tag.remove());
    }

    if (typeof updateAssignButtonDisabledState === 'function') {
        updateAssignButtonDisabledState();
    }

    if (branchIds.length === 0) {
        const defaultHtml =
            '<div class="p-2 text-center text-muted" style="font-size: 0.85rem;">กรุณาเลือกสาขา</div>';

        if (dropdownMenu) dropdownMenu.innerHTML = defaultHtml;
        if (newDropdownMenu) newDropdownMenu.innerHTML = defaultHtml;

        return;
    }

    const loadingHtml =
        '<div class="p-2 text-center text-muted" style="font-size: 0.85rem;">' +
        '<i class="bi bi-hourglass-split me-1"></i> กำลังโหลดข้อมูล...</div>';

    if (dropdownMenu) dropdownMenu.innerHTML = loadingHtml;
    if (newDropdownMenu) newDropdownMenu.innerHTML = loadingHtml;

    // โหลด staff ของทุกสาขา
    const results = await Promise.all(
        branchIds.map(branchId => getStaffList(branchId))
    );

    // รวม staff ทุกสาขา
    let staffArray = [];

    results.forEach(res => {
        if (Array.isArray(res)) {
            staffArray.push(...res);
        } else if (res && Array.isArray(res.data)) {
            staffArray.push(...res.data);
        } else if (res && Array.isArray(res.result)) {
            staffArray.push(...res.result);
        }
    });

    // ลบข้อมูลซ้ำ
    const uniqueStaff = [];
    const seen = new Set();

    staffArray.forEach(s => {
        const key = typeof s === 'object'
            ? (s.personnel_code || s.id || JSON.stringify(s))
            : String(s);

        if (!seen.has(key)) {
            seen.add(key);
            uniqueStaff.push(s);
        }
    });

    staffArray = uniqueStaff;

    // กรอง role RCRM011
    // staffArray = staffArray.filter(s => {
    //     if (!s) return false;

    //     if (typeof s === 'object') {
    //         return (s.role_id || '') === 'RCRM011';
    //     }

    //     return true;
    // });

    if (staffArray.length === 0) {
        const noDataHtml =
            '<div class="p-2 text-center text-muted" style="font-size: 0.85rem;">ไม่พบข้อมูลพนักงาน</div>';

        if (dropdownMenu) dropdownMenu.innerHTML = noDataHtml;
        if (newDropdownMenu) newDropdownMenu.innerHTML = noDataHtml;

        return;
    }

    let html = '';
    let newHtml = '';

    staffArray.forEach(s => {

        let val = '';
        let name = '';

        if (typeof s === 'string') {
            val = s;
            name = s;

        } else if (s && typeof s === 'object') {

            val = s.personnel_code || '';
            name = s.thname || '';

            if (!val || !name) {
                const keys = Object.keys(s);

                if (!val) {
                    const codeKey = keys.find(k =>
                        /code|id|personnel|staff|emp|user/i.test(k)
                    );

                    if (codeKey && s[codeKey] != null) {
                        val = String(s[codeKey]);
                    }
                }

                if (!name) {
                    const nameKey = keys.find(k =>
                        /name|full|first|display/i.test(k)
                    );

                    if (nameKey && s[nameKey] != null) {
                        name = String(s[nameKey]);
                    }
                }
            }

            if (!val) val = name;
            if (!name) name = val;
        }

        if (!val && !name) return;

        const displayText =
            (val && name && val !== name && !name.includes(val))
                ? `${val} - ${name}`
                : (name || val);

        html += `
            <div class="dropdown-item d-flex align-items-center gap-2 py-2 responsible-option rounded"
                 style="cursor: pointer;"
                 data-value="${escapeHtml(val)}">

                <input type="checkbox"
                       class="form-check-input mt-0 border-primary"
                       style="pointer-events: none;">

                <span>${escapeHtml(displayText)}</span>
            </div>
        `;

        newHtml += `
            <div class="dropdown-item d-flex align-items-center gap-2 py-2 new-responsible-option rounded"
                 style="cursor: pointer;"
                 data-value="${escapeHtml(val)}">

                <input type="checkbox"
                       class="form-check-input mt-0 border-primary"
                       style="pointer-events: none;">

                <span>${escapeHtml(displayText)}</span>
            </div>
        `;
    });

    if (dropdownMenu) dropdownMenu.innerHTML = html;
    if (newDropdownMenu) newDropdownMenu.innerHTML = newHtml;
}

function selectAllResponsibleStaff() {
    const dropdownMenu = document.getElementById('responsibleDropdownMenu');
    const selectBox = document.getElementById('responsibleSelectBox');
    if (!dropdownMenu || !selectBox) return { addedCount: 0, totalOptions: 0 };

    const options = dropdownMenu.querySelectorAll('.responsible-option');
    let addedCount = 0;
    let totalOptions = options.length;

    options.forEach(opt => {
        const checkbox = opt.querySelector('input[type="checkbox"]');
        const val = opt.getAttribute('data-value');
        const textSpan = opt.querySelector('span');
        const text = textSpan ? textSpan.textContent : val;

        if (val) {
            if (checkbox) checkbox.checked = true;
            if (!selectBox.querySelector(`.branch-tag[data-value="${val}"]`)) {
                const tag = document.createElement('span');
                tag.className = 'branch-tag';
                tag.setAttribute('data-value', val);
                tag.innerHTML = `${escapeHtml(text)} <i class="bi bi-x" style="cursor: pointer;"></i>`;

                tag.querySelector('.bi-x').addEventListener('click', function(e) {
                    e.stopPropagation();
                    tag.remove();
                    if (checkbox) checkbox.checked = false;
                    updateAssignButtonDisabledState();
                });

                selectBox.insertBefore(tag, selectBox.querySelector('.d-flex'));
                addedCount++;
            }
        }
    });

    updateAssignButtonDisabledState();
    return { addedCount, totalOptions };
}

async function UpdateProspectCustomer(overrideParams = {}){
    try{
        const assignBtn = document.getElementById('assignBtn');
        const btnText = assignBtn ? assignBtn.textContent.trim() : '';

        let assign_case = overrideParams.assign_case;
        if (!assign_case) {
            if (btnText === 'ReAssign'){
                assign_case = 'single';
            } else if (btnText === 'Assign To Group'){
                assign_case = 'group';
            } else {
                assign_case = 'single';
            }
        }

        const assignStatus = overrideParams.assign_status || 'assigned';
        const isReassign = assignStatus === 'reassign' || btnText === 'ReAssign';

        let ids;
        if (overrideParams.id) {
            ids = overrideParams.id;
        } else if (isReassign) {
            // ReAssign ต้องกรองตามสถานะจากแถวที่แสดงอยู่ และใช้ id จริง (data-assign-id) ในการส่ง
            const selectedCheckboxes = Array.from(document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox:checked')).filter(cb => {
                const st = (cb.getAttribute('data-status') || '').toLowerCase().trim();
                const row = cb.closest('tr');
                const statusText = row ? (row.querySelector('.status-text')?.textContent || '').toLowerCase().trim() : '';
                return st === 'assigned' || st === 'reassign' || (statusText.includes('assign') && !statusText.includes('wait'));
            });
            ids = selectedCheckboxes
                .map(cb => cb.getAttribute('data-assign-id') || cb.getAttribute('data-id'))
                .filter(Boolean);
        } else {
            // แปลง selection key (row key) กลับเป็น id จริงเพื่อส่งไป assign รองรับการเลือกข้ามหน้า
            ids = resolveSelectedAssignIds();
        }

        if (!ids || ids.length === 0) {
            if (typeof showAlert === 'function') {
                showAlert('warning', 'แจ้งเตือน', isReassign ? 'ไม่พบรายการ Prospect ที่มีสถานะ Assign สำหรับการ ReAssign' : 'กรุณาเลือกรายการ Prospect ที่ต้องการ Assign');
            } else {
                alert(isReassign ? 'ไม่พบรายการ Prospect ที่มีสถานะ Assign สำหรับการ ReAssign' : 'กรุณาเลือกรายการ Prospect ที่ต้องการ Assign');
            }
            return null;
        }

        let assigneeList = [];
        if (overrideParams.assign_to) {
            assigneeList = String(overrideParams.assign_to).split(',').map(s => s.trim()).filter(Boolean);
        } else {
            const assigneeTags = document.querySelectorAll('#responsibleSelectBox .branch-tag');
            assigneeList = Array.from(assigneeTags).map(tag => tag.getAttribute('data-value')).filter(Boolean);
        }

        if (!assigneeList || assigneeList.length === 0) {
            if (typeof showAlert === 'function') {
                showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกผู้รับผิดชอบ');
            } else {
                alert('กรุณาเลือกผู้รับผิดชอบ');
            }
            return null;
        }

        if (assign_case !== 'Auto Bot' && assigneeList.length > 1) {
            if (typeof showAlert === 'function') {
                showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกผู้รับผิดชอบเพียงคนเดียว หากไม่ใช่การ Auto Assign');
            } else {
                alert('กรุณาเลือกผู้รับผิดชอบเพียงคนเดียว หากไม่ใช่การ Auto Assign');
            }
            return null;
        }

        const filterStartDateEl = document.getElementById('filterStartDate');
        const filterEndDateEl = document.getElementById('filterEndDate');
        const assignDate = filterStartDateEl ? filterStartDateEl.value : '';
        const assignExpire = filterEndDateEl ? filterEndDateEl.value : '';
        const assignRemark = overrideParams.assign_remark || 'Assigned manually';

        // Group prospect IDs per staff member (Round-Robin distribution)
        const staffAssignments = {};
        assigneeList.forEach(staffId => { staffAssignments[staffId] = []; });
        ids.forEach((prospectId, index) => {
            const staffId = assigneeList[index % assigneeList.length];
            staffAssignments[staffId].push(prospectId);
        });

        let successCount = 0;
        let lastResult = null;

        for (const staffId of assigneeList) {
            const assignedIds = staffAssignments[staffId];
            if (!assignedIds || assignedIds.length === 0) continue;

            const request = {
                id: assignedIds,
                assign_to: staffId,
                assign_date: assignDate,
                assign_expire: assignExpire,
                assign_remark: assignRemark,
                assign_status: assignStatus,
                assign_case: assign_case,
            };

            const response = await fetch(`/ProspectAssign/updateProspectCustomer`, 
                { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(request), 
                });

            if (response.ok) {
                const data = await response.json();
                if (data && (data.status === true || data.status === "success" || data.status !== false)) {
                    successCount++;
                    lastResult = data;
                    await sendPostNotiForAssign(request, overrideParams.assign_status === 'reassign' ? 'ReAssign' : btnText);
                }
            } else {
                console.error("UpdateProspectCustomer HTTP error:", response.status, response.statusText);
            }
        }

        return successCount > 0 ? (lastResult || { status: true }) : null;
    }catch(err){
        console.error("Error in UpdateProspectCustomer:", err);
        return null;
    }
}

async function getCampaignDataForETL(productCode) {
    try {
        const response = await fetch(`/ProspectSetup/getCampaignDataForETL?productCode=${encodeURIComponent(productCode)}`);
        if (!response.ok) {
            console.error("getCampaignDataForETL HTTP error:", response.status, response.statusText);
            return null;
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in getCampaignDataForETL:", error);
        return null;
    }
}

// Fetch prospect batch for selected campaign from API
async function getProductBatchByProductCode(productCode){
    try{
        const response = await fetch(`/ProspectSetup/getProductBatchByProductCode?productCode=${encodeURIComponent(productCode)}`);
        if (!response.ok) {
            console.error("getProductBatchByProductCode HTTP error:", response.status, response.statusText);
            return [];
        }
        const data = await response.json();
        return data || [];
    }catch(err){
        console.error("Error in getProductBatchByProductCode:", err);
        return [];
    }
}

// Extract prospect items from API result
function extractProspectCustomers(data) {
    if (!data) return { items: [], totalCount: 0 };
    let raw = data;
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { return { items: [], totalCount: 0 }; }
    }

    let items = [];
    let totalCount = 0;
    if (raw && typeof raw === 'object') {
        if (Array.isArray(raw)) totalCount = raw.length;
        else if (Array.isArray(raw.data)) totalCount = raw.data.length;
        else if (Array.isArray(raw.items)) totalCount = raw.items.length;
    }

    const checkAndPush = (item) => {
        if (!item) return;
        if (Array.isArray(item.Customer?.data)) {
            item.Customer.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.customer?.data)) {
            item.customer.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.ObjectCustomer?.data)) {
            item.ObjectCustomer.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.objectCustomer?.data)) {
            item.objectCustomer.data.forEach(c => checkAndPush(c));
            return;
        }
        if (item.Customer && typeof item.Customer === 'object' && !Array.isArray(item.Customer)) {
            checkAndPush(item.Customer);
            return;
        }
        if (item.customer && typeof item.customer === 'object' && !Array.isArray(item.customer)) {
            checkAndPush(item.customer);
            return;
        }
        if (item.ObjectCustomer && typeof item.ObjectCustomer === 'object' && !Array.isArray(item.ObjectCustomer)) {
            checkAndPush(item.ObjectCustomer);
            return;
        }
        if (item.objectCustomer && typeof item.objectCustomer === 'object' && !Array.isArray(item.objectCustomer)) {
            checkAndPush(item.objectCustomer);
            return;
        }
        if (Array.isArray(item.Customer)) {
            item.Customer.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.customer)) {
            item.customer.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.customers)) {
            item.customers.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.prospects)) {
            item.prospects.forEach(c => checkAndPush(c));
            return;
        }

        if (typeof item === 'object') {
            const idno = item.idno || '';
            const id = item.id || item.Id || '';
            const prospectID = item.prospectID || item.prospectId || item.ProspectID || item.ProspectId || item.prospect_id || '';
            const name = item.nameCus || item.customer_name || '-';
            const contract = item.contno || '-';
            const branch = item.branch_Name || item.ชื่อสาขาเดิม || '-';
            const branchCode = item.offcde || item.Offcde || item.branch_code || item.branchCode || item.contractoffcde || item.ContractOffCde || item.branch || item.Branch || '';
            const carLocation = item.provinceUsecar || item.provinceUseCar || item.carLocation || item.car_location || '-';
            const createdDate = item.created || item.ImportDate || '-';
            const createdBy = item.created_by || '-';
            const custType = item.custype || '-';
            const occupation = item.occupation || '-';
            const assignee = item.staffName || '-';
            const status = item.assign_status || '-';
            const isActive = item.isActive || false;

            if (id || prospectID || idno || (name && name !== '-')) {
                items.push({
                    id: String(id || '').trim(),
                    prospectID: String(prospectID || '').trim(),
                    idno: String(idno || '').trim(),
                    branch: String(branch).trim(),
                    branchCode: String(branchCode).trim(),
                    name: String(name).trim(),
                    contract: String(contract).trim(),
                    custType: String(custType).trim(),
                    occupation: String(occupation).trim(),
                    carLocation: String(carLocation).trim(),
                    assignee: String(assignee).trim(),
                    status: String(status).trim(),
                    createdDate: String(createdDate).trim(),
                    createdBy: String(createdBy).trim(),
                    raw: item,
                    isActive: isActive,
                });
            }
        }
    };

    if (Array.isArray(raw)) {
        raw.forEach(i => checkAndPush(i));
    } else if (typeof raw === 'object') {
        if (Array.isArray(raw.data)) {
            raw.data.forEach(i => checkAndPush(i));
        } else if (raw.data && typeof raw.data === 'object') {
            checkAndPush(raw.data);
        } else if (Array.isArray(raw.result)) {
            raw.result.forEach(i => checkAndPush(i));
        } else {
            checkAndPush(raw);
        }
    }

    if (totalCount === 0) totalCount = items.length;

    return { items, totalCount };
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

function getStatusDotClass(status, assignee) {
    if (status == 'assigned'){
        return 'green';
    } else if (status == 'reassign'){
        return 'orange';
    } else{
        return 'purple';
    }
}

function getStatusLabel(status, assignee) {
    const cls = getStatusDotClass(status, assignee);
    if (cls === 'green') return 'Assign';
    if (cls === 'orange') return 'ReAssign';
    return 'Wait';
}

async function getCampainList(page, pageSize) {
    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    try {
        const status = "approved";
        let queryStr = (page !== undefined && pageSize !== undefined) 
            ? `?page=${page}&pageSize=${pageSize}&status=${status}`
            : '';
        queryStr += `&isFiltercompany=${encodeURIComponent(true)}`;
        const response = await fetch(`/Campain/GetCampainList${queryStr}`);
        if (!response.ok) throw new Error("Failed to fetch campaigns list");
        const jsonResult = await response.json();
        const items = jsonResult && Array.isArray(jsonResult.data) ? jsonResult.data : (Array.isArray(jsonResult) ? jsonResult : []);
        const mapped = items.map(item => ({
            code:      item.product_code   || '',
            name:      item.product_name   || '',
            status:    item.product_status || 'ปกติ',
            startDate: item.product_start  ? item.product_start.substring(0, 10) : '',
            endDate:   item.product_end    ? item.product_end.substring(0, 10)   : '',
            remark:    item.product_remark || '',
            createdBy: item.createrd_by    || item.created_by || '',
            created:   item.created        ? item.created.substring(0, 10)       : '',
            offcde:    item.offcde         || '',
            file_id:   item.file_id        || item.FileId || item.fileId || "",
            IsImport:  item.IsImport || false,
            isActive:  item.isActive || false
        }));
        return {
            page: jsonResult.page ?? (page ? parseInt(page) : 1),
            pageSize: jsonResult.pageSize ?? (pageSize ? parseInt(pageSize) : mapped.length),
            count: jsonResult.count ?? mapped.length,
            data: mapped
        };
    } catch (error) {
        console.error("Error in getCampainList:", error);
        return { page: page, pageSize: pageSize, count: 0, data: [] };
    } finally {
        stopLoading();
    }
}

async function loadProspectAssignData(productCode) {
    // เริ่มโหลด campaign ใหม่ ล้างรายการที่เลือกไว้เดิม
    selectedProspectIds.clear();
    if (!productCode) {
        rawProspectItems = [];
        prospectTotalCount = 0;
        prospectPage = 1;
        filterAndRenderProspectTable();
        return;
    }

    selectedCampaignCode = productCode;
    prospectPage = 1;

    const tbody = document.getElementById('prospectAssignTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-hourglass-split me-1"></i> กำลังโหลดข้อมูล Prospect...</td></tr>`;
    }

    const currentCampaign = campaigns.find(c => c.code === productCode);
    const isImport = currentCampaign ? (currentCampaign.IsImport === true || currentCampaign.IsImport === 'true' || currentCampaign.IsImport === 1 || currentCampaign.IsImport === '1') : false;

    let res = null;
    if (isImport) {
        const etlRes = await getCampaignDataForETL(productCode);
        res = etlRes ? (etlRes.IsBatch) : null;
    } else {
        res = await getProductBatchByProductCode(productCode);
    }

    const { items, totalCount } = extractProspectCustomers(res);

    // กำหนด key เฉพาะให้ทุกแถว เพื่อใช้ติดตามการเลือก (กันปัญหา id ว่าง/ซ้ำ ทำให้เลือกได้ไม่ครบ)
    items.forEach((item, idx) => {
        item.__rowKey = 'row_' + idx;
    });

    rawProspectItems = items;
    prospectTotalCount = totalCount;
    updateSummaryCardCounts(items, totalCount);
    filterAndRenderProspectTable(currentCampaign);
}

function updateSummaryCardCounts(items, totalCount) {
    let allCount = totalCount || items.length;
    let assignCount = 0;
    let reassignCount = 0;
    let waitCount = 0;

    items.forEach(item => {
        const label = getStatusLabel(item.status, item.assignee);
        if (label === 'Assign') assignCount++;
        else if (label === 'ReAssign') reassignCount++;
        else waitCount++;
    });

    const cardAll = document.querySelector('.summary-card[data-status="all"] .summary-value');
    if (cardAll) cardAll.textContent = allCount.toLocaleString();

    const cardAssign = document.querySelector('.summary-card[data-status="assign"] .summary-value');
    if (cardAssign) cardAssign.textContent = assignCount.toLocaleString();

    const cardReassign = document.querySelector('.summary-card[data-status="reassign"] .summary-value');
    if (cardReassign) cardReassign.textContent = reassignCount.toLocaleString();

    const cardWait = document.querySelector('.summary-card[data-status="wait"] .summary-value');
    if (cardWait) cardWait.textContent = waitCount.toLocaleString();
}

// คืนค่า set ของ code และชื่อสาขาที่ถูกเลือก (normalize เป็นตัวพิมพ์เล็ก) เพื่อใช้กรอง prospect
function getSelectedBranchFilterSet() {
    const selectedCodes = getSelectedBranchCodes(); // อาร์เรย์ของ offcde ที่เลือก
    const codeSet = new Set();
    const nameSet = new Set();

    selectedCodes.forEach(code => {
        const c = String(code || '').trim();
        if (c) codeSet.add(c.toLowerCase());

        // หา branch object ใน allBranch เพื่อดึงชื่อสาขามาเทียบด้วย
        const branchObj = (allBranch || []).find(b => getBranchCode(b) === c);
        if (branchObj) {
            const name = String(getBranchName(branchObj) || '').trim();
            if (name) nameSet.add(name.toLowerCase());
        }
    });

    return { codeSet, nameSet, count: selectedCodes.length };
}

function prospectMatchesSelectedBranch(item, filterSet) {
    const code = String(item.branchCode || '').trim().toLowerCase();
    const name = String(item.branch || '').trim().toLowerCase();
    if (code && filterSet.codeSet.has(code)) return true;
    if (name && filterSet.nameSet.has(name)) return true;
    return false;
}

// เรียกเมื่อการเลือกสาขาเปลี่ยน: ล้างการเลือก prospect ที่ไม่อยู่ในสาขาที่เลือกแล้ว และ render ใหม่
function onBranchSelectionChanged() {
    const branchFilter = getSelectedBranchFilterSet();

    if (branchFilter.count === 0) {
        // ไม่เลือกสาขา -> ไม่แสดง prospect และล้างการเลือกทั้งหมด
        selectedProspectIds.clear();
    } else {
        // เก็บเฉพาะ selection ที่ยังอยู่ในสาขาที่เลือก
        const allowedKeys = new Set();
        rawProspectItems.forEach(item => {
            if (prospectMatchesSelectedBranch(item, branchFilter)) {
                const key = String(item.__rowKey || item.id || item.prospectID || '').trim();
                if (key) allowedKeys.add(key);
            }
        });
        Array.from(selectedProspectIds).forEach(k => {
            if (!allowedKeys.has(k)) selectedProspectIds.delete(k);
        });
    }

    prospectPage = 1;
    filterAndRenderProspectTable();
}

function filterAndRenderProspectTable(currentCampaign) {
    const tbody = document.getElementById('prospectAssignTableBody');
    if (!tbody) return;

    // ต้องเลือกสาขาก่อน ถึงจะแสดง Prospect ตามสาขาที่เลือก
    const branchFilter = getSelectedBranchFilterSet();
    if (branchFilter.count === 0) {
        currentFilteredProspectItems = [];
        const selectAllCb = document.getElementById('selectAllProspects');
        if (selectAllCb) {
            selectAllCb.checked = false;
            selectAllCb.disabled = true;
        }
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-funnel me-1"></i> กรุณาเลือกสาขาก่อน เพื่อแสดงรายการ Prospect</td></tr>`;

        const badge = document.getElementById('prospectAssignTotalBadge');
        if (badge) badge.textContent = 'ทั้งหมด 0 รายการ';
        const totalRowsInfo = document.getElementById('totalRowsInfo');
        if (totalRowsInfo) totalRowsInfo.textContent = 0;

        updateSelectedCount();
        renderProspectPagination(0);
        return;
    }

    // กรองตามสาขาที่เลือกก่อน
    let filteredItems = rawProspectItems.filter(item => prospectMatchesSelectedBranch(item, branchFilter));
    if (activeStatusFilter !== 'all') {
        filteredItems = filteredItems.filter(item => {
            const statusLabel = getStatusLabel(item.status, item.assignee).toLowerCase();
            if (activeStatusFilter === 'assign') {
                return statusLabel === 'assign';
            } else if (activeStatusFilter === 'reassign') {
                return statusLabel === 'reassign';
            } else if (activeStatusFilter === 'wait') {
                return statusLabel === 'wait';
            }
            return true;
        });
    }

    const displayTotal = filteredItems.length;

    const campaign = currentCampaign || (typeof campaigns !== 'undefined' && Array.isArray(campaigns) ? campaigns.find(c => c.code === selectedCampaignCode) : null);
    const isActive = campaign ? Boolean(campaign.isActive) : (currentCampaign ? Boolean(currentCampaign.isActive) : false);
    const isImport = campaign ? (campaign.IsImport === true || campaign.IsImport === 'true' || campaign.IsImport === 1 || campaign.IsImport === '1') : false;

    // id จริงที่ใช้ส่งไป assign (import ใช้ prospectID, ปกติใช้ id)
    const getAssignId = (item) => isImport
        ? String(item.prospectID || item.id || '').trim()
        : String(item.id || '').trim();

    // key เฉพาะสำหรับติดตามการเลือกในหน้าจอ (ทุกแถวไม่ซ้ำ) fallback เป็น id จริงถ้าไม่มี __rowKey
    const getSelectKey = (item) => String(item.__rowKey || getAssignId(item) || '').trim();

    // เก็บรายการที่ผ่านการกรองปัจจุบันไว้ทั้งหมด (ทุกหน้า) พร้อม selectKey และ assignId
    currentFilteredProspectItems = filteredItems.map(item => ({
        item,
        selectKey: getSelectKey(item),
        assignId: getAssignId(item)
    }));

    const selectAllCheckbox = document.getElementById('selectAllProspects');
    if (selectAllCheckbox) {
        selectAllCheckbox.disabled = !isActive || filteredItems.length === 0;
        if (!isActive || filteredItems.length === 0) {
            selectAllCheckbox.checked = false;
        }
    }

    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-emoji-neutral me-1"></i> ไม่พบข้อมูล</td></tr>`;
    } else {
        // แสดงรายการทั้งหมด ไม่แบ่งหน้า
        const pageItems = filteredItems;

        let html = '';
        pageItems.forEach(item => {
            const dotClass = getStatusDotClass(item.status, item.assignee);
            const statusText = getStatusLabel(item.status, item.assignee);
            // selectKey = key เฉพาะสำหรับติดตามการเลือก (ทุกแถวไม่ซ้ำ)
            // assignId  = id จริงที่ใช้ส่งไป assign (import ใช้ prospectID, ปกติใช้ id)
            const selectKey = getSelectKey(item);
            const assignId = getAssignId(item);

            html += `
                <tr>
                    <td class="text-center">
                        <input 
                            type="checkbox" 
                            class="form-check-input prospect-checkbox" 
                            data-id="${escapeHtml(selectKey)}" 
                            data-assign-id="${escapeHtml(assignId)}" 
                            data-contract="${escapeHtml(item.contract)}" 
                            data-status="${escapeHtml(item.status)}"
                            ${selectedProspectIds.has(selectKey) ? 'checked' : ''}
                            ${isActive ? '' : 'disabled'}
                        >
                    </td>

                    <td class="text-center">
                        <div class="fw-medium">${escapeHtml(item.branch)}</div>
                    </td>
                    <td>
                        <div class="fw-medium">${escapeHtml(item.name)}</div>
                        <div class="text-gray" style="font-size: 0.75rem;">${escapeHtml(item.idno)}</div>
                    </td>
                    <td class="text-center">${escapeHtml(item.contract)}</td>
                    <td class="text-center">${escapeHtml(item.custType)}</td>
                    <td class="text-center">${escapeHtml(item.occupation)}</td>
                    <td class="text-center">${escapeHtml(item.carLocation)}</td>
                    <td class="text-center">${escapeHtml(item.assignee)}</td>
                    <td class="text-center"><span class="status-dot ${dotClass}"></span><span class="status-text ${dotClass}">${statusText}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // Attach event listeners for checkboxes in tbody
    const checkboxes = tbody.querySelectorAll('.prospect-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function () {
            const id = String(this.getAttribute('data-id') || '').trim();
            if (id) {
                if (this.checked) {
                    selectedProspectIds.add(id);
                } else {
                    selectedProspectIds.delete(id);
                }
            }
            updateSelectedCount();
        });
    });

    updateSelectedCount();

    const badge = document.getElementById('prospectAssignTotalBadge');
    if (badge) badge.textContent = `ทั้งหมด ${displayTotal} รายการ`;

    const totalRowsInfo = document.getElementById('totalRowsInfo');
    if (totalRowsInfo) totalRowsInfo.textContent = displayTotal;

    renderProspectPagination(displayTotal);
}

function updateAssignButtonDisabledState() {
    const assignBtn = document.getElementById('assignBtn');
    const autoAssignBtn = document.getElementById('autoAssignBtn');

    const assigneeTags = document.querySelectorAll('#responsibleSelectBox .branch-tag');
    const checkedProspects = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox:checked');
    const hasCheckedProspects = checkedProspects.length > 0;

    // Assign button requires selected prospects and at most 1 assignee (use Auto Assign for multiple)
    if (assignBtn) {
        if (!hasCheckedProspects || assigneeTags.length > 1) {
            assignBtn.disabled = true;
        } else {
            assignBtn.disabled = false;
        }
    }

    if (autoAssignBtn) {
        if (!hasCheckedProspects) {
            autoAssignBtn.disabled = true;
        } else {
            autoAssignBtn.disabled = false;
        }
    }

}

function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox');
    const checkedBoxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox:checked');
    const countDisplay = document.getElementById('selectedProspectCount');
    const selectAllCheckbox = document.getElementById('selectAllProspects');
    const assignBtn = document.getElementById('assignBtn');

    // Count is based on the persisted selection set so it survives pagination/re-render
    const checkedCount = selectedProspectIds.size;
    if (countDisplay) {
        countDisplay.textContent = `Selected: ${checkedCount} รายการ`;
    }

    if (selectAllCheckbox) {
        // เทียบกับรายการที่ผ่านการกรองทั้งหมด (ทุกหน้า) ว่าถูกเลือกครบหรือไม่
        const selectableKeys = (currentFilteredProspectItems || [])
            .map(x => x.selectKey)
            .filter(Boolean);
        const allSelected = selectableKeys.length > 0 &&
            selectableKeys.every(k => selectedProspectIds.has(k));
        selectAllCheckbox.checked = allSelected;
    }

    let hasAssigned = false;
    checkedBoxes.forEach(cb => {
        const row = cb.closest('tr');
        if (row) {
            const statusText = row.querySelector('.status-text');
            if (statusText && statusText.textContent.trim().toLowerCase().includes('assign') && !statusText.textContent.trim().toLowerCase().includes('wait')) {
                hasAssigned = true;
            }
        }
    });

    if (assignBtn) {
        if (hasAssigned) {
            assignBtn.textContent = 'ReAssign';
        } else if (checkedCount > 1) {
            assignBtn.textContent = 'Assign To Group';
        } else {
            assignBtn.textContent = 'Assign';
        }
    }

    updateAssignButtonDisabledState();
}

function renderProspectPagination(total) {
    const paginationEl = document.getElementById('prospectPagination');
    if (!paginationEl) return;

    // แสดงรายการทั้งหมด ไม่ต้องแบ่งหน้า จึงล้าง pagination ทิ้ง
    paginationEl.innerHTML = '';
    return;
    // eslint-disable-next-line no-unreachable
    const totalPages = Math.ceil(total / prospectPageSize) || 1;
    if (totalPages <= 0) return;

    // Prev button
    const prevLi = document.createElement('li');
    prevLi.className = 'page-item' + (prospectPage <= 1 ? ' disabled' : '');
    prevLi.innerHTML = '<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>';
    prevLi.addEventListener('click', function (e) {
        e.preventDefault();
        if (prospectPage > 1) {
            prospectPage--;
            filterAndRenderProspectTable();
        }
    });
    paginationEl.appendChild(prevLi);

    // Page numbers
    const pages = buildPageRange(prospectPage, totalPages);
    pages.forEach(function (p) {
        const li = document.createElement('li');
        if (p === '...') {
            li.className = 'page-item disabled';
            li.innerHTML = '<span class="page-link bg-transparent text-gray">...</span>';
        } else {
            li.className = 'page-item' + (p === prospectPage ? ' active' : '');
            li.innerHTML = '<a class="page-link" href="#">' + p + '</a>';
            li.addEventListener('click', function (e) {
                e.preventDefault();
                if (p !== prospectPage) {
                    prospectPage = p;
                    filterAndRenderProspectTable();
                }
            });
        }
        paginationEl.appendChild(li);
    });

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = 'page-item' + (prospectPage >= totalPages ? ' disabled' : '');
    nextLi.innerHTML = '<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>';
    nextLi.addEventListener('click', function (e) {
        e.preventDefault();
        if (prospectPage < totalPages) {
            prospectPage++;
            filterAndRenderProspectTable();
        }
    });
    paginationEl.appendChild(nextLi);
}

function buildPageRange(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, function (_, i) { return i + 1; });
    }
    var pages = [];
    if (current <= 4) {
        pages = [1, 2, 3, 4, 5, '...', total];
    } else if (current >= total - 3) {
        pages = [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    } else {
        pages = [1, '...', current - 1, current, current + 1, '...', total];
    }
    return pages;
}

// Summary card filtering setup
(function () {
    const summaryCards = document.querySelectorAll('.summary-card');
    summaryCards.forEach(function (card) {
        card.addEventListener('click', function () {
            summaryCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');

            activeStatusFilter = this.getAttribute('data-status') || 'all';
            prospectPage = 1;
            filterAndRenderProspectTable();
        });
    });

    const rowsPerPageSelect = document.getElementById('rowsPerPageSelect');
    if (rowsPerPageSelect) {
        rowsPerPageSelect.addEventListener('change', function () {
            prospectPageSize = parseInt(this.value, 10) || 10;
            prospectPage = 1;
            filterAndRenderProspectTable();
        });
    }

    const selectAllCheckbox = document.getElementById('selectAllProspects');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function () {
            if (this.disabled) return;
            const isChecked = this.checked;

            // เลือก/ยกเลิก "ทั้งหมด" จากรายการที่ผ่านการกรอง (ทุกหน้า) ไม่ใช่แค่หน้าปัจจุบัน
            (currentFilteredProspectItems || []).forEach(({ selectKey }) => {
                if (!selectKey) return;
                if (isChecked) {
                    selectedProspectIds.add(selectKey);
                } else {
                    selectedProspectIds.delete(selectKey);
                }
            });

            // อัปเดตสถานะ checkbox ที่แสดงอยู่ให้ตรงกับการเลือก
            const checkboxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox:not(:disabled)');
            checkboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            updateSelectedCount();
        });
    }
})();

(function () {
    campaigns = [];
    let filteredCampaigns = [];
    let batchPage = 1;
    const batchPerPage = 10;
    let totalBatchCount = 0;
    let selectedIndex = 0;

    function getStatusClass(status) {
        if (!status) return 'approved';
        const s = String(status).trim().toLowerCase();
        const normalized = s.replace(/_/g, ' ');
        if (normalized === 'reject' || normalized === 'rejected' || normalized === 'ไม่อนุมัติ' || normalized === 'cancel' || normalized === 'cancelled' || normalized === 'ยกเลิก') return 'rejected';
        if (normalized === 'waiting prospect' || normalized === 'waiting prospect (prospect setup)') return 'waiting-prospect';
        if (normalized === 'waiting approve' || normalized === 'waiting approval' || normalized === 'รออนุมัติ') return 'waiting-approve';
        if (normalized.includes('draft') || normalized.includes('ร่าง') || normalized === 'inactive') return 'draft';
        if (normalized === 'approve' || normalized === 'approved' || normalized === 'อนุมัติ' || normalized === 'อนุมัติแล้ว' || normalized === 'active' || normalized === 'ปกติ') return 'approved';
        if (normalized.includes('wait') || normalized.includes('รอ')) return 'waiting-prospect';
        return 'approved';
    }

    function getTotalBatchPages() {
        return Math.max(1, Math.ceil(totalBatchCount / batchPerPage));
    }

async function displayCampaignFile(fileId) {
    const $fileNameText = $("#selectedFileNameText");
    const $fileNameDisplay = $("#selectedFileNameDisplay");

    if (fileId) {
        try {
            const fileRes = await fetch(`/Campain/getFile?Id=${fileId}`);
            if (fileRes.ok) {
                const fileData = await fileRes.json();
                const fileName = (fileData && fileData[0]) ? (fileData[0].Name || "") : "";
                const filePath = (fileData && fileData[0]) ? (fileData[0].Path || "") : "";

                if (fileName) {
                    $fileNameText
                        .text(fileName)
                        .attr("data-filepath", filePath)
                        .css("cursor", "pointer")
                        .attr("title", "คลิกเพื่อเปิดดูไฟล์");
                    $fileNameDisplay.removeClass("d-none").addClass("d-flex").show();
                    return;
                }
            }
        } catch (e) {
            console.error("Error fetching file info:", e);
        }
    }

    $fileNameText.removeAttr("data-filepath").removeAttr("title").css("cursor", "default").text("");
    $fileNameDisplay.addClass("d-none").removeClass("d-flex").hide();
}

$(document).off("click", "#selectedFileNameText").on("click", "#selectedFileNameText", function () {
    const filePath = $(this).attr("data-filepath");
    const fileName = $(this).text().trim();
    if (!fileName && !filePath) return;

    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const previewableExts = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.txt'];

    if (previewableExts.includes(ext)) {
        if (filePath) {
            window.open(`/Campain/PreviewFile?filePath=${encodeURIComponent(filePath)}`, '_blank');
        }
    } else {
        Swal.fire({
            title: "แจ้งเตือน",
            text: "ไฟล์นี้ไม่สามารถเปิดดูได้ในขณะนี้",
            icon: "info",
            showCancelButton: true,
            confirmButtonColor: "#0d6efd",
            cancelButtonColor: "#6c757d",
            confirmButtonText: '<i class="bi bi-download me-1"></i> ดาวน์โหลด',
            cancelButtonText: 'ปิด',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed && filePath) {
                window.open(`/Campain/DownloadFile?filePath=${encodeURIComponent(filePath)}&fileName=${encodeURIComponent(fileName)}`, '_blank');
            }
        });
    }
});

    function selectCampaign(index) {
        selectedIndex = index;
        const container = document.getElementById('batchListContainer');
        if (!container) return;

        const items = container.querySelectorAll('.batch-item');
        items.forEach((el, i) => {
            const isSelected = i === selectedIndex;
            el.classList.toggle('active', isSelected);
            const codeSpan = el.querySelector('.batch-item-id span:first-child');
            if (codeSpan) {
                codeSpan.classList.toggle('text-primary', isSelected);
            }
        });

        const campaign = filteredCampaigns[selectedIndex];
        if (campaign) {
            const codeInput = document.getElementById('filterCampaignCode');
            const nameInput = document.getElementById('filterCampaignName');
            const startInput = document.getElementById('filterStartDate');
            const endInput = document.getElementById('filterEndDate');
            const remarkInput = document.getElementById('filterRemark');

            if (codeInput) codeInput.value = campaign.code;
            if (nameInput) nameInput.value = campaign.name;
            if (startInput) startInput.value = typeof formatThaiDate === 'function' ? formatThaiDate(campaign.startDate) : campaign.startDate;
            if (endInput) endInput.value = typeof formatThaiDate === 'function' ? formatThaiDate(campaign.endDate) : campaign.endDate;
            if (remarkInput) remarkInput.value = campaign.remark;

            // Set selected branches in UI based on offcde
            setSelectedBranches(campaign.offcde);

            // Fetch prospects for selected campaign code
            loadProspectAssignData(campaign.code);
            displayCampaignFile(campaign.file_id);
        } else {
            displayCampaignFile("");
        }
    }

    function renderBatch() {
        const container = document.getElementById('batchListContainer');
        if (!container) return;

        const total = totalBatchCount;

        if (total === 0 || filteredCampaigns.length === 0) {
            container.innerHTML = '<div class="p-3 text-center text-muted" style="font-size: 0.85rem;">ไม่พบข้อมูล</div>';
            const pageInfo = document.getElementById('batchPageInfo');
            if (pageInfo) pageInfo.textContent = 'แสดง 0 ถึง 0 รายการ';
            updatePaginationButtons(1, 1);
            return;
        }

        const totalPages = getTotalBatchPages();
        if (batchPage > totalPages) batchPage = totalPages;

        const from = (batchPage - 1) * batchPerPage + 1;
        const to = Math.min(batchPage * batchPerPage, total);

        function formatDate(dateStr) {
            if (!dateStr) return '';
            let str = String(dateStr).trim();
            if (str.includes('T')) str = str.split('T')[0];
            else if (str.includes(' ')) str = str.split(' ')[0];
            const parts = str.split('-');
            if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return str;
        }

        let html = '';
        filteredCampaigns.forEach((item, idx) => {
            const isSelected = idx === selectedIndex;
            const statusClass = getStatusClass(item.status);
            const displayCode = item.code || item.name || 'N/A';
            const startDate = formatDate(item.startDate);
            const endDate = formatDate(item.endDate);
            const displayName = item.name || '';

            html += `
                <div class="batch-item ${isSelected ? 'active' : ''}" data-batch-index="${idx}">
                    <div class="batch-item-id">
                        <span class="${isSelected ? 'text-primary' : ''}">${displayCode}</span>
                        <span class="batch-status ${statusClass}">${item.status}</span>
                    </div>
                    <div class="batch-item-name" title="${displayName}">
                        <span>${displayName}</span>
                    </div>
                    <div class="batch-item-details">
                        <span>${startDate}</span>
                        <span> - </span>
                        <span>${endDate}</span>
                        
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.batch-item').forEach(el => {
            el.addEventListener('click', function () {
                const idx = parseInt(this.getAttribute('data-batch-index'), 10);
                selectCampaign(idx);
            });
        });

        const pageInfo = document.getElementById('batchPageInfo');
        if (pageInfo) pageInfo.textContent = `แสดง ${from} ถึง ${to} จาก ${total} รายการ`;

        updatePaginationButtons(batchPage, totalPages);
    }

    function updatePaginationButtons(currentPage, totalPages) {
        const firstBtn = document.getElementById('batchFirstBtn');
        const prevBtn = document.getElementById('batchPrevBtn');
        const nextBtn = document.getElementById('batchNextBtn');
        const pageNumbersContainer = document.getElementById('batchPageNumbers');

        if (firstBtn && prevBtn && nextBtn) {
            if (currentPage <= 1) {
                firstBtn.style.opacity = '0.35';
                firstBtn.style.cursor = 'not-allowed';
                prevBtn.style.opacity = '0.35';
                prevBtn.style.cursor = 'not-allowed';
            } else {
                firstBtn.style.opacity = '1';
                firstBtn.style.cursor = 'pointer';
                prevBtn.style.opacity = '1';
                prevBtn.style.cursor = 'pointer';
            }

            if (currentPage >= totalPages) {
                nextBtn.style.opacity = '0.35';
                nextBtn.style.cursor = 'not-allowed';
            } else {
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
            }
        }

        if (pageNumbersContainer) {
            pageNumbersContainer.innerHTML = '';
            
            function buildBatchPageRange(curr, total) {
                if (total <= 5) {
                    return Array.from({ length: total }, (_, i) => i + 1);
                }
                if (curr <= 3) {
                    return [1, 2, 3, '...', total];
                } else if (curr >= total - 2) {
                    return [1, '...', total - 2, total - 1, total];
                } else {
                    return [1, '...', curr, '...', total];
                }
            }

            const pages = buildBatchPageRange(currentPage, totalPages);
            pages.forEach(p => {
                if (p === '...') {
                    const span = document.createElement('span');
                    span.className = 'batch-page-ellipsis';
                    span.textContent = '...';
                    pageNumbersContainer.appendChild(span);
                } else {
                    const btn = document.createElement('span');
                    const isActive = p === currentPage;
                    btn.className = `batch-page-number${isActive ? ' active' : ''}`;
                    btn.textContent = p;
                    btn.addEventListener('click', function () {
                        if (p !== currentPage) {
                            loadBatch(p);
                        }
                    });
                    pageNumbersContainer.appendChild(btn);
                }
            });
        }
    }

    async function loadBatch(pageToLoad) {
        batchPage = pageToLoad || 1;
        const res = await getCampainList(batchPage, batchPerPage);
        campaigns = res.data || [];
        filteredCampaigns = [...campaigns];
        totalBatchCount = res.count !== undefined ? res.count : campaigns.length;
        batchPage = res.page || batchPage;
        selectedIndex = 0;
        renderBatch();
        if (filteredCampaigns.length > 0) {
            selectCampaign(0);
        }
    }

    $("#batchSearchInput").off("keydown").on("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            const q = this.value.toLowerCase().trim();
            if (!q) {
                filteredCampaigns = [...campaigns];
            } else {
                filteredCampaigns = campaigns.filter(item =>
                    (item.code && item.code.toLowerCase().includes(q)) ||
                    (item.name && item.name.toLowerCase().includes(q)) ||
                    (item.status && item.status.toLowerCase().includes(q)) ||
                    (item.remark && item.remark.toLowerCase().includes(q))
                );
            }
            selectedIndex = 0;
            renderBatch();
            if (filteredCampaigns.length > 0) {
                selectCampaign(0);
            }
        }
    });

    document.getElementById('batchFirstBtn')?.addEventListener('click', function () {
        if (batchPage > 1) { loadBatch(1); }
    });
    document.getElementById('batchPrevBtn')?.addEventListener('click', function () {
        if (batchPage > 1) { loadBatch(batchPage - 1); }
    });
    document.getElementById('batchNextBtn')?.addEventListener('click', function () {
        if (batchPage < getTotalBatchPages()) { loadBatch(batchPage + 1); }
    });

    async function init() {
        allBranch = await getAllBranch();
        // ยังไม่แสดงสาขาจนกว่าจะรู้สาขาที่กำหนดในแคมเปญ
        renderBranchDropdownOptions([]);
        initBranchMultiSelect();
        updateBranchSelectedDisplay();
        loadAndRenderStaffList([]);
        await loadBatch(1);
    }

init();
})();

(function () {
    function initMultiSelect(containerId, selectBoxId, dropdownMenuId, optionClass) {
        const container = document.getElementById(containerId);
        const selectBox = document.getElementById(selectBoxId);
        const dropdownMenu = document.getElementById(dropdownMenuId);
        
        if (!container || !selectBox || !dropdownMenu) return;

        const searchInput = selectBox.querySelector('input[type="text"]');
        
        selectBox.addEventListener('click', function(e) {
            if (e.target.tagName === 'I' && e.target.classList.contains('bi-x')) return;
            if (e.target === searchInput) {
                dropdownMenu.style.display = 'block';
                return;
            }
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', function(e) {
            if (!container.contains(e.target)) {
                dropdownMenu.style.display = 'none';
            }
        });

        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const val = this.value.toLowerCase();
                const options = dropdownMenu.querySelectorAll('.' + optionClass);
                options.forEach(opt => {
                    const text = opt.querySelector('span').textContent.toLowerCase();
                    if (text.includes(val)) {
                        opt.classList.remove('d-none');
                    } else {
                        opt.classList.add('d-none');
                    }
                });
                dropdownMenu.style.display = 'block';
            });
        }

        dropdownMenu.addEventListener('click', function(e) {
            const opt = e.target.closest('.' + optionClass);
            if (!opt) return;
            const checkbox = opt.querySelector('input[type="checkbox"]');
            const val = opt.getAttribute('data-value');
            const text = opt.querySelector('span').textContent;
            
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    addTag(val, text);
                } else {
                    removeTag(val);
                }
            }
        });

        function addTag(val, text) {
            if (selectBox.querySelector(`.branch-tag[data-value="${val}"]`)) return;
            
            const tag = document.createElement('span');
            tag.className = 'branch-tag';
            tag.setAttribute('data-value', val);
            tag.innerHTML = `${escapeHtml(text)} <i class="bi bi-x" style="cursor: pointer;"></i>`;
            
            tag.querySelector('.bi-x').addEventListener('click', function(e) {
                e.stopPropagation();
                removeTag(val);
                const opt = dropdownMenu.querySelector(`.${optionClass}[data-value="${val}"]`);
                if (opt) {
                    const cb = opt.querySelector('input[type="checkbox"]');
                    if (cb) cb.checked = false;
                }
            });
            
            selectBox.insertBefore(tag, selectBox.querySelector('.d-flex'));
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
            if (selectBoxId === 'responsibleSelectBox') {
                updateAssignButtonDisabledState();
            }
        }

        function removeTag(val) {
            const tag = selectBox.querySelector(`.branch-tag[data-value="${val}"]`);
            if (tag) {
                tag.remove();
            }
            if (selectBoxId === 'responsibleSelectBox') {
                updateAssignButtonDisabledState();
            }
        }
    }

    initMultiSelect('responsibleSelectContainer', 'responsibleSelectBox', 'responsibleDropdownMenu', 'responsible-option');
    initMultiSelect('newResponsibleSelectContainer', 'newResponsibleSelectBox', 'newResponsibleDropdownMenu', 'new-responsible-option');
    updateAssignButtonDisabledState();
})();

(function () {
    const assignBtn = document.getElementById('assignBtn');
    if (assignBtn) {
        assignBtn.addEventListener('click', async function(e) {
            if (this.disabled) return;
            const btnText = this.textContent.trim();
            if (btnText === 'ReAssign') {
                const checkedBoxes = Array.from(document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox:checked'));
                const assignableCheckboxes = checkedBoxes.filter(cb => {
                    const st = (cb.getAttribute('data-status') || '').toLowerCase().trim();
                    const row = cb.closest('tr');
                    const statusText = row ? (row.querySelector('.status-text')?.textContent || '').toLowerCase().trim() : '';
                    return st === 'assigned' || st === 'reassign' || (statusText.includes('assign') && !statusText.includes('wait'));
                });

                if (assignableCheckboxes.length === 0) {
                    if (typeof showAlert === 'function') {
                        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกรายการ Prospect ที่มีสถานะ Assign เพื่อทำการ ReAssign');
                    } else {
                        alert('กรุณาเลือกรายการ Prospect ที่มีสถานะ Assign เพื่อทำการ ReAssign');
                    }
                    return;
                }

                const modalElement = document.getElementById('reAssignModal');
                if (modalElement && typeof bootstrap !== 'undefined') {
                    const bsModal = new bootstrap.Modal(modalElement);
                    bsModal.show();
                } else if (typeof $ !== 'undefined') {
                    $('#reAssignModal').modal('show');
                }
            } else {
                const assigneeTags = document.querySelectorAll('#responsibleSelectBox .branch-tag');
                if (assigneeTags.length > 1) {
                    if (typeof showAlert === 'function') {
                        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกผู้รับผิดชอบเพียงคนเดียว หากไม่ใช่การ Auto Assign');
                    } else {
                        alert('กรุณาเลือกผู้รับผิดชอบเพียงคนเดียว หากไม่ใช่การ Auto Assign');
                    }
                    return;
                }

                if (typeof startLoading === 'function') {
                    startLoading('กำลังบันทึกข้อมูล...', 'ระบบกำลังทำการ Assign Prospect กรุณารอสักครู่...');
                }
                const result = await UpdateProspectCustomer();
                if (typeof stopLoading === 'function') {
                    stopLoading();
                }

                if (result) {
                    if (typeof showAlert === 'function') {
                        showAlert('success', 'Assign เรียบร้อยแล้ว', 'ทำการ Assign เรียบร้อยแล้ว', function() {
                            loadProspectAssignData(selectedCampaignCode);
                        });
                    } else {
                        alert('ทำการ Assign เรียบร้อยแล้ว');
                        loadProspectAssignData(selectedCampaignCode);
                    }
                }
            }
        });
    }

    // ReAssign Modal confirm button click
    const confirmReAssignBtn = document.querySelector('#reAssignModal .modal-footer .btn-primary-custom');
    if (confirmReAssignBtn) {
        confirmReAssignBtn.addEventListener('click', async function() {
            const newAssigneeTags = document.querySelectorAll('#newResponsibleSelectBox .branch-tag');
            const newAssigneeList = Array.from(newAssigneeTags).map(tag => tag.getAttribute('data-value')).filter(Boolean);

            if (!newAssigneeList || newAssigneeList.length === 0) {
                if (typeof showAlert === 'function') {
                    showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกผู้รับผิดชอบใหม่');
                } else {
                    alert('กรุณาเลือกผู้รับผิดชอบใหม่');
                }
                return;
            }

            if (newAssigneeList.length > 1) {
                if (typeof showAlert === 'function') {
                    showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกผู้รับผิดชอบเพียงคนเดียว หากไม่ใช่การ Auto Assign');
                } else {
                    alert('กรุณาเลือกผู้รับผิดชอบเพียงคนเดียว หากไม่ใช่การ Auto Assign');
                }
                return;
            }

            const newAssignee = newAssigneeList.join(',');

            const remarkInput = document.querySelector('#reAssignModal textarea');
            const remark = remarkInput ? remarkInput.value.trim() : '';

            // Hide modal
            const modalElement = document.getElementById('reAssignModal');
            if (modalElement && typeof bootstrap !== 'undefined') {
                const bsModal = bootstrap.Modal.getInstance(modalElement);
                if (bsModal) bsModal.hide();
            } else if (typeof $ !== 'undefined') {
                $('#reAssignModal').modal('hide');
            }

            if (typeof startLoading === 'function') {
                startLoading('กำลังบันทึกข้อมูล...', 'ระบบกำลังทำการ ReAssign Prospect กรุณารอสักครู่...');
            }
            const result = await UpdateProspectCustomer({
                assign_to: newAssignee,
                assign_remark: remark || 'ReAssigned manually',
                assign_status: 'reassign',
                assign_case: 'single'
            });
            if (typeof stopLoading === 'function') {
                stopLoading();
            }

            if (result) {
                if (typeof showAlert === 'function') {
                    showAlert('success', 'ReAssign เรียบร้อยแล้ว', 'ทำการ ReAssign เรียบร้อยแล้ว', function() {
                        loadProspectAssignData(selectedCampaignCode);
                    });
                } else {
                    alert('ทำการ ReAssign เรียบร้อยแล้ว');
                    loadProspectAssignData(selectedCampaignCode);
                }
            }
        });
    }
})();

(function () {
    const autoAssignBtn = document.getElementById('autoAssignBtn');
    if (autoAssignBtn) {
        autoAssignBtn.addEventListener('click', async function(e) {
            if (this.disabled) return;
            e.preventDefault();

            const selectedBranches = getSelectedBranchCodes();
            if (!selectedBranches || selectedBranches.length === 0) {
                if (typeof showAlert === 'function') {
                    showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกสาขาก่อนทำ Auto Assign');
                } else {
                    alert('กรุณาเลือกสาขาก่อนทำ Auto Assign');
                }
                return;
            }

            // 1) ต้องเลือกรายการ Prospect ที่ต้องการ Assign ก่อน (ใช้จาก selection set เพื่อรองรับการเลือกข้ามหน้า)
            if (selectedProspectIds.size === 0) {
                if (typeof showAlert === 'function') {
                    showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกรายการ Prospect ที่ต้องการ Assign');
                } else {
                    alert('กรุณาเลือกรายการ Prospect ที่ต้องการ Assign');
                }
                return;
            }

            // 2) ถ้าผู้ใช้เลือกผู้รับผิดชอบไว้แล้ว ให้ใช้เฉพาะที่เลือก
            //    ถ้ายังไม่ได้เลือก ให้เลือกพนักงานทั้งหมดในสาขามาทำ Auto Assign
            const existingAssigneeTags = document.querySelectorAll('#responsibleSelectBox .branch-tag');
            if (existingAssigneeTags.length === 0) {
                const { totalOptions } = selectAllResponsibleStaff();
                if (totalOptions === 0) {
                    if (typeof showAlert === 'function') {
                        showAlert('warning', 'แจ้งเตือน', 'ไม่พบข้อมูลพนักงานในสาขาที่เลือก');
                    } else {
                        alert('ไม่พบข้อมูลพนักงานในสาขาที่เลือก');
                    }
                    return;
                }
            }

            if (typeof startLoading === 'function') {
                startLoading('กำลังบันทึกข้อมูล...', 'ระบบกำลังทำการ Auto Assign Prospect กรุณารอสักครู่...');
            }
            const result = await UpdateProspectCustomer({ assign_case: 'Auto Bot' });
            if (typeof stopLoading === 'function') {
                stopLoading();
            }

            if (result) {
                if (typeof showAlert === 'function') {
                    showAlert('success', 'Auto Assign เรียบร้อยแล้ว', 'ทำการ Auto Assign เรียบร้อยแล้ว', function() {
                        loadProspectAssignData(selectedCampaignCode);
                    });
                } else {
                    alert('ทำการ Auto Assign เรียบร้อยแล้ว');
                    loadProspectAssignData(selectedCampaignCode);
                }
            }
        });
    }
})();

