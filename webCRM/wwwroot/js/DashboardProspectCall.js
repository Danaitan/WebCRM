// Prospect Call Dashboard Logic

let callResultChartInstance = null;
let objectiveChartInstance = null;
let rawDashboardData = null;
let currentCallerMode = 'top';
let rawCallerData = [];
let rawEmployeeData = [];

let currentTableData = [];
let currentPage = 1;
let pageSize = 10;

const objectiveColors = {
    'CS': '#3b82f6',
    'MC': '#10b981',
    'FL': '#f59e0b',
    'RM': '#6b7280'
};

function hasPermissionFCRM006() {
    if (typeof window.HAS_FCRM006 === 'boolean') {
        return window.HAS_FCRM006;
    }
    const funcId = (typeof window.FUNC_ID === 'string') ? window.FUNC_ID : '';
    if (!funcId) return false;
    const list = funcId.split(',').map(s => s.trim()).filter(Boolean);
    return list.includes('FCRM006');
}

function updateTopCallersVisibility() {
    const topCallers = document.getElementById('topCallers');
    const campaignTableCol = document.getElementById('campaignTableCol');
    const hasFcrm006 = hasPermissionFCRM006();

    if (!hasFcrm006) {
        if (topCallers) {
            topCallers.classList.add("d-none");
            topCallers.style.setProperty('display', 'none', 'important');
        }
        if (campaignTableCol) {
            campaignTableCol.classList.remove('col-xl-8');
            campaignTableCol.classList.add('col-12', 'col-xl-12');
        }
    } else {
        if (topCallers) {
            topCallers.classList.remove("d-none");
            topCallers.style.display = '';
        }
        if (campaignTableCol) {
            campaignTableCol.classList.remove('col-12', 'col-xl-12');
            campaignTableCol.classList.add('col-12', 'col-xl-8');
        }
    }
}

function validateDateRange() {
    const startDate = $('#filterStartDate').val();
    const endDate = $('#filterEndDate').val();

    if (startDate && endDate && startDate > endDate) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'แจ้งเตือน',
                text: 'วันเริ่มต้องไม่มากกว่าวันสิ้นสุด',
                confirmButtonText: 'ตกลง'
            });
        } else {
            alert('วันเริ่มต้องไม่มากกว่าวันสิ้นสุด');
        }
        return false;
    }
    return true;
}

function bindDateRangeEvents() {
    $('#filterStartDate').on('change input', function () {
        const startDate = $(this).val();
        if (startDate) {
            $('#filterEndDate').attr('min', startDate);
            const endDate = $('#filterEndDate').val();
            if (endDate && endDate < startDate) {
                $('#filterEndDate').val('');
            }
        } else {
            $('#filterEndDate').removeAttr('min');
        }
    });

    $('#filterEndDate').on('change input', function () {
        const endDate = $(this).val();
        if (endDate) {
            $('#filterStartDate').attr('max', endDate);
            const startDate = $('#filterStartDate').val();
            if (startDate && startDate > endDate) {
                $('#filterStartDate').val('');
            }
        } else {
            $('#filterStartDate').removeAttr('max');
        }
    });
}

function isRowExpired(row) {
    if (!row) return false;
    const status = (row.activeStatus || row.status || '').trim().toLowerCase();
    return status === 'expire' || status === 'หมดอายุ';
}

function parseDateTimestamp(val) {
    if (!val) return 0;
    if (typeof val === 'string') {
        val = val.trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(val)) {
            const parts = val.split(' ');
            const dateParts = parts[0].split('/');
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            let hours = 0, minutes = 0, seconds = 0;
            if (parts[1]) {
                const timeParts = parts[1].split(':');
                hours = parseInt(timeParts[0], 10) || 0;
                minutes = parseInt(timeParts[1], 10) || 0;
                seconds = parseInt(timeParts[2], 10) || 0;
            }
            return new Date(year, month, day, hours, minutes, seconds).getTime();
        }
        val = val.replace(' ', 'T');
    }
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
}

function renderEmptyProspectCallDashboard() {
    renderOverview([]);
    initCallResultChart([]);
    initObjectiveChart([]);
    initTopCallers([]);
    currentTableData = [];
    currentPage = 1;
    renderCampaignTable();
}

