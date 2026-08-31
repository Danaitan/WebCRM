
let selectedCampaignCode = "";
let prospectTotalCount = 0;
let rawProspectItems = [];
let activeStatusFilter = 'all';
let allBranch = [];
let prospectPage = 1;
let prospectPageSize = 10;
let campaigns = [];

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
            body: JSON.stringify(payload)
        });
        return response;
    } catch (error) {
        console.error("Error in PostNotification:", error);
    }
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
            `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ท่านได้รับการ <b>${typeName} Prospect</b>${campaignLabel ? ` จาก Campaign <b>${campaignLabel}</b>` : ''} จำนวน <b>${count}</b> รายการ<br>` +
            (remark ? `หมายเหตุ: ${escapeHtml(remark)}<br>` : '') +
            `<br>ขอขอบคุณ<br>` +
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
        }
    } catch (err) {
        console.error("Error sending PostNoti for Assign:", err);
    }
}

async function getAllBranch() {
    if (allBranch && allBranch.length > 0) {
        return allBranch;
    }
    try {
        const branchResponse = await fetch(`/Campain/getBranchListForCRM`);
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

function getBranchCode(b) {
    if (!b) return '';
    return String(b.offcde || b.Offcde || '').trim();
}

function getBranchName(b) {
    if (!b) return '';
    return b.branch_name || b.branchName || b.BranchName || b.Bname || b.bname || getBranchCode(b);
}

function renderBranchDropdownOptions(allowedOffcdes = null) {
    const selectEl = document.getElementById('filterBranchSelect');
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="">-- เลือกสาขา --</option>';

    let branchesToRender = allBranch || [];
    if (Array.isArray(allowedOffcdes)) {
        branchesToRender = branchesToRender.filter(b => allowedOffcdes.includes(getBranchCode(b)));
    }

    branchesToRender.forEach(b => {
        const code = getBranchCode(b);
        const name = getBranchName(b);
        if (!code) return;

        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = name;
        selectEl.appendChild(opt);
    });
}

function setSelectedBranches(offcdeString) {
    const selectEl = document.getElementById('filterBranchSelect');
    if (!selectEl) return;

    const offcdes = offcdeString
        ? String(offcdeString).split(',').map(s => s.trim()).filter(Boolean)
        : [];

    renderBranchDropdownOptions(offcdeString ? offcdes : null);

    if (offcdes.length > 0) {
        selectEl.value = offcdes[0];
    } else {
        selectEl.value = '';
    }

    loadAndRenderStaffList(selectEl.value);
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

async function loadAndRenderStaffList(branchId) {
    const dropdownMenu = document.getElementById('responsibleDropdownMenu');
    const newDropdownMenu = document.getElementById('newResponsibleDropdownMenu');

    // Clear existing tags in responsibleSelectBox and newResponsibleSelectBox
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

    if (!branchId) {
        const defaultHtml = '<div class="p-2 text-center text-muted" style="font-size: 0.85rem;">กรุณาเลือกสาขา</div>';
        if (dropdownMenu) dropdownMenu.innerHTML = defaultHtml;
        if (newDropdownMenu) newDropdownMenu.innerHTML = defaultHtml;
        return;
    }

    const loadingHtml = '<div class="p-2 text-center text-muted" style="font-size: 0.85rem;"><i class="bi bi-hourglass-split me-1"></i> กำลังโหลดข้อมูล...</div>';
    if (dropdownMenu) dropdownMenu.innerHTML = loadingHtml;
    if (newDropdownMenu) newDropdownMenu.innerHTML = loadingHtml;

    const res = await getStaffList(branchId);

    let staffArray = [];
    if (Array.isArray(res)) {
        staffArray = res;
    } else if (res && Array.isArray(res.data)) {
        staffArray = res.data;
    } else if (res && Array.isArray(res.result)) {
        staffArray = res.result;
    }

    if (staffArray.length === 0) {
        const noDataHtml = '<div class="p-2 text-center text-muted" style="font-size: 0.85rem;">ไม่พบข้อมูลพนักงาน</div>';
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
                    const codeKey = keys.find(k => /code|id|personnel|staff|emp|user/i.test(k));
                    if (codeKey && s[codeKey] != null) val = String(s[codeKey]);
                }
                if (!name) {
                    const nameKey = keys.find(k => /name|full|first|display/i.test(k));
                    if (nameKey && s[nameKey] != null) name = String(s[nameKey]);
                }
            }

            if (!val) val = name;
            if (!name) name = val;
        }
        if (!val && !name) return;

        const displayText = (val && name && val !== name && !name.includes(val)) ? `${val} - ${name}` : (name || val);

        html += `
            <div class="dropdown-item d-flex align-items-center gap-2 py-2 responsible-option rounded" style="cursor: pointer;" data-value="${escapeHtml(val)}">
                <input type="checkbox" class="form-check-input mt-0 border-primary" style="pointer-events: none;">
                <span>${escapeHtml(displayText)}</span>
            </div>
        `;

        newHtml += `
            <div class="dropdown-item d-flex align-items-center gap-2 py-2 new-responsible-option rounded" style="cursor: pointer;" data-value="${escapeHtml(val)}">
                <input type="checkbox" class="form-check-input mt-0 border-primary" style="pointer-events: none;">
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

        const selectedCheckboxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox:checked');
        const ids = overrideParams.id || Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-id')).filter(Boolean);

        if (!ids || ids.length === 0) {
            if (typeof showAlert === 'function') {
                showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกรายการ Prospect ที่ต้องการ Assign');
            } else {
                alert('กรุณาเลือกรายการ Prospect ที่ต้องการ Assign');
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

        const filterStartDateEl = document.getElementById('filterStartDate');
        const filterEndDateEl = document.getElementById('filterEndDate');
        const assignDate = filterStartDateEl ? filterStartDateEl.value : '';
        const assignExpire = filterEndDateEl ? filterEndDateEl.value : '';
        const assignRemark = overrideParams.assign_remark || 'Assigned manually';
        const assignStatus = overrideParams.assign_status || 'assigned';

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
        totalCount = raw.Customer?.total ?? raw.total ?? raw.count ?? (Array.isArray(raw.data) ? raw.data.length : (Array.isArray(raw.result) ? raw.result.length : 0));
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
            const id = item.id || '';
            const name = item.nameCus || item.customer_name || '-';
            const contract = item.contno || '-';
            const branch = item.branch_Name || item.ชื่อสาขาเดิม || '-';
            const carLocation = item.provinceUsecar || item.provinceUseCar || item.carLocation || item.car_location || '-';
            const createdDate = item.created || item.ImportDate || '-';
            const createdBy = item.created_by || '-';
            const custType = item.custype || '-';
            const occupation = item.occupation || '-';
            const assignee = item.staffName || '-';
            const status = item.assign_status || '-';

            if (id || idno || (name && name !== '-')) {
                items.push({
                    id: String(id || '').trim(),
                    idno: String(idno || '').trim(),
                    branch: String(branch).trim(),
                    name: String(name).trim(),
                    contract: String(contract).trim(),
                    custType: String(custType).trim(),
                    occupation: String(occupation).trim(),
                    carLocation: String(carLocation).trim(),
                    assignee: String(assignee).trim(),
                    status: String(status).trim(),
                    createdDate: String(createdDate).trim(),
                    createdBy: String(createdBy).trim(),
                    raw: item
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
        const queryStr = (page !== undefined && pageSize !== undefined) 
            ? `?page=${page}&pageSize=${pageSize}&status=${status}`
            : '';
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
            IsImport:  item.IsImport || false
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
        res = etlRes ? (etlRes.IsBatch || etlRes.isBatch || etlRes.is_batch || etlRes) : null;
    } else {
        res = await getProductBatchByProductCode(productCode);
    }

    const { items, totalCount } = extractProspectCustomers(res);

    rawProspectItems = items;
    prospectTotalCount = totalCount;

    updateSummaryCardCounts(items, totalCount);
    filterAndRenderProspectTable();
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

function filterAndRenderProspectTable() {
    const tbody = document.getElementById('prospectAssignTableBody');
    if (!tbody) return;

    let filteredItems = rawProspectItems;
    if (activeStatusFilter !== 'all') {
        filteredItems = rawProspectItems.filter(item => {
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

    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-emoji-neutral me-1"></i> ไม่พบรายการ Prospect</td></tr>`;
    } else {
        const totalPages = Math.ceil(filteredItems.length / prospectPageSize) || 1;
        if (prospectPage > totalPages) prospectPage = totalPages;
        if (prospectPage < 1) prospectPage = 1;

        const startIndex = (prospectPage - 1) * prospectPageSize;
        const pageItems = filteredItems.slice(startIndex, startIndex + prospectPageSize);

        let html = '';
        pageItems.forEach(item => {
            const dotClass = getStatusDotClass(item.status, item.assignee);
            const statusText = getStatusLabel(item.status, item.assignee);
            html += `
                <tr>
                    <td class="text-center"><input type="checkbox" class="form-check-input prospect-checkbox" data-id="${escapeHtml(item.id)}" data-contract="${escapeHtml(item.contract)}"></td>
                    <td>
                        <div class="fw-medium">${escapeHtml(item.branch)}</div>
                    </td>
                    <td>
                        <div class="fw-medium">${escapeHtml(item.name)}</div>
                        <div class="text-gray" style="font-size: 0.75rem;">${escapeHtml(item.idno)}</div>
                    </td>
                    <td>${escapeHtml(item.contract)}</td>
                    <td>${escapeHtml(item.custType)}</td>
                    <td>${escapeHtml(item.occupation)}</td>
                    <td>${escapeHtml(item.carLocation)}</td>
                    <td>${escapeHtml(item.assignee)}</td>
                    <td><span class="status-dot ${dotClass}"></span><span class="status-text ${dotClass}">${statusText}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // Attach event listeners for checkboxes in tbody
    const checkboxes = tbody.querySelectorAll('.prospect-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateSelectedCount);
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
    if (!assignBtn) return;

    const assigneeTags = document.querySelectorAll('#responsibleSelectBox .branch-tag');
    if (assigneeTags.length === 0) {
        assignBtn.disabled = true;
    } else {
        assignBtn.disabled = false;
    }
}

function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox');
    const checkedBoxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox:checked');
    const countDisplay = document.getElementById('selectedProspectCount');
    const selectAllCheckbox = document.getElementById('selectAllProspects');
    const assignBtn = document.getElementById('assignBtn');

    const checkedCount = checkedBoxes.length;
    if (countDisplay) {
        countDisplay.textContent = `Selected: ${checkedCount} รายการ`;
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = (checkboxes.length > 0 && checkedCount === checkboxes.length);
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

    paginationEl.innerHTML = '';
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
            const isChecked = this.checked;
            const checkboxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox');
            checkboxes.forEach(cb => cb.checked = isChecked);
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
        const s = status.toLowerCase();
        if (s.includes('wait') || s.includes('รอ')) return 'waiting';
        if (s.includes('draft') || s.includes('ร่าง')) return 'draft';
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
                        .attr("title", "คลิกเพื่อดาวน์โหลดไฟล์");
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
    if (filePath) {
        window.open(`/Campain/DownloadFile?filePath=${encodeURIComponent(filePath)}`, '_blank');
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
            if (startInput) startInput.value = campaign.startDate;
            if (endInput) endInput.value = campaign.endDate;
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
            container.innerHTML = '<div class="p-3 text-center text-muted" style="font-size: 0.85rem;">ไม่พบข้อมูล Campaign</div>';
            const pageInfo = document.getElementById('batchPageInfo');
            if (pageInfo) pageInfo.textContent = '0 - 0 จาก 0';
            updatePaginationButtons(1, 1);
            return;
        }

        const totalPages = getTotalBatchPages();
        if (batchPage > totalPages) batchPage = totalPages;

        const from = (batchPage - 1) * batchPerPage + 1;
        const to = Math.min(batchPage * batchPerPage, total);

        let html = '';
        filteredCampaigns.forEach((item, idx) => {
            const isSelected = idx === selectedIndex;
            const statusClass = getStatusClass(item.status);
            const displayCode = item.code || item.name || 'N/A';
            const displayDate = item.created || item.startDate || '';
            const displayName = item.name || item.remark || '';

            html += `
                <div class="batch-item ${isSelected ? 'active' : ''}" data-batch-index="${idx}">
                    <div class="batch-item-id">
                        <span class="${isSelected ? 'text-primary' : ''}">${displayCode}</span>
                        <span class="batch-status ${statusClass}">${item.status}</span>
                    </div>
                    <div class="batch-item-details">
                        <span>${displayDate}</span>
                        <span>${displayName}</span>
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
        if (pageInfo) pageInfo.textContent = `${from} - ${to} จาก ${total}`;

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
                    span.className = 'px-1 text-muted';
                    span.style.fontSize = '0.8rem';
                    span.textContent = '...';
                    pageNumbersContainer.appendChild(span);
                } else {
                    const btn = document.createElement('span');
                    const isActive = p === currentPage;
                    btn.className = `px-2 py-0.5 rounded ${isActive ? 'bg-primary text-white fw-bold' : 'text-dark'}`;
                    btn.style.cursor = 'pointer';
                    btn.style.fontSize = '0.8rem';
                    btn.style.userSelect = 'none';
                    if (!isActive) {
                        btn.style.backgroundColor = '#f1f5f9';
                    }
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
        renderBranchDropdownOptions();

        const filterBranchSelect = document.getElementById('filterBranchSelect');
        if (filterBranchSelect) {
            filterBranchSelect.addEventListener('change', function () {
                loadAndRenderStaffList(this.value);
            });
        }

        await loadBatch(1);
    }

    init();
})();



// RESPONSIBLE PERSON MULTI-SELECT
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

// ASSIGN / RE-ASSIGN BUTTON CLICK
(function () {
    const assignBtn = document.getElementById('assignBtn');
    if (assignBtn) {
        assignBtn.addEventListener('click', async function(e) {
            if (this.disabled) return;
            const btnText = this.textContent.trim();
            if (btnText === 'ReAssign') {
                const modalElement = document.getElementById('reAssignModal');
                if (modalElement && typeof bootstrap !== 'undefined') {
                    const bsModal = new bootstrap.Modal(modalElement);
                    bsModal.show();
                } else if (typeof $ !== 'undefined') {
                    $('#reAssignModal').modal('show');
                }
            } else {
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
            const newAssignee = newAssigneeList.join(',');

            if (!newAssignee) {
                if (typeof showAlert === 'function') {
                    showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกผู้รับผิดชอบใหม่');
                } else {
                    alert('กรุณาเลือกผู้รับผิดชอบใหม่');
                }
                return;
            }

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

// AUTO ASSIGN BUTTON CLICK
(function () {
    const autoAssignBtn = document.getElementById('autoAssignBtn');
    if (autoAssignBtn) {
        autoAssignBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            const filterBranchSelect = document.getElementById('filterBranchSelect');
            if (!filterBranchSelect || !filterBranchSelect.value) {
                if (typeof showAlert === 'function') {
                    showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกสาขาก่อนทำ Auto Assign');
                } else {
                    alert('กรุณาเลือกสาขาก่อนทำ Auto Assign');
                }
                return;
            }

            const { totalOptions } = selectAllResponsibleStaff();
            if (totalOptions === 0) {
                if (typeof showAlert === 'function') {
                    showAlert('warning', 'แจ้งเตือน', 'ไม่พบข้อมูลพนักงานในสาขาที่เลือก');
                } else {
                    alert('ไม่พบข้อมูลพนักงานในสาขาที่เลือก');
                }
                return;
            }

            const checkedBoxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox:checked');
            if (checkedBoxes.length === 0) {
                if (typeof showAlert === 'function') {
                    showAlert('warning', 'แจ้งเตือน', 'เลือกพนักงานทั้งหมดในสาขาเรียบร้อยแล้ว กรุณาเลือกรายการ Prospect ที่ต้องการ Assign');
                } else {
                    alert('เลือกพนักงานทั้งหมดในสาขาเรียบร้อยแล้ว กรุณาเลือกรายการ Prospect ที่ต้องการ Assign');
                }
                return;
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