async function setDashboard() {
    if (!validateDateRange()) return;

    const variableFunc = (typeof window.VARIABLE_FUNC === 'string') ? window.VARIABLE_FUNC.trim() : '';
    const branchEl = document.getElementById('filterBranch');
    if (!variableFunc || !branchEl || branchEl.options.length === 0) {
        renderEmptyProspectCallDashboard();
        return;
    }

    const hasFcrm006 = hasPermissionFCRM006();
    const isLockedCaller = !hasFcrm006 || (window.HAS_RCRM014 && Boolean(window.USER_PERSONAL_ID));

    const startDate = $('#filterStartDate').val() || '';
    const endDate = $('#filterEndDate').val() || '';
    const callType = $('#filterCallType').val() || '';
    const branch = $('#filterBranch').val() || '';
    let callBy = $('#filterCaller').val() || '';
    if (isLockedCaller && window.USER_PERSONAL_ID) {
        callBy = String(window.USER_PERSONAL_ID).trim();
    }
    const campaignName = $('#filterCampaign').val() || '';
    const callResult = $('#filterCallResult').val() || '';

    const params = new URLSearchParams();
    if (startDate) params.append('startdate', startDate);
    if (endDate) params.append('enddate', endDate);
    if (callType) params.append('call_type', callType);
    if (branch) params.append('branch', branch);
    if (callBy) params.append('call_by', callBy);
    if (callResult) params.append('call_result', callResult);
    if (campaignName) params.append('campaign_name', campaignName);

    const queryString = params.toString();
    const url = `/DashboardProspectCall/GetCallDashboard${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    if (!data) return;
    rawDashboardData = data;

    let graph = {};
    let table = [];

    if (data.graph) {
        graph = data.graph;
    } else if (data.data && data.data.graph) {
        graph = data.data.graph;
    } else if (data.result && data.result.graph) {
        graph = data.result.graph;
    } else if (Array.isArray(data) && data[0] && data[0].graph) {
        graph = data[0].graph;
    }

    if (Array.isArray(data.table)) {
        table = data.table;
    } else if (data.data && Array.isArray(data.data.table)) {
        table = data.data.table;
    } else if (data.data && Array.isArray(data.data)) {
        table = data.data;
    } else if (data.table && typeof data.table === 'object') {
        table = Array.isArray(data.table.data) ? data.table.data : [];
    } else if (Array.isArray(data)) {
        table = data;
    }

    renderOverview(graph.overAll || graph.overall || (graph.data && graph.data.overAll) || []);

    initCallResultChart(graph.callResult || graph.call_result || (graph.data && graph.data.callResult) || []);
    initObjectiveChart(graph.objective || (graph.data && graph.data.objective) || []);

    updateTopCallersVisibility();
    if (hasPermissionFCRM006()) {
        const callerData = graph.callNumber || graph.call_number || graph.callNumbers || graph.call_numbers || graph.topCallers || graph.top_callers || graph.callBy || graph.call_by || graph.caller || graph.callers || graph.personal || graph.personnel || graph.employee || (data.callNumber) || (data.data && data.data.callNumber) || [];
        renderTopCallers(callerData);
    }

    currentTableData = [...table].sort((a, b) => {
        const expiredA = isRowExpired(a) ? 1 : 0;
        const expiredB = isRowExpired(b) ? 1 : 0;
        if (expiredA !== expiredB) {
            return expiredA - expiredB;
        }
        return parseDateTimestamp(b.created) - parseDateTimestamp(a.created);
    });
    currentPage = 1;
    renderCampaignTable();
}

function renderOverview(overAll) {
    let called = 0;
    let notCalled = 0;
    let total = 0;

    overAll.forEach(item => {
        const name = (item.name || '').trim();
        const count = Number(item.count || 0);
        if (name === 'โทรแล้ว' || name === 'ติดต่อแล้ว') {
            called = count;
        } else if (name === 'ยังไม่โทร' || name === 'ยังไม่ได้ติดต่อ') {
            notCalled = count;
        } else if (name === 'ทั้งหมด') {
            total = count;
        }
    });

    if (total === 0 && (called > 0 || notCalled > 0)) {
        total = called + notCalled;
    }

    const calledPct = total > 0 ? ((called / total) * 100).toFixed(2) : 0;
    const notCalledPct = total > 0 ? ((notCalled / total) * 100).toFixed(2) : 0;

    const statCalledCountEl = document.getElementById('statCalledCount');
    const statCalledPercentEl = document.getElementById('statCalledPercent');
    const statNotCalledCountEl = document.getElementById('statNotCalledCount');
    const statNotCalledPercentEl = document.getElementById('statNotCalledPercent');

    if (statCalledCountEl) statCalledCountEl.innerText = called.toLocaleString();
    if (statCalledPercentEl) statCalledPercentEl.innerText = `${calledPct}%`;
    if (statNotCalledCountEl) statNotCalledCountEl.innerText = notCalled.toLocaleString();
    if (statNotCalledPercentEl) statNotCalledPercentEl.innerText = `${notCalledPct}%`;
}

function initCallResultChart(callResultData) {
    const ctx = document.getElementById('callResultChart');
    if (!ctx) return;

    if (callResultChartInstance) {
        callResultChartInstance.destroy();
    }

    const sortedData = [...callResultData].sort((a, b) => (b.count || 0) - (a.count || 0));

    let processedData = sortedData;
    if (sortedData.length > 4) {
        const top4 = sortedData.slice(0, 4);
        const others = sortedData.slice(4);
        const othersCount = others.reduce((sum, item) => sum + (item.count || 0), 0);
        if (othersCount > 0) {
            top4.push({ name: 'อื่นๆ', count: othersCount });
        }
        processedData = top4;
    }

    const labels = processedData.map(item => item.name || '');
    const counts = processedData.map(item => item.count || 0);

    const getBarColor = (name) => {
        if (name === 'อื่นๆ') return '#94a3b8';
        if (name.includes('เรียบร้อย') || name.includes('สำเร็จ')) return '#10b981';
        if (name.includes('เบอร์ไม่สามารถ')) return '#ef4444';
        if (name.includes('ไม่สามารถ')) return '#f59e0b';
        return '#3b82f6';
    };

    const backgroundColors = labels.map(name => getBarColor(name));

    callResultChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวน (ราย)',
                data: counts,
                backgroundColor: backgroundColors,
                borderRadius: 4,
                barThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` ${context.dataset.label}: ${context.raw} ราย`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: "'Prompt', sans-serif", size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { family: "'Prompt', sans-serif", size: 11 } }
                }
            }
        }
    });
}

function initObjectiveChart(objectiveData) {
    const ctx = document.getElementById('objectiveChart');
    if (!ctx) return;

    if (objectiveChartInstance) {
        objectiveChartInstance.destroy();
    }

    const labels = objectiveData.map(item => item.name || '');
    const counts = objectiveData.map(item => item.count || 0);
    const total = counts.reduce((a, b) => a + b, 0);

    const totalEl = document.getElementById('objectiveTotalCount');
    if (totalEl) totalEl.innerText = total.toLocaleString();

    const colors = labels.map(name => objectiveColors[name.toUpperCase()] || '#94a3b8');

    objectiveChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${context.raw} ราย (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    // Render Custom HTML Legend
    const legendContainer = document.getElementById('objectiveLegend');
    if (legendContainer) {
        let legendHtml = '';
        objectiveData.forEach(item => {
            const name = item.name || '';
            const count = item.count || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = objectiveColors[name.toUpperCase()] || '#94a3b8';

            legendHtml += `
                <div class="d-flex align-items-center mb-1.5 extra-small">
                    <span class="d-inline-block rounded-circle me-1.5" style="width: 10px; height: 10px; background-color: ${color};"></span>
                    <span class="fw-bold me-1" style="min-width: 22px;">&nbsp;${name}</span>
                    <span class="text-muted me-1">${pct}%</span>
                    <span class="text-secondary fw-semibold">(${count})</span>
                </div>
            `;
        });
        legendContainer.innerHTML = legendHtml;
    }
}

function toggleCallerSort() {
    if (currentCallerMode === 'top') {
        currentCallerMode = 'bottom';
    } else {
        currentCallerMode = 'top';
    }

    const titleText = document.getElementById('callerTitleText');
    const titleIcon = document.getElementById('callerTitleIcon');
    const btnText = document.getElementById('callerBtnText');
    const btnIcon = document.getElementById('callerArrowIcon');

    if (currentCallerMode === 'top') {
        if (titleText) titleText.innerHTML = '&nbsp;&nbsp;5 อันดับสูงสุด';
        if (titleIcon) titleIcon.className = 'bi bi-trophy-fill text-warning';
        if (btnText) btnText.innerText = 'สลับดู 5 อันดับต่ำสุด';
        if (btnIcon) btnIcon.className = 'bi bi-arrow-down-up text-primary';
    } else {
        if (titleText) titleText.innerHTML = '&nbsp;&nbsp;5 อันดับต่ำสุด';
        if (titleIcon) titleIcon.className = 'bi bi-graph-down-arrow text-danger';
        if (btnText) btnText.innerText = 'สลับดู 5 อันดับสูงสุด';
        if (btnIcon) btnIcon.className = 'bi bi-arrow-down-up text-danger';
    }

    renderTopCallers();
}

function renderTopCallers(callNumberData) {
    if (callNumberData !== undefined) {
        if (Array.isArray(callNumberData)) {
            rawCallerData = callNumberData;
        } else if (callNumberData && Array.isArray(callNumberData.data)) {
            rawCallerData = callNumberData.data;
        } else if (callNumberData && Array.isArray(callNumberData.result)) {
            rawCallerData = callNumberData.result;
        } else {
            rawCallerData = [];
        }
    }

    const container = document.getElementById('topCallersList');
    if (!container) return;

    if (!rawCallerData || rawCallerData.length === 0) {
        container.innerHTML = `<div class="text-muted extra-small text-center py-3">ไม่มีข้อมูลผู้โทร</div>`;
        return;
    }

    const getCount = (item) => {
        if (!item) return 0;
        const val = item.count ?? item.total ?? item.amount ?? item.value ?? item.num ?? item.call_count ?? item.qty;
        const n = Number(val);
        return isNaN(n) ? 0 : n;
    };

    const getName = (item) => {
        if (!item) return 'ไม่ระบุชื่อ';
        let rawName = item.name || item.caller || item.caller_name || item.call_by || item.personnel_name_TH || item.personnel_name || item.thname || item.fullName || item.employee_name || item.emp_name || item.personal_name || item.personalName || item.user_name || item.username || item.code || '';
        rawName = String(rawName).trim();
        if (!rawName) return 'ไม่ระบุชื่อ';

        if (Array.isArray(rawEmployeeData) && rawEmployeeData.length > 0) {
            const emp = rawEmployeeData.find(e => {
                if (!e) return false;
                const empCode = String(e.personnel_code || e.code || e.personnel_id || e.emp_code || '').trim();
                return empCode && (empCode === rawName || rawName === empCode);
            });
            if (emp) {
                const empThName = (emp.thname || `${emp.personnel_name_TH || emp.first_name || ''} ${emp.personnel_last_TH || emp.last_name || ''}`).trim();
                if (empThName && !rawName.includes(empThName)) {
                    return `${rawName} - ${empThName}`;
                }
            }
        }
        return rawName;
    };

    let sorted = [...rawCallerData];
    if (currentCallerMode === 'top') {
        sorted.sort((a, b) => getCount(b) - getCount(a));
    } else {
        sorted.sort((a, b) => getCount(a) - getCount(b));
    }

    const targetList = sorted.slice(0, 5);
    const maxCount = Math.max(...rawCallerData.map(item => getCount(item)), 1);

    let html = '';
    targetList.forEach((item, index) => {
        const name = getName(item);
        const count = getCount(item);
        const pct = Math.round((count / maxCount) * 100);
        const rank = index + 1;

        let rankClass = '';
        if (currentCallerMode === 'top') {
            rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : ''));
        } else {
            rankClass = 'rank-bottom';
        }

        const barColorClass = currentCallerMode === 'top' ? 'bg-primary' : 'bg-danger';
        const countColorClass = currentCallerMode === 'top' ? 'text-primary' : 'text-danger';

        html += `
            <div class="caller-item">
                <div class="d-flex align-items-center justify-content-between mb-1">
                    <div class="d-flex align-items-center gap-2">
                        <span class="caller-rank ${rankClass}">${rank}</span>
                        <span class="fw-medium small text-dark me-1">${name}</span>
                    </div>
                    <span class="fw-bold small ${countColorClass}">${count.toLocaleString()} <span class="text-muted extra-small font-normal">ครั้ง</span></span>
                </div>
                <div class="caller-progress-bar">
                    <div class="caller-progress-fill ${barColorClass}" style="width: ${pct}%;"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderCampaignTable() {
    const tbody = document.getElementById('campaignTableBody');
    const infoEl = document.getElementById('tableInfoText');
    const paginationEl = document.getElementById('tablePagination');

    if (!tbody) return;

    const totalItems = currentTableData.length;
    if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4 small">ไม่พบข้อมูลแคมเปญ</td></tr>`;
        if (infoEl) infoEl.innerText = `0 จาก 0 รายการ`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pageItems = currentTableData.slice(startIndex, endIndex);

    let rowsHtml = '';
    pageItems.forEach(row => {
        let createdFormatted = '-';
        if (row.created) {
            const d = new Date(row.created);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                createdFormatted = `${day}/${month}/${year}`;
            }
        }

        const objCode = (row.Objective_code || '').trim().toUpperCase();
        let objBadge = '<span class="text-muted">-</span>';
        if (objCode) {
            const badgeClass = `badge-objective-${objCode.toLowerCase()}`;
            objBadge = `<span class="badge ${badgeClass} px-2 py-1">${objCode}</span>`;
        }

        const totalCust = Number(row.totalCustomer || 0);
        const calledCust = Number(row.calledCustomer || 0);
        const successRate = totalCust > 0 ? ((calledCust / totalCust) * 100).toFixed(2) + '%' : '0.00%';

        const formatDisplayDateRange = (str) => {
            if (!str || str === '-') return '-';
            const s = String(str).trim();
            if (s.includes(' - ')) {
                return s.split(' - ').map(part => {
                    const p = part.trim();
                    if (p.includes('T')) {
                        const dPart = p.split('T')[0].split('-');
                        if (dPart.length === 3 && dPart[0].length === 4) return `${dPart[2]}/${dPart[1]}/${dPart[0]}`;
                    }
                    const parts = p.split('-');
                    if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    return p;
                }).join(' - ');
            }
            if (s.includes('T')) {
                const dPart = s.split('T')[0].split('-');
                if (dPart.length === 3 && dPart[0].length === 4) return `${dPart[2]}/${dPart[1]}/${dPart[0]}`;
            }
            const parts = s.split('-');
            if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return s;
        };

        const status = (row.activeStatus || '').trim();
        const isExpire = status.toLowerCase() === 'expire';
        const statusBadgeClass = isExpire ? 'badge-status-expire' : 'badge-status-active';
        const statusText = status || 'Active';

        rowsHtml += `
            <tr>
                <td class="text-secondary">${createdFormatted}</td>
                <td class="fw-medium text-dark">${row.product_name || '-'}</td>
                <td class="text-center">${objBadge}</td>
                <td class="text-muted extra-small">${formatDisplayDateRange(row['startDate-endDate'])}</td>
                <td class="text-end fw-semibold">${totalCust.toLocaleString()}</td>
                <td class="text-end text-primary fw-bold">${calledCust.toLocaleString()}</td>
                <td class="text-end fw-bold text-success">${successRate}</td>
                <td class="text-center">
                    <span class="badge ${statusBadgeClass} px-2 py-1 rounded-pill">${statusText}</span>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;

    if (infoEl) {
        infoEl.innerText = `${endIndex} จาก ${totalItems} รายการ`;
    }

    if (paginationEl) {
        let pagHtml = '';
        pagHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="goToPage(${currentPage - 1})">ก่อนหน้า</a>
            </li>
        `;

        for (let p = 1; p <= totalPages; p++) {
            pagHtml += `
                <li class="page-item ${p === currentPage ? 'active' : ''}">
                    <a class="page-link" href="javascript:void(0)" onclick="goToPage(${p})">${p}</a>
                </li>
            `;
        }

        pagHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="goToPage(${currentPage + 1})">ถัดไป</a>
            </li>
        `;
        paginationEl.innerHTML = pagHtml;
    }
}

function goToPage(page) {
    currentPage = page;
    renderCampaignTable();
}

function changePageSize(size) {
    pageSize = Number(size) || 10;
    currentPage = 1;
    renderCampaignTable();
}

async function applyFilters() {
    if (!validateDateRange()) return;
    if (typeof startLoading === 'function') {
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    }
    try {
        await setDashboard();
    } catch (error) {
        console.error("Error searching dashboard info:", error);
    } finally {
        if (typeof stopLoading === 'function') {
            stopLoading();
        }
    }
}

async function resetFilters() {
    $('#filterStartDate').val('').removeAttr('max');
    $('#filterEndDate').val('').removeAttr('min');
    $('#filterCampaign').val('');

    const hasFcrm006 = hasPermissionFCRM006();
    const isLockedCaller = !hasFcrm006 || (window.HAS_RCRM014 && Boolean(window.USER_PERSONAL_ID));

    const select2Ids = ['#filterCallType', '#filterBranch', '#filterCaller', '#filterCallResult'];
    select2Ids.forEach(id => {
        const $el = $(id);
        if ($el.length) {
            if (id === '#filterCaller' && isLockedCaller) {
                return;
            }
            if (id === '#filterBranch') {
                if (window.HAS_RCRM014 && window.USER_BRANCH_NAME && hasFcrm006) {
                    return;
                }
                const variableFunc = (typeof window.VARIABLE_FUNC === 'string') ? window.VARIABLE_FUNC.trim() : '';
                if (variableFunc && $el[0].options && $el[0].options.length > 0) {
                    $el.val($el[0].options[0].value);
                    if (typeof $.fn !== 'undefined' && $.fn.select2) {
                        $el.trigger('change');
                    }
                    return;
                }
            }
            $el.val('');
            if (typeof $.fn !== 'undefined' && $.fn.select2) {
                $el.trigger('change');
            }
        }
    });

    await setFilterEmployee();
    await applyFilters();
}

async function exportExcel() {
    await exportCallExcel();
}

async function GetMasterObjective() {
    const response = await fetch(`/Campain/GetMasterObjective`);
    if (!response.ok) throw new Error("Network response was not ok");
    const res = await response.json();
    return res;
}
    
async function setFilterCallType(){

    const objectives = await GetMasterObjective();
    const filterCallType = document.getElementById('filterCallType');
    objectives.forEach(obj => {                
        const code = obj.Code || "";
        const nameEn = obj.NameEn || "";
        const nameTh = obj.NameTh || "";
        filterCallType.innerHTML += `<option value="${code}">${code}: ${nameEn} ${nameTh}</option>`;
    });

}

function findMatchingBranchValue($selectEl, userBranchName) {
    if (!userBranchName) return '';
    const trimmedUserBranch = userBranchName.trim();
    const parts = trimmedUserBranch.split('-');
    const branchNoStr = parts[0].trim();
    const branchNoInt = parseInt(branchNoStr, 10);
    const branchTextStr = parts.length > 1 ? parts.slice(1).join('-').trim() : '';

    let matchedVal = '';

    $selectEl.find('option').each(function () {
        const val = ($(this).val() || '').trim();
        const text = ($(this).text() || '').trim();

        if (!val) return;

        if (val === branchNoStr) {
            matchedVal = val;
            return false;
        }

        if (!isNaN(branchNoInt) && parseInt(val, 10) === branchNoInt) {
            matchedVal = val;
            return false;
        }

        if (branchTextStr && (text.includes(branchTextStr) || branchTextStr.includes(text))) {
            matchedVal = val;
            return false;
        }

        if (text.includes(trimmedUserBranch) || trimmedUserBranch.includes(text)) {
            matchedVal = val;
            return false;
        }
    });

    return matchedVal;
}

function isBranchInVariableFunc(branchItem, variableFunc) {
    if (!variableFunc || typeof variableFunc !== 'string' || !variableFunc.trim()) return false;
    const allowed = variableFunc.split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length === 0) return false;

    const code = String(branchItem.offcde || branchItem.branch_no || branchItem.branch_code || branchItem.BranchNo || branchItem.code || '').trim();
    const name = String(branchItem.branch_name || branchItem.branch || branchItem.name || branchItem.Branch || '').trim();

    return allowed.some(target => {
        const targetClean = target.replace(/^0+/, '');
        const targetPad = target.padStart(2, '0');

        if (code) {
            const codeClean = code.replace(/^0+/, '');
            const codePad = code.padStart(2, '0');
            if (code === target || codePad === targetPad || (codeClean && targetClean && codeClean === targetClean)) {
                return true;
            }
        }

        if (name) {
            if (name.startsWith(target + '-') || name.startsWith(target + ' -') || name.startsWith(target + ' ') ||
                name.startsWith(targetPad + '-') || name.startsWith(targetPad + ' -') || name.startsWith(targetPad + ' ') ||
                name === target || name === targetPad) {
                return true;
            }
            const match = name.match(/^0*(\d+)/);
            if (match && targetClean && match[1] === targetClean) {
                return true;
            }
        }

        return false;
    });
}

async function setFilterBranch(branchData) {
    const selectEl = document.getElementById('filterBranch');
    if (!selectEl) return;

    let data = branchData;
    if (!data) {
        const branchResponse = await fetch('/Home/getBranchListForCRM');
        data = await branchResponse.json();
    }

    const currentValue = selectEl.value || '';
    const variableFunc = (typeof window.VARIABLE_FUNC === 'string') ? window.VARIABLE_FUNC.trim() : '';

    let optionsHtml = '';
    if (variableFunc && Array.isArray(data)) {
        data.forEach(item => {
            if (item && isBranchInVariableFunc(item, variableFunc)) {
                const code = String(item.offcde || '').trim();
                const name = item.branch_name;
                optionsHtml += `<option value="${code}">${name}</option>`;
            }
        });
    }
    selectEl.innerHTML = optionsHtml;

    const hasFcrm006 = hasPermissionFCRM006();
    if (!hasFcrm006) {
        $(selectEl).prop('disabled', false);
        if (currentValue && $(selectEl).find(`option[value="${currentValue}"]`).length > 0) {
            selectEl.value = currentValue;
        } else if (selectEl.options.length > 0) {
            selectEl.value = selectEl.options[0].value;
        } else if (window.USER_BRANCH_NAME) {
            const matchedBranchVal = findMatchingBranchValue($(selectEl), window.USER_BRANCH_NAME);
            if (matchedBranchVal) {
                selectEl.value = matchedBranchVal;
            }
        }
        if (typeof $.fn !== 'undefined' && $.fn.select2) {
            $(selectEl).select2({
                theme: 'bootstrap-5',
                width: '100%',
                language: {
                    noResults: function () {
                        return "ไม่พบข้อมูล";
                    }
                }
            });
            $(selectEl).trigger('change');
        }
    } else if (window.HAS_RCRM014 && window.USER_BRANCH_NAME) {
        const matchedBranchVal = findMatchingBranchValue($(selectEl), window.USER_BRANCH_NAME);
        if (matchedBranchVal) {
            selectEl.value = matchedBranchVal;
        }
        $(selectEl).prop('disabled', true);
        if (typeof $.fn !== 'undefined' && $.fn.select2) {
            $(selectEl).trigger('change');
        }
    } else if (selectEl.options.length > 0) {
        if (!currentValue || $(selectEl).find(`option[value="${currentValue}"]`).length === 0) {
            selectEl.value = selectEl.options[0].value;
        }
        if (typeof $.fn !== 'undefined' && $.fn.select2) {
            $(selectEl).trigger('change');
        }
    }
}

async function getCallresult(){
    const response = await fetch(`/DashboardProspectCall/GetCallResult`);
    if (!response.ok) throw new Error("Network response was not ok");
    const res = await response.json();
    return res;
}

async function setFilterCallResult(){
    try {
        const response = await getCallresult();
        const filterCallResult = document.getElementById('filterCallResult');
        if (!filterCallResult) return;

        filterCallResult.innerHTML = '<option value="">ทั้งหมด</option>';
        const items = response?.[0]?.Dropdown?.[0]?.item || [];
        if (Array.isArray(items)) {
            items.forEach(obj => {                
                if (!obj) return;
                const code = obj.Code || "";
                const nameTh = obj.NameTh || "";
                const labelText = nameTh || "";
                filterCallResult.innerHTML += `<option value="${code}">${labelText}</option>`;
            });
        }
    } catch (err) {
        console.error("Error setting filter call result:", err);
    }
}

async function getEmployeeList(){
    if (rawEmployeeData && rawEmployeeData.length > 0) {
        return rawEmployeeData;
    }
    const response = await fetch(`/DashboardProspectCall/GetEmployeeList`);
    if (!response.ok) throw new Error("Network response was not ok");
    const res = await response.json();
    rawEmployeeData = Array.isArray(res) ? res : [];
    return rawEmployeeData;
}

async function setFilterEmployee(){
    try {
        const items = await getEmployeeList();
        const filterEmployee = document.getElementById('filterCaller');
        if (!filterEmployee) return;

        const hasFcrm006 = hasPermissionFCRM006();
        const isLockedCaller = !hasFcrm006 || (window.HAS_RCRM014 && Boolean(window.USER_PERSONAL_ID));
        const userPersonalId = (window.USER_PERSONAL_ID || '').toString().trim();

        if (isLockedCaller && userPersonalId) {
            const matchedEmp = items.find(obj => {
                if (!obj) return false;
                const code = (obj.personnel_code || obj.code || obj.personnel_id || obj.emp_code || "").trim();
                return code === userPersonalId;
            });

            let labelText = userPersonalId;
            if (matchedEmp) {
                const firstName = (matchedEmp.personnel_name_TH || matchedEmp.personnel_name || matchedEmp.first_name || "").trim();
                const lastName = (matchedEmp.personnel_last_TH || matchedEmp.personnel_last || matchedEmp.last_name || "").trim();
                const nameTh = (matchedEmp.thname || `${firstName} ${lastName}`).trim();
                labelText = (nameTh && !nameTh.includes(userPersonalId)) ? `${userPersonalId} - ${nameTh}` : (nameTh || userPersonalId);
            }

            filterEmployee.innerHTML = `<option value="${userPersonalId}">${labelText}</option>`;
            $(filterEmployee).val(userPersonalId);
            $(filterEmployee).prop('disabled', true);

            if (typeof $.fn !== 'undefined' && $.fn.select2) {
                $(filterEmployee).select2({
                    theme: 'bootstrap-5',
                    width: '100%',
                    language: {
                        noResults: function () {
                            return "ไม่พบข้อมูล";
                        }
                    }
                });
                $(filterEmployee).trigger('change');
            }
            return;
        }

        const selectedBranchVal = ($('#filterBranch').val() || '').trim();
        const selectedOption = document.querySelector('#filterBranch option:checked');
        const selectedBranchText = (selectedOption ? selectedOption.textContent : '').trim();

        let cleanBranchName = "";
        if (selectedBranchText && selectedBranchText !== "ทั้งหมด") {
            cleanBranchName = selectedBranchText.includes('-')
                ? selectedBranchText.split('-').slice(1).join('-').trim()
                : selectedBranchText.trim();
        }

        const filteredItems = cleanBranchName
            ? items.filter(obj => {
                if (!obj) return false;
                const empBranch = (obj.branch || obj.branch_name_th || obj.branch_name || obj.Branch || obj.BranchNameTH || '').trim();
                const empBranchNo = (obj.branch_no || obj.offcde || obj.branch_code || obj.BranchNo || '').trim();
                return (empBranch && (empBranch === cleanBranchName || empBranch.includes(cleanBranchName))) ||
                       (empBranchNo && (empBranchNo === selectedBranchVal || empBranchNo === cleanBranchName));
            })
            : items;

        const optionsHtml = ['<option value="">ทั้งหมด</option>'].concat(
            filteredItems.map(obj => {
                const code = (obj.personnel_code || obj.code || obj.personnel_id || obj.emp_code || "").trim();
                const firstName = (obj.personnel_name_TH || obj.personnel_name || obj.first_name || "").trim();
                const lastName = (obj.personnel_last_TH || obj.personnel_last || obj.last_name || "").trim();
                const nameTh = (obj.thname || `${firstName} ${lastName}`).trim();
                const labelText = (code && nameTh && code !== nameTh && !nameTh.includes(code)) 
                    ? `${code} - ${nameTh}` 
                    : (nameTh || code);
                return `<option value="${code}">${labelText}</option>`;
            })
        ).join('');

        const currentVal = $(filterEmployee).val() || '';
        filterEmployee.innerHTML = optionsHtml;
        $(filterEmployee).prop('disabled', false);

        if (typeof $.fn !== 'undefined' && $.fn.select2) {
            $(filterEmployee).select2({
                theme: 'bootstrap-5',
                width: '100%',
                language: {
                    noResults: function () {
                        return "ไม่พบข้อมูล";
                    }
                }
            });
            if (currentVal && $(filterEmployee).find(`option[value="${CSS.escape(currentVal)}"]`).length > 0) {
                $(filterEmployee).val(currentVal).trigger('change');
            } else {
                $(filterEmployee).val('').trigger('change');
            }
        }
    } catch (err) {
        console.error("Error setting filter employee:", err);
    }
}

let isCallExcelExporting = false;

async function exportCallExcel() {
    if (!validateDateRange()) return;
    if (isCallExcelExporting) return;
    isCallExcelExporting = true;

    if (typeof startLoading === 'function') {
        startLoading('กำลังส่งออกข้อมูล Excel...', 'กรุณารอสักครู่');
    }

    try {
        const hasFcrm006 = hasPermissionFCRM006();
        const isLockedCaller = !hasFcrm006 || (window.HAS_RCRM014 && Boolean(window.USER_PERSONAL_ID));

        const startDate = $('#filterStartDate').val() || '';
        const endDate = $('#filterEndDate').val() || '';
        const callType = $('#filterCallType').val() || '';
        const branch = $('#filterBranch').val() || '';
        let callBy = $('#filterCaller').val() || '';
        if (isLockedCaller && window.USER_PERSONAL_ID) {
            callBy = String(window.USER_PERSONAL_ID).trim();
        }
        const campaignName = $('#filterCampaign').val() || '';
        const callResult = $('#filterCallResult').val() || '';

        const params = new URLSearchParams();
        if (startDate) params.append('startdate', startDate);
        if (endDate) params.append('enddate', endDate);
        if (callType) params.append('call_type', callType);
        if (branch) params.append('branch', branch);
        if (callBy) params.append('call_by', callBy);
        if (callResult) params.append('call_result', callResult);
        if (campaignName) params.append('campaign_name', campaignName);

        const queryString = params.toString();
        const url = `/DashboardProspectCall/GetCallDashboardExcel${queryString ? '?' + queryString : ''}`;
        const historyUrl = `/DashboardProspectCall/GetHistoryCallDashboardExcel${queryString ? '?' + queryString : ''}`;

        const [response, historyResponse] = await Promise.all([
            fetch(url),
            fetch(historyUrl)
        ]);

        const extractRows = (data) => {
            if (!data) return [];
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (e) {}
            }
            if (Array.isArray(data)) return data;
            if (data.data) {
                if (Array.isArray(data.data)) return data.data;
                if (data.data.table && Array.isArray(data.data.table)) return data.data.table;
                if (data.data.data && Array.isArray(data.data.data)) return data.data.data;
                if (data.data.result && Array.isArray(data.data.result)) return data.data.result;
            }
            if (data.table && Array.isArray(data.table)) return data.table;
            if (data.result && Array.isArray(data.result)) return data.result;
            return [];
        };

        let exportRows = [];
        if (response.ok) {
            const res = await response.json();
            exportRows = extractRows(res);
        }

        let historyExportRows = [];
        if (historyResponse.ok) {
            const historyRes = await historyResponse.json();
            historyExportRows = extractRows(historyRes);
        }

        if ((!exportRows || exportRows.length === 0) && (!historyExportRows || historyExportRows.length === 0)) {
            if (typeof stopLoading === 'function') {
                stopLoading(true);
            }
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'info',
                    title: 'ไม่พบข้อมูล',
                    text: 'ไม่มีข้อมูลสำหรับการส่งออก Excel ตามตัวกรองที่เลือก',
                    confirmButtonText: 'ตกลง'
                });
            } else {
                alert('ไม่มีข้อมูลสำหรับการส่งออก Excel');
            }
            return;
        }

        const headers = [
            { title: 'product_code', keys: ['product_code', 'รหัส แคมเปญ', 'รหัส Campaign'], width: 18, align: 'center' },
            { title: 'idno', keys: ['idno'], width: 20, align: 'center' },
            { title: 'nameCus', keys: ['nameCus'], width: 25, align: 'left' },
            { title: 'contno', keys: ['contno'], width: 18, align: 'center' },
            { title: 'contractoffcde', keys: ['contractoffcde'], width: 18, align: 'center' },
            { title: 'company', keys: ['company'], width: 15, align: 'center' },
            { title: 'phone', keys: ['phone'], width: 18, align: 'center' },
            { title: 'เบอร์โทรศัพท์ 2', keys: ['เบอร์โทรศัพท์ 2'], width: 18, align: 'center' },
            { title: 'ที่อยู่ปัจจุบัน', keys: ['ที่อยู่ปัจจุบัน'], width: 35, align: 'left' },
            { title: 'จังหวัดที่อยู่ปัจจุบัน', keys: ['จังหวัดที่อยู่ปัจจุบัน'], width: 20, align: 'center' },
            { title: 'ชื่อสาขาเดิม', keys: ['ชื่อสาขาเดิม'], width: 20, align: 'center' },
            { title: 'category', keys: ['category'], width: 18, align: 'center' },
            { title: 'brand', keys: ['brand'], width: 15, align: 'center' },
            { title: 'carStype', keys: ['carStype'], width: 18, align: 'center' },
            { title: 'ประเภทสัญญา', keys: ['ประเภทสัญญา'], width: 20, align: 'center' },
            { title: 'วันที่เปิดสัญญา', keys: ['วันที่เปิดสัญญา'], width: 18, align: 'center', isDate: true },
            { title: 'วันที่ปิดสัญญา', keys: ['วันที่ปิดสัญญา'], width: 18, align: 'center', isDate: true },
            { title: 'สถานะปัจจุบัน', keys: ['สถานะปัจจุบัน'], width: 18, align: 'center' },
            { title: 'ค่างวด', keys: ['ค่างวด'], width: 15, align: 'right' },
            { title: 'term', keys: ['term'], width: 12, align: 'center' },
            { title: 'termpaid', keys: ['termpaid'], width: 12, align: 'center' },
            { title: 'total_ovd', keys: ['total_ovd'], width: 15, align: 'center' },
            { title: 'Customer Group', keys: ['Customer Group', 'customer_group'], width: 18, align: 'center' },
            { title: 'จัดกลุ่มลูกค้า', keys: ['จัดกลุ่มลูกค้า'], width: 18, align: 'center' },
            { title: 'Customer Grade', keys: ['Customer Grade', 'customer_grade'], width: 18, align: 'center' },
            { title: 'Customer Grade MIB', keys: ['Customer Grade MIB', 'customer_grade_mib'], width: 20, align: 'center' },
            { title: 'AR-Net', keys: ['AR-Net', 'ar_net'], width: 18, align: 'center' },
            { title: 'Aging CF', keys: ['Aging CF', 'aging_cf'], width: 18, align: 'center' },
            { title: 'ประเภทประกัน', keys: ['ประเภทประกัน'], width: 20, align: 'center' },
            { title: 'เลขที่กรมธรรม์', keys: ['เลขที่กรมธรรม์'], width: 20, align: 'center' },
            { title: 'วันที่สิ้นสุดกรมธรรม์', keys: ['วันที่สิ้นสุดกรมธรรม์'], width: 20, align: 'center', isDate: true },
            { title: 'ปีต่ออายุ', keys: ['ปีต่ออายุ'], width: 15, align: 'center' },
            { title: 'วัตถุประสงค์', keys: ['วัตถุประสงค์'], width: 35, align: 'center' },
            { title: 'วันที่ Call Report', keys: ['วันที่ Call Report'], width: 18, align: 'center', isDate: true },
            { title: 'ผลการติดต่อ', keys: ['ผลการติดต่อ'], width: 25, align: 'center' },
            { title: 'รายงานผล', keys: ['รายงานผล'], width: 20, align: 'center' },
            { title: 'อธิบายผลการติดต่อ', keys: ['อธิบายผลการติดต่อ'], width: 30, align: 'center' },
            { title: 'Status Lead', keys: ['Status Lead', 'status_lead'], width: 15, align: 'center' },
            { title: 'ผู้ดูแล Lead', keys: ['ผู้ดูแล Lead'], width: 20, align: 'center' }
        ];

        const historyHeaders = [...headers];

        const todayStr = new Date().toISOString().slice(0, 10);

        const getVal = (row, keyList, isDate = false) => {
            if (!row || typeof row !== 'object') return '';
            let raw = undefined;
            for (const k of keyList) {
                if (row[k] !== undefined && row[k] !== null) {
                    raw = row[k];
                    break;
                }
            }
            if (raw === undefined || raw === null) {
                const rowKeys = Object.keys(row);
                for (const k of keyList) {
                    const target = k.trim().toLowerCase();
                    const foundKey = rowKeys.find(rk => rk.trim().toLowerCase() === target);
                    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                        raw = row[foundKey];
                        break;
                    }
                }
            }
            if (raw === undefined || raw === null) return '';
            if (isDate) {
                if (!raw) return '';
                const d = new Date(raw);
                if (!isNaN(d.getTime())) {
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const y = d.getFullYear();
                    return `${day}/${m}/${y}`;
                }
                return String(raw);
            }
            return String(raw);
        };

        const fileName = `Prospect_Call_Report_${todayStr}.xlsx`;

        if (typeof XLSX !== 'undefined') {
            const createWorksheet = (rows, headerList) => {
                const sheetData = [headerList.map(h => h.title)];
                const rowHeights = [{ hpt: 28 }];

                rows.forEach(row => {
                    const rowData = headerList.map(h => getVal(row, h.keys, h.isDate));
                    sheetData.push(rowData);
                    rowHeights.push({ hpt: 22 });
                });

                const ws = XLSX.utils.aoa_to_sheet(sheetData);
                ws['!cols'] = headerList.map(h => ({ wch: h.width || 20 }));
                ws['!rows'] = rowHeights;

                const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                        if (!ws[cellRef]) continue;

                        const isHeader = (R === 0);
                        const isOddRow = (R % 2 === 1);
                        const align = headerList[C]?.align || 'left';
                        const val = String(ws[cellRef].v || '');

                        let customBg = isOddRow ? "F4F9F5" : "FFFFFF";
                        let fontBold = false;
                        if (!isHeader && (val === 'ไปตามLead' || val === 'Fee Text')) {
                            customBg = "FEF08A";
                            fontBold = true;
                        }

                        if (isHeader) {
                            ws[cellRef].s = {
                                fill: { fgColor: { rgb: "1D6F42" } },
                                font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
                                alignment: { horizontal: "center", vertical: "center", wrapText: true },
                                border: {
                                    top: { style: "thin", color: { rgb: "144D2E" } },
                                    bottom: { style: "thin", color: { rgb: "144D2E" } },
                                    left: { style: "thin", color: { rgb: "144D2E" } },
                                    right: { style: "thin", color: { rgb: "144D2E" } }
                                }
                            };
                        } else {
                            ws[cellRef].s = {
                                fill: { fgColor: { rgb: customBg } },
                                font: { name: "Segoe UI", sz: 9.5, bold: fontBold, color: { rgb: "000000" } },
                                alignment: { horizontal: align, vertical: "center", wrapText: true },
                                border: {
                                    top: { style: "thin", color: { rgb: "D0D7DE" } },
                                    bottom: { style: "thin", color: { rgb: "D0D7DE" } },
                                    left: { style: "thin", color: { rgb: "D0D7DE" } },
                                    right: { style: "thin", color: { rgb: "D0D7DE" } }
                                }
                            };
                        }
                    }
                }
                return ws;
            };

            const wb = XLSX.utils.book_new();
            const ws1 = createWorksheet(exportRows, headers);
            const ws2 = createWorksheet(historyExportRows, historyHeaders);

            XLSX.utils.book_append_sheet(wb, ws1, "Call Report");
            XLSX.utils.book_append_sheet(wb, ws2, "History Call");

            XLSX.writeFile(wb, fileName);
        } else {
            const fallbackFileName = `Prospect_Call_Report_${todayStr}.xls`;
            const escapeXml = (str) => {
                if (!str) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/\r?\n/g, '<br style="mso-data-placement:same-cell;"/>');
            };

            let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <!--[if gte mso 9]>
            <xml>
            <x:ExcelWorkbook>
            <x:ExcelWorksheets>
            <x:ExcelWorksheet>
                <x:Name>Call Report</x:Name>
                <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                </x:WorksheetOptions>
            </x:ExcelWorksheet>
            <x:ExcelWorksheet>
                <x:Name>History Call</x:Name>
                <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                </x:WorksheetOptions>
            </x:ExcelWorksheet>
            </x:ExcelWorksheets>
            </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table {
                    border-collapse: collapse;
                    width: 100%;
                    font-family: 'Segoe UI', Tahoma, 'Prompt', sans-serif;
                    font-size: 10pt;
                }
                th {
                    background-color: #1d6f42 !important;
                    color: #ffffff !important;
                    font-weight: bold;
                    text-align: center;
                    vertical-align: middle;
                    height: 38px;
                    border: 1px solid #144d2e;
                    padding: 8px 12px;
                    white-space: nowrap;
                }
                td {
                    vertical-align: middle;
                    border: 1px solid #d0d7de;
                    padding: 8px 12px;
                    mso-number-format: "\\@";
                }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
            </style>
            </head>
            <body>
            <table>
            <thead>
                <tr>
            `;

            headers.forEach(h => {
                html += `        <th style="background-color: #1d6f42; color: #ffffff;">${escapeXml(h.title)}</th>\n`;
            });

            html += `    </tr>
            </thead>
            <tbody>
            `;

            exportRows.forEach((row, index) => {
                const rowBg = (index % 2 === 1) ? 'background-color: #f4f9f5;' : 'background-color: #ffffff;';
                html += `    <tr style="${rowBg}">\n`;
                headers.forEach(h => {
                    const val = getVal(row, h.keys, h.isDate);
                    const alignClass = h.align === 'center' ? 'text-center' : (h.align === 'right' ? 'text-right' : 'text-left');
                    
                    let customStyle = '';
                    if (val === 'ไปตามLead' || val === 'Fee Text') {
                        customStyle = ' background-color: #fef08a !important; font-weight: bold;';
                    }

                    html += `        <td class="${alignClass}" style="${customStyle}">${escapeXml(val)}</td>\n`;
                });
                html += `    </tr>\n`;
            });

            html += `</tbody>
            </table>
            <table>
            <thead>
                <tr>
            `;

            historyHeaders.forEach(h => {
                html += `        <th style="background-color: #1d6f42; color: #ffffff;">${escapeXml(h.title)}</th>\n`;
            });

            html += `    </tr>
            </thead>
            <tbody>
            `;

            historyExportRows.forEach((row, index) => {
                const rowBg = (index % 2 === 1) ? 'background-color: #f4f9f5;' : 'background-color: #ffffff;';
                html += `    <tr style="${rowBg}">\n`;
                historyHeaders.forEach(h => {
                    const val = getVal(row, h.keys, h.isDate);
                    const alignClass = h.align === 'center' ? 'text-center' : (h.align === 'right' ? 'text-right' : 'text-left');
                    
                    let customStyle = '';
                    if (val === 'ไปตามLead' || val === 'Fee Text') {
                        customStyle = ' background-color: #fef08a !important; font-weight: bold;';
                    }

                    html += `        <td class="${alignClass}" style="${customStyle}">${escapeXml(val)}</td>\n`;
                });
                html += `    </tr>\n`;
            });

            html += `</tbody>
            </table>
            </body>
            </html>`;

            const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fallbackFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

    } catch (err) {
        console.error("Error exporting call excel:", err);
        if (typeof stopLoading === 'function') {
            stopLoading(true);
        }
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถส่งออกข้อมูล Excel ได้: ' + err.message,
                confirmButtonText: 'ตกลง'
            });
        }
    } finally {
        if (typeof stopLoading === 'function') {
            stopLoading(true);
        }
        isCallExcelExporting = false;
    }
}

$(document).ready(async function () {
    if (typeof startLoading === 'function') {
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    }
    try {
        if (typeof $.fn !== 'undefined' && $.fn.select2) {
            $('.select2-filter').select2({
                theme: 'bootstrap-5',
                width: '100%',
                language: {
                    noResults: function () {
                        return "ไม่พบข้อมูล";
                    }
                }
            });

            $(document).on('select2:open', () => {
                setTimeout(() => {
                    const searchInput = document.querySelector('.select2-container--open .select2-search__field');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }, 10);
            });
        }

        bindDateRangeEvents();
        updateTopCallersVisibility();

        await setFilterCallType();
        await setFilterBranch();
        await setFilterCallResult();
        await setFilterEmployee();
        await setDashboard();

        $('#filterBranch').on('change', function () {
            setFilterEmployee();
        });

    } catch (error) {
        console.error("Error in document ready:", error);
    } finally {
        if (typeof stopLoading === 'function') {
            stopLoading();
        }
    }
});

$("#btnSearchFilter").off("click").on("click", async function (e) {
    if (e) e.preventDefault();
    await applyFilters();
});

$("#btnResetFilter").off("click").on("click", async function (e) {
    if (e) e.preventDefault();
    await resetFilters();
});

$("#btnExportExcel").off("click").on("click", async function (e) {
    if (e) e.preventDefault();
    await exportCallExcel();
});