// Dashboard Suggestion & Complaint Logic

let topicBarChartInstance = null;
let statusDoughnutChartInstance = null;
let rawDashboardData = null;

let currentTableData = [];
let currentPage = 1;
let pageSize = 10;

const statusColors = {
    'Pending': '#f59e0b',
    'Forward': '#0284c7',
    'Reply': '#8b5cf6',
    'Close': '#10b981'
};

async function safeFetchJson(url, options) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            console.error(`Fetch error HTTP ${response.status} for ${url}: ${response.statusText}`);
            return null;
        }
        const text = await response.text();
        if (!text || !text.trim()) {
            console.warn(`Empty response body received from ${url}`);
            return null;
        }
        return JSON.parse(text);
    } catch (e) {
        console.error(`Failed to parse JSON from ${url}:`, e);
        return null;
    }
}

function isBranchInVariableFunc(branchItem, variableFunc) {
    if (!variableFunc || typeof variableFunc !== 'string' || !variableFunc.trim()) return false;
    const allowed = variableFunc.split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length === 0) return false;

    const code = String(branchItem.e_mail || branchItem.email || branchItem.Email || branchItem.offcde || branchItem.branch_code || branchItem.branch_no || branchItem.code || branchItem.name || branchItem.branch || '').trim();
    const name = String(branchItem.name || branchItem.Name || branchItem.branch_name || branchItem.branchName || branchItem.groupName || '').trim();
    const branch = String(branchItem.branch || branchItem.Branch || branchItem.sendToGroupFull || branchItem.sendToPersonAbb || '').trim();

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

        const checkName = (str) => {
            if (!str) return false;
            if (str.startsWith(target + '-') || str.startsWith(target + ' -') || str.startsWith(target + ' ') ||
                str.startsWith(targetPad + '-') || str.startsWith(targetPad + ' -') || str.startsWith(targetPad + ' ') ||
                str.includes('(' + target + ')') || str.includes('(' + targetPad + ')') ||
                str === target || str === targetPad) {
                return true;
            }
            const match = str.match(/^0*(\d+)/);
            if (match && targetClean && match[1] === targetClean) {
                return true;
            }
            return false;
        };

        if (checkName(name) || checkName(branch)) {
            return true;
        }

        return false;
    });
}

async function setFilterBranch(branchData) {
    const selectEl = document.getElementById('filterBranch');
    if (!selectEl) return;

    let items = [];
    if (Array.isArray(branchData) && branchData.length > 0) {
        items = branchData;
    } else if (branchData && Array.isArray(branchData.data) && branchData.data.length > 0) {
        items = branchData.data;
    } else if (branchData && (Array.isArray(branchData.group) || Array.isArray(branchData.personalAbb))) {
        const group = Array.isArray(branchData.group) ? branchData.group : [];
        const personalAbb = Array.isArray(branchData.personalAbb) ? branchData.personalAbb : [];
        items = [...group, ...personalAbb];
    } else {
        try {
            const res = await safeFetchJson('/DashboardSuggestion/GetPersonalAndGroup');
            if (res) {
                const group = Array.isArray(res.group) ? res.group : [];
                const personalAbb = Array.isArray(res.personalAbb) ? res.personalAbb : [];
                items = [...group, ...personalAbb];
            }
            if (items.length === 0) {
                const bRes = await safeFetchJson('/Home/getBranchListForCRM');
                if (Array.isArray(bRes)) {
                    items = bRes;
                }
            }
        } catch (e) {
            console.error("Error fetching branch list fallback:", e);
        }
    }

    const currentValue = $(selectEl).val() || selectEl.value || '';
    const variableFunc = (typeof window.VARIABLE_FUNC === 'string') ? window.VARIABLE_FUNC.trim() : '';

    let validItems = [];
    if (variableFunc && items.length > 0) {
        validItems = items.filter(item => isBranchInVariableFunc(item, variableFunc));
    }

    let optionsHtml = '';
    if (validItems.length > 0) {
        optionsHtml = '<option value="">ทั้งหมด</option>';
        const seenValues = new Set();

        validItems.forEach(item => {
            if (!item) return;

            const code = String(item.e_mail || item.email || item.Email || item.offcde || item.branch_code || item.branch_no || item.code || item.name || item.branch || '').trim();
            const name = String(item.name || item.Name || item.branch_name || item.branchName || item.groupName || '').trim();
            const branch = String(item.branch || item.Branch || item.sendToGroupFull || item.sendToPersonAbb || '').trim();

            if (!code && !name && !branch) return;

            const val = code || name || branch;
            if (seenValues.has(val)) return;
            seenValues.add(val);

            let displayName = '';
            if (name && branch && name !== branch) {
                displayName = `${name} (${branch})`;
            } else if (name) {
                displayName = name;
            } else if (branch) {
                displayName = branch;
            } else {
                displayName = val;
            }

            optionsHtml += `<option value="${val}">${displayName}</option>`;
        });
    }

    selectEl.innerHTML = optionsHtml;

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
    }

    if (currentValue && $(selectEl).find(`option[value="${currentValue}"]`).length > 0) {
        $(selectEl).val(currentValue).trigger('change');
    } else if (variableFunc && selectEl.options.length > 1 && validItems.length !== items.length) {
        $(selectEl).val(selectEl.options[1].value).trigger('change');
    } else if (selectEl.options.length > 0) {
        $(selectEl).val(selectEl.options[0].value).trigger('change');
    }
}

async function setFilterprovider (data){
    try {
        const filterProvider = document.getElementById('filterProvider');
        if (!filterProvider) return;
        
        const items = data && Array.isArray(data.data) 
            ? data.data 
            : (Array.isArray(data) ? data : []);
        const currentValue = $(filterProvider).val() || filterProvider.value || '';
        let optionsHtml = '<option value="">ทั้งหมด</option>';
        const seenValues = new Set();

        items.forEach(obj => {
            if (!obj) return;
            const code = String(obj.e_mail || obj.email || obj.Email || obj.code || obj.name || '').trim();
            const name = String(obj.name || obj.Name || '').trim();
            const branch = String(obj.branch || obj.Branch || '').trim();

            if (!code && !name && !branch) return;

            const val = code || name || branch;
            if (seenValues.has(val)) return;
            seenValues.add(val);

            let displayName = '';
            if (name && branch && name !== branch) {
                displayName = `${name} (${branch})`;
            } else if (name) {
                displayName = name;
            } else if (branch) {
                displayName = branch;
            } else {
                displayName = val;
            }

            optionsHtml += `<option value="${val}">${displayName}</option>`;
        });

        filterProvider.innerHTML = optionsHtml;
        if (typeof $.fn !== 'undefined' && $.fn.select2) {
            $(filterProvider).select2({
                theme: 'bootstrap-5',
                width: '100%',
                language: {
                    noResults: function () {
                        return "ไม่พบข้อมูล";
                    }
                }
            });
        }
        if (currentValue && $(filterProvider).find(`option[value="${currentValue}"]`).length > 0) {
            $(filterProvider).val(currentValue).trigger('change');
        }
    } catch (e) {
        console.error("Error setting filter provider:", e);
    }
}

async function setFilterTitle (data){
    const filterTitle = document.getElementById('filterTopic');
    if (!filterTitle) return;
    const items = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    const currentValue = $(filterTitle).val() || filterTitle.value || '';

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    items.forEach(obj => {        
        const code = obj.count;    
        const name = obj.name || "";
        if (name) {
            optionsHtml += `<option value="0${code}">${name}</option>`;
        }
    });
    filterTitle.innerHTML = optionsHtml;
    if (typeof $.fn !== 'undefined' && $.fn.select2) {
        $(filterTitle).select2({
            theme: 'bootstrap-5',
            width: '100%',
            language: {
                noResults: function () {
                    return "ไม่พบข้อมูล";
                }
            }
        });
    }
    if (currentValue) {
        $(filterTitle).val(currentValue).trigger('change');
    }
}

async function setFilterStatus (data){
    const filterStatus = document.getElementById('filterStatus');
    if (!filterStatus) return;
    const items = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    const currentValue = $(filterStatus).val() || filterStatus.value || '';

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    items.forEach(obj => {                
        const name = obj.name || obj.status || "";
        if (name) {
            optionsHtml += `<option value="${name}">${name}</option>`;
        }
    });
    filterStatus.innerHTML = optionsHtml;
    if (typeof $.fn !== 'undefined' && $.fn.select2) {
        $(filterStatus).select2({
            theme: 'bootstrap-5',
            width: '100%',
            language: {
                noResults: function () {
                    return "ไม่พบข้อมูล";
                }
            }
        });
    }
    if (currentValue) {
        $(filterStatus).val(currentValue).trigger('change');
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

function renderEmptySuggestionDashboard() {
    renderOverview([]);
    initTopicBarChart([]);
    initStatusDoughnutChart([]);
    currentTableData = [];
    currentPage = 1;
    renderSuggestionTable();
}

async function setDashboard() {
    if (!validateDateRange()) return;

    const variableFunc = (typeof window.VARIABLE_FUNC === 'string') ? window.VARIABLE_FUNC.trim() : '';
    const branchEl = document.getElementById('filterBranch');
    if (!variableFunc || !branchEl || branchEl.options.length === 0) {
        renderEmptySuggestionDashboard();
        return;
    }

    const startDate = $('#filterStartDate').val() || '';
    const endDate = $('#filterEndDate').val() || '';
    const branch = $('#filterBranch').val() || '';
    const provider = $('#filterProvider').val() || '';
    const topic = $('#filterTopic').val() || '';
    const status = $('#filterStatus').val() || '';

    const params = new URLSearchParams();
    if (startDate) params.append('startdate', startDate);
    if (endDate) params.append('enddate', endDate);
    if (branch) params.append('branch', branch);
    if (provider) params.append('provider', provider);
    if (topic) params.append('title', topic);
    if (status) params.append('status', status);

    const queryString = params.toString();
    const url = `/DashboardSuggestion/GetSuggestionDashboard${queryString ? '?' + queryString : ''}`;

    const jsonResult = await safeFetchJson(url);
    if (!jsonResult) return;

    // Support both root payload and wrapped data payload
    const data = (jsonResult && jsonResult.data && typeof jsonResult.data === 'object' && !Array.isArray(jsonResult.data))
        ? jsonResult.data
        : jsonResult;

    rawDashboardData = data;

    if (data.statusMenu) await setFilterStatus(data.statusMenu);
    if (data.titleMenu) await setFilterTitle(data.titleMenu);

    const graph = data.graph || {};
    const table = data.table || (Array.isArray(data) ? data : (data.data || []));

    currentTableData = Array.isArray(table) ? table : [];
    currentTableData.sort((a, b) => {
        const timeA = a.FirstUpdDate ? new Date(a.FirstUpdDate).getTime() : 0;
        const timeB = b.FirstUpdDate ? new Date(b.FirstUpdDate).getTime() : 0;
        return timeB - timeA;
    });

    renderOverview(graph.overAll || graph.graphStatus || graph.status || []);
    initTopicBarChart(graph.graphTitle || graph.topic || []);
    initStatusDoughnutChart(graph.graphStatus || graph.overAll || graph.status || []);

    currentPage = 1;
    renderSuggestionTable();
}

function renderOverview(overAllData) {
    let pending = 0;
    let forward = 0;
    let reply = 0;
    let close = 0;

    overAllData.forEach(item => {
        const name = (item.name || '').trim().toLowerCase();
        const count = Number(item.count || 0);

        if (name === 'pending') pending = count;
        else if (name === 'forward') forward = count;
        else if (name === 'reply') reply = count;
        else if (name === 'close') close = count;
    });

    const total = pending + forward + reply + close;

    const elTotal = document.getElementById('statTotalCount');
    const elPending = document.getElementById('statPendingCount');
    const elForward = document.getElementById('statForwardCount');
    const elReply = document.getElementById('statReplyCount');
    const elClose = document.getElementById('statCloseCount');

    if (elTotal) elTotal.innerText = total.toLocaleString();
    if (elPending) elPending.innerText = pending.toLocaleString();
    if (elForward) elForward.innerText = forward.toLocaleString();
    if (elReply) elReply.innerText = reply.toLocaleString();
    if (elClose) elClose.innerText = close.toLocaleString();
}

function initTopicBarChart(topicData) {
    const ctx = document.getElementById('topicBarChart');
    if (!ctx) return;

    if (topicBarChartInstance) {
        topicBarChartInstance.destroy();
    }

    // Sort descending by count (มากไปน้อย)
    const sortedTopicData = [...(topicData || [])].sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0));

    const labels = sortedTopicData.map(item => item.name || '');
    const counts = sortedTopicData.map(item => item.count || 0);

    const barColors = [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#8b5cf6',
        '#64748b'
    ];

    topicBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวนรายการ',
                data: counts,
                backgroundColor: labels.map((_, i) => barColors[i % barColors.length]),
                borderRadius: 6,
                barThickness: 28
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
                            return ` จำนวน: ${context.raw} รายการ`;
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

function initStatusDoughnutChart(statusData) {
    const ctx = document.getElementById('statusDoughnutChart');
    if (!ctx) return;

    if (statusDoughnutChartInstance) {
        statusDoughnutChartInstance.destroy();
    }

    const labels = statusData.map(item => item.name || '');
    const counts = statusData.map(item => item.count || 0);
    const total = counts.reduce((a, b) => a + b, 0);

    const elTotal = document.getElementById('doughnutTotalCount');
    if (elTotal) elTotal.innerText = total.toLocaleString();

    const getStatusColor = (name) => {
        const key = Object.keys(statusColors).find(k => k.toLowerCase() === (name || '').trim().toLowerCase());
        return key ? statusColors[key] : (statusColors[name] || '#94a3b8');
    };

    const colors = labels.map(name => getStatusColor(name));

    statusDoughnutChartInstance = new Chart(ctx, {
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
                            return ` ${context.label}: ${pct}% (${context.raw})`;
                        }
                    }
                }
            }
        }
    });

    // Custom HTML Legend
    const legendContainer = document.getElementById('statusLegend');
    if (legendContainer) {
        let legendHtml = '';
        statusData.forEach(item => {
            const name = item.name || '';
            const count = item.count || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = getStatusColor(name);

            legendHtml += `
                <div class="d-flex align-items-center mb-1.5 extra-small">
                    <span class="d-inline-block rounded-circle me-2" style="width: 10px; height: 10px; background-color: ${color};"></span>
                    <span class="fw-bold text-dark me-2" style="min-width: 55px;">${name}</span>
                    <span class="text-muted me-1">${pct}%</span>
                    <span class="text-secondary fw-semibold">(${count})</span>
                </div>
            `;
        });
        legendContainer.innerHTML = legendHtml;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    if (typeof dateStr === 'string') {
        const str = dateStr.trim();
        if (!str || str === '-' || str === 'null' || str === 'undefined' || str.startsWith('0001-01-01')) return '-';

        const isoMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
        if (isoMatch) {
            const year = isoMatch[1];
            const month = isoMatch[2];
            const day = isoMatch[3];
            const hours = isoMatch[4];
            const minutes = isoMatch[5];

            if (hours !== undefined && minutes !== undefined) {
                return `${day}/${month}/${year} ${hours}:${minutes}`;
            }
            return `${day}/${month}/${year}`;
        }

        if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
            return str;
        }
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function renderSuggestionTable() {
    const tbody = document.getElementById('suggestionTableBody');
    const infoEl = document.getElementById('tableInfoText');
    const paginationEl = document.getElementById('tablePagination');

    if (!tbody) return;

    const totalItems = currentTableData.length;
    if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4 small">ไม่พบข้อมูลข้อเสนอแนะ / ร้องเรียน</td></tr>`;
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
        const firstUpdStr = formatDate(row.FirstUpdDate);
        const lastUpdStr = formatDate(row.LastUpdDate);

        const suggesDesc = row.suggesDesc || '-';
        const nameCus = row.nameCus || '-';
        const provider = row.sendToPerson || row.sendToGroupAbb || '-';
        const branch = row.sendToPersonAbb || row.sendToGroupFull || '-';

        const status = String(row.StatusTask);
        let statusBadge = '<span class="badge bg-secondary">Unknown</span>';
        const statusLower = status.toLowerCase();

        if (statusLower === 'pending') {
            statusBadge = `<span class="badge badge-status-pending px-2.5 py-1 rounded-pill">Pending</span>`;
        } else if (statusLower === 'forward') {
            statusBadge = `<span class="badge badge-status-forward px-2.5 py-1 rounded-pill">Forward</span>`;
        } else if (statusLower === 'reply') {
            statusBadge = `<span class="badge badge-status-reply px-2.5 py-1 rounded-pill">Reply</span>`;
        } else if (statusLower === 'close') {
            statusBadge = `<span class="badge badge-status-close px-2.5 py-1 rounded-pill">Close</span>`;
        } else if (status) {
            statusBadge = `<span class="badge bg-light text-dark border px-2.5 py-1 rounded-pill">${status}</span>`;
        }

        const rawDay = row.Day !== undefined && row.Day !== null ? row.Day : (row.day !== undefined && row.day !== null ? row.day : null);
        const days = rawDay !== null ? `${rawDay} วัน` : '-';

        rowsHtml += `
            <tr>
                <td class="text-muted extra-small">${firstUpdStr}</td>
                <td class="fw-medium text-dark">${suggesDesc}</td>
                <td class="text-dark">${nameCus}</td>
                <td class="text-dark small">${provider}</td>
                <td class="text-muted small">${branch}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-muted extra-small">${lastUpdStr}</td>
                <td class="text-center fw-semibold text-secondary small">${days}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;

    if (infoEl) {
        infoEl.innerText = `แสดง ${startIndex + 1} - ${endIndex} จาก ${totalItems} รายการ`;
    }

    if (paginationEl) {
        let pagHtml = '';
        pagHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="goToPage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></a>
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
                <a class="page-link" href="javascript:void(0)" onclick="goToPage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></a>
            </li>
        `;
        paginationEl.innerHTML = pagHtml;
    }
}

function goToPage(page) {
    currentPage = page;
    renderSuggestionTable();
}

function changePageSize(size) {
    pageSize = Number(size) || 10;
    currentPage = 1;
    renderSuggestionTable();
}

function applySuggestionFilters() {
    if (!rawDashboardData || !rawDashboardData.table) return;

    const topicFilter = (document.getElementById('filterTopic')?.value || '').trim();
    const providerFilter = (document.getElementById('filterProvider')?.value || '').trim();
    const statusFilter = (document.getElementById('filterStatus')?.value || '').trim();
    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;

    let filtered = rawDashboardData.table;

    if (topicFilter) {
        filtered = filtered.filter(item => (item.suggesDesc || '').trim() === topicFilter);
    }
    if (providerFilter) {
        filtered = filtered.filter(item => (item.nameProvider || '').trim() === providerFilter);
    }
    if (statusFilter) {
        filtered = filtered.filter(item => (item.StatusTask || '').trim() === statusFilter);
    }
    if (startDateVal) {
        const start = new Date(startDateVal);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(item => {
            if (!item.FirstUpdDate) return true;
            return new Date(item.FirstUpdDate) >= start;
        });
    }
    if (endDateVal) {
        const end = new Date(endDateVal);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => {
            if (!item.FirstUpdDate) return true;
            return new Date(item.FirstUpdDate) <= end;
        });
    }

    filtered.sort((a, b) => {
        const timeA = a.FirstUpdDate ? new Date(a.FirstUpdDate).getTime() : 0;
        const timeB = b.FirstUpdDate ? new Date(b.FirstUpdDate).getTime() : 0;
        return timeB - timeA;
    });

    currentTableData = filtered;
    currentPage = 1;
    renderSuggestionTable();
}

async function resetSuggestionFilters() {
    $('#filterStartDate').val('').removeAttr('max');
    $('#filterEndDate').val('').removeAttr('min');

    const select2Ids = ['#filterBranch', '#filterProvider', '#filterTopic', '#filterStatus'];
    select2Ids.forEach(id => {
        const $el = $(id);
        if ($el.length) {
            if (id === '#filterBranch') {
                const variableFunc = (typeof window.VARIABLE_FUNC === 'string') ? window.VARIABLE_FUNC.trim() : '';
                if (variableFunc && $el[0].options && $el[0].options.length > 1) {
                    $el.val($el[0].options[1].value);
                    if (typeof $.fn !== 'undefined' && $.fn.select2) {
                        $el.trigger('change');
                    }
                    return;
                } else if ($el[0].options && $el[0].options.length > 0) {
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

    if (rawDashboardData) {
        currentTableData = rawDashboardData.table || [];
        currentPage = 1;
        renderSuggestionTable();
    }
}

let isExportingSuggestionExcel = false;

async function exportSuggestionExcel() {
    if (!validateDateRange()) return;
    if (isExportingSuggestionExcel) return;
    isExportingSuggestionExcel = true;

    if (typeof startLoading === 'function') {
        startLoading('กำลังส่งออกข้อมูล Excel...', 'กรุณารอสักครู่');
    }
    try {
        const startDate = $('#filterStartDate').val() || '';
        const endDate = $('#filterEndDate').val() || '';
        const branch = $('#filterBranch').val() || '';
        const provider = $('#filterProvider').val() || '';
        const topic = $('#filterTopic').val() || '';
        const status = $('#filterStatus').val() || '';

        const params = new URLSearchParams();
        if (startDate) params.append('startdate', startDate);
        if (endDate) params.append('enddate', endDate);
        if (branch) params.append('branch', branch);
        if (provider) params.append('provider', provider);
        if (topic) params.append('title', topic);
        if (status) params.append('status', status);

        const queryString = params.toString();
        const url = `/DashboardSuggestion/GetSuggestionDashboardExcel${queryString ? '?' + queryString : ''}`;

        const res = await safeFetchJson(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        let exportRows = [];
        if (res) {
            if (Array.isArray(res)) {
                exportRows = res;
            } else if (Array.isArray(res.data)) {
                exportRows = res.data;
            } else if (res.data && Array.isArray(res.data.table)) {
                exportRows = res.data.table;
            } else if (res.table && Array.isArray(res.table)) {
                exportRows = res.table;
            }
        }

        if ((!exportRows || exportRows.length === 0) && currentTableData && currentTableData.length > 0) {
            exportRows = currentTableData;
        }

        if (!exportRows || exportRows.length === 0) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'ไม่พบข้อมูล',
                    text: 'ไม่มีข้อมูลสำหรับส่งออก Excel',
                    confirmButtonText: 'ตกลง'
                });
            } else {
                alert('ไม่มีข้อมูลสำหรับส่งออก Excel');
            }
            return;
        }

        const headers = [
            { title: 'วันที่รับเรื่อง', width: 22, align: 'center' },
            { title: 'หัวข้อเรื่อง', width: 28, align: 'center' },
            { title: 'ลูกค้า', width: 28, align: 'center' },
            { title: 'เบอร์โทร', width: 18, align: 'center' },
            { title: 'E-mail', width: 28, align: 'center' },
            { title: 'ที่อยู่/จังหวัด', width: 25, align: 'center' },
            { title: 'ผู้รับผิดชอบ', width: 25, align: 'center' },
            { title: 'CC E-mail', width: 32, align: 'center' },
            { title: 'รายละเอียดข้อเสนอแนะ/ร้องเรียน', width: 45, align: 'center' },
            { title: 'อัปเดทล่าสุด', width: 20, align: 'center' },
            { title: 'Reply / การตอบกลับ', width: 40, align: 'center' },
            { title: 'สถานะ', width: 16, align: 'center' }
        ];

        const todayStr = new Date().toISOString().slice(0, 10);
        const fileName = `Suggestion_Dashboard_Report_${todayStr}.xlsx`;

        if (typeof XLSX !== 'undefined') {
            const sheetData = [headers.map(h => h.title)];
            const rowHeights = [{ hpt: 28 }];

            exportRows.forEach(row => {
                const getVal = (key, fallbackKeys = [], isDate = false) => {
                    let raw = row[key];
                    if (raw === undefined || raw === null) {
                        for (const fbKey of fallbackKeys) {
                            if (row[fbKey] !== undefined && row[fbKey] !== null) {
                                raw = row[fbKey];
                                break;
                            }
                        }
                    }
                    if (raw === undefined || raw === null) return '';
                    if (isDate || (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(raw))) {
                        return formatDate(raw);
                    }
                    return String(raw);
                };

                const dateRec = getVal('วันที่รับเรื่อง', ['วันที่รับเรื่อง', 'FirstUpdDate'], true);
                const topicVal = getVal('หัวข้อเรื่อง', ['หัวข้อเรื่อง', 'suggesDesc']);
                const customerVal = getVal('ลูกค้า', ['ลูกค้า', 'nameCus']);
                const phoneVal = getVal('เบอร์โทร', ['เบอร์โทร', 'telCus']);
                const emailVal = getVal('E-mail', ['E-mail', 'emailCus']);
                const addressVal = getVal('ที่อยู่', ['ที่อยู่', 'addressCus']);
                const providerVal = getVal('ผู้รับผิดชอบ', ['ผู้รับผิดชอบ', 'sendToPerson', 'sendToGroupAbb']);
                const rawCcEmail = getVal('CC E-mail', ['CC E-mail', 'ccEmail', 'cc_email', 'cceMail']);
                const ccEmailVal = rawCcEmail
                    ? String(rawCcEmail)
                        .split(/[\r\n;,]+/)
                        .map(e => e.trim())
                        .filter(Boolean)
                        .join('\n')
                    : '';
                const detailVal = getVal('รายละเอียดข้อเสนอแนะ/ร้องเรียน', ['รายละเอียดข้อเสนอแนะ/ร้องเรียน', 'suggesDetail']);
                const lastUpdVal = getVal('อัปเดทล่าสุด', ['อัปเดทล่าสุด', 'LastUpdDate'], true);
                const replyVal = getVal('Reply / การตอบกลับ', ['Reply / การตอบกลับ', 'replyDetail']);
                const statusVal = getVal('สถานะ', ['สถานะ', 'StatusTask']);

                const estimateCellLines = (val, colWidth) => {
                    if (!val) return 1;
                    const str = String(val);
                    const lines = str.split(/\r?\n/);
                    let totalLines = 0;
                    const effWidth = Math.max(8, colWidth - 3);
                    lines.forEach(line => {
                        if (!line.length) {
                            totalLines += 1;
                        } else {
                            totalLines += Math.max(1, Math.ceil(line.length / effWidth));
                        }
                    });
                    return Math.max(1, totalLines);
                };

                const maxLines = Math.max(
                    1,
                    estimateCellLines(topicVal, headers[1].width),
                    estimateCellLines(customerVal, headers[2].width),
                    estimateCellLines(emailVal, headers[4].width),
                    estimateCellLines(addressVal, headers[5].width),
                    estimateCellLines(providerVal, headers[6].width),
                    estimateCellLines(ccEmailVal, headers[7].width),
                    estimateCellLines(detailVal, headers[8].width),
                    estimateCellLines(replyVal, headers[10].width)
                );
                rowHeights.push({ hpt: Math.max(26, Math.ceil(maxLines * 20 + 8)) });

                sheetData.push([
                    dateRec,
                    topicVal,
                    customerVal,
                    phoneVal,
                    emailVal,
                    addressVal,
                    providerVal,
                    ccEmailVal,
                    detailVal,
                    lastUpdVal,
                    replyVal,
                    statusVal
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            ws['!cols'] = headers.map(h => ({ wch: h.width }));
            ws['!rows'] = rowHeights;

            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[cellRef]) continue;

                    const isHeader = (R === 0);
                    const isOddRow = (R % 2 === 1);
                    const align = headers[C]?.align || 'left';

                    if (isHeader) {
                        ws[cellRef].s = {
                            fill: { fgColor: { rgb: "387699" } },
                            font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
                            alignment: { horizontal: "center", vertical: "center", wrapText: true },
                            border: {
                                top: { style: "thin", color: { rgb: "0F374A" } },
                                bottom: { style: "thin", color: { rgb: "0F374A" } },
                                left: { style: "thin", color: { rgb: "0F374A" } },
                                right: { style: "thin", color: { rgb: "0F374A" } }
                            }
                        };
                    } else {
                        let statusColor = "000000";
                        if (C === 11) {
                            const val = String(ws[cellRef].v || '').toLowerCase();
                            if (val === 'pending') statusColor = "D97706";
                            else if (val === 'forward') statusColor = "0284C7";
                            else if (val === 'reply' || val === 'replying') statusColor = "7C3AED";
                            else if (val === 'close') statusColor = "059669";
                        }

                        ws[cellRef].s = {
                            fill: { fgColor: { rgb: isOddRow ? "EBF3F9" : "FFFFFF" } },
                            font: { name: "Segoe UI", sz: 9.5, bold: (C === 11), color: { rgb: statusColor } },
                            alignment: { horizontal: align, vertical: "center", wrapText: true },
                            border: {
                                top: { style: "thin", color: { rgb: "D9D9D9" } },
                                bottom: { style: "thin", color: { rgb: "D9D9D9" } },
                                left: { style: "thin", color: { rgb: "D9D9D9" } },
                                right: { style: "thin", color: { rgb: "D9D9D9" } }
                            }
                        };
                    }
                }
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Suggestion Report");
            XLSX.writeFile(wb, fileName);
        } else {
            let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <!--[if gte mso 9]>
            <xml>
            <x:ExcelWorkbook>
            <x:ExcelWorksheets>
            <x:ExcelWorksheet>
                <x:Name>Suggestion Report</x:Name>
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
                    background-color: #387699 !important;
                    color: #ffffff !important;
                    font-weight: bold;
                    text-align: center;
                    vertical-align: middle;
                    height: 36px;
                    border: 1px solid #0f374a;
                    padding: 6px 10px;
                    white-space: nowrap;
                }
                td {
                    vertical-align: middle;
                    border: 1px solid #d9d9d9;
                    padding: 6px 10px;
                    mso-number-format: "\\@";
                }
                .status-pending { color: #d97706; font-weight: bold; text-align: center; }
                .status-forward { color: #0284c7; font-weight: bold; text-align: center; }
                .status-replying { color: #7c3aed; font-weight: bold; text-align: center; }
                .status-close { color: #059669; font-weight: bold; text-align: center; }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
            </style>
            </head>
            <body>
            <table>
            <thead>
                <tr>
            `;

            headers.forEach(h => {
                html += `        <th style="background-color: #387699; color: #ffffff;">${h.title}</th>\n`;
            });

            html += `    </tr>
        </thead>
        <tbody>
        `;

            exportRows.forEach((row, index) => {
                const getVal = (key, fallbackKeys = [], isDate = false) => {
                    let raw = row[key];
                    if (raw === undefined || raw === null) {
                        for (const fbKey of fallbackKeys) {
                            if (row[fbKey] !== undefined && row[fbKey] !== null) {
                                raw = row[fbKey];
                                break;
                            }
                        }
                    }
                    if (raw === undefined || raw === null) return '';
                    if (isDate || (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(raw))) {
                        return formatDate(raw);
                    }
                    return String(raw);
                };

                const dateRec = getVal('วันที่รับเรื่อง', ['วันที่รับเรื่อง', 'FirstUpdDate'], true);
                const topicVal = getVal('หัวข้อเรื่อง', ['หัวข้อเรื่อง', 'suggesDesc']);
                const customerVal = getVal('ลูกค้า', ['ลูกค้า', 'nameCus']);
                const phoneVal = getVal('เบอร์โทร', ['เบอร์โทร', 'telCus']);
                const emailVal = getVal('E-mail', ['E-mail', 'emailCus']);
                const addressVal = getVal('ที่อยู่', ['ที่อยู่', 'addressCus']);
                const providerVal = getVal('ผู้รับผิดชอบ', ['ผู้รับผิดชอบ', 'sendToPerson', 'sendToGroupAbb']);
                const rawCcEmail = getVal('CC E-mail', ['CC E-mail', 'ccEmail', 'cc_email', 'cceMail']);
                const ccEmailVal = rawCcEmail
                    ? String(rawCcEmail)
                        .split(/[\r\n;,]+/)
                        .map(e => e.trim())
                        .filter(Boolean)
                        .join('\n')
                    : '';
                const detailVal = getVal('รายละเอียดข้อเสนอแนะ/ร้องเรียน', ['รายละเอียดข้อเสนอแนะ/ร้องเรียน', 'suggesDetail']);
                const lastUpdVal = getVal('อัปเดทล่าสุด', ['อัปเดทล่าสุด', 'LastUpdDate'], true);
                const replyVal = getVal('Reply / การตอบกลับ', ['Reply / การตอบกลับ', 'replyDetail']);
                const statusVal = getVal('สถานะ', ['สถานะ', 'StatusTask']);

                const estimateCellLines = (val, colWidth) => {
                    if (!val) return 1;
                    const str = String(val);
                    const lines = str.split(/\r?\n/);
                    let totalLines = 0;
                    const effWidth = Math.max(8, colWidth - 3);
                    lines.forEach(line => {
                        if (!line.length) {
                            totalLines += 1;
                        } else {
                            totalLines += Math.max(1, Math.ceil(line.length / effWidth));
                        }
                    });
                    return Math.max(1, totalLines);
                };

                const maxLines = Math.max(
                    1,
                    estimateCellLines(topicVal, headers[1].width),
                    estimateCellLines(customerVal, headers[2].width),
                    estimateCellLines(emailVal, headers[4].width),
                    estimateCellLines(addressVal, headers[5].width),
                    estimateCellLines(providerVal, headers[6].width),
                    estimateCellLines(ccEmailVal, headers[7].width),
                    estimateCellLines(detailVal, headers[8].width),
                    estimateCellLines(replyVal, headers[10].width)
                );
                const rowHeight = Math.max(30, Math.ceil(maxLines * 22 + 10));

                let statusClass = '';
                const stLower = (statusVal || '').toLowerCase();
                if (stLower === 'pending') statusClass = 'status-pending';
                else if (stLower === 'forward') statusClass = 'status-forward';
                else if (stLower === 'reply' || stLower === 'replying') statusClass = 'status-replying';
                else if (stLower === 'close') statusClass = 'status-close';

                const rowBg = (index % 2 === 1) ? 'background-color: #ebf3f9;' : 'background-color: #ffffff;';

                const escapeXml = (str) => {
                    if (!str) return '';
                    return String(str)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/\r?\n/g, '<br style="mso-data-placement:same-cell;"/>');
                };

                html += `    <tr style="${rowBg} height: ${rowHeight}px;">
            <td class="text-center">${escapeXml(dateRec)}</td>
            <td class="text-left">${escapeXml(topicVal)}</td>
            <td class="text-left">${escapeXml(customerVal)}</td>
            <td class="text-center">${escapeXml(phoneVal)}</td>
            <td class="text-left">${escapeXml(emailVal)}</td>
            <td class="text-left">${escapeXml(addressVal)}</td>
            <td class="text-left">${escapeXml(providerVal)}</td>
            <td class="text-left">${escapeXml(ccEmailVal)}</td>
            <td class="text-left">${escapeXml(detailVal)}</td>
            <td class="text-center">${escapeXml(lastUpdVal)}</td>
            <td class="text-left">${escapeXml(replyVal)}</td>
            <td class="${statusClass}">${escapeXml(statusVal)}</td>
        </tr>\n`;
            });

            html += `</tbody>
</table>
</body>
</html>`;

            const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (err) {
        console.error("Error exporting excel:", err);
    } finally {
        isExportingSuggestionExcel = false;
        if (typeof stopLoading === 'function') {
            stopLoading();
        }
    }
}

$(document).ready(async function () {
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

    if (typeof startLoading === 'function') {
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    }
    try {

        const jsonResult = await safeFetchJson('/DashboardSuggestion/GetPersonalAndGroup');
        if (jsonResult) {
            const raw = (jsonResult.data && typeof jsonResult.data === 'object' && !Array.isArray(jsonResult.data)) ? jsonResult.data : jsonResult;
            const group = Array.isArray(raw.group) ? raw.group : (Array.isArray(jsonResult.group) ? jsonResult.group : []);
            const personalAbb = Array.isArray(raw.personalAbb) ? raw.personalAbb : (Array.isArray(jsonResult.personalAbb) ? jsonResult.personalAbb : []);
            const personal = Array.isArray(raw.personal) ? raw.personal : (Array.isArray(jsonResult.personal) ? jsonResult.personal : []);

            const branch = [
                ...group,
                ...personalAbb
            ];
            const provider = [
                ...group,
                ...personal
            ];
            await setFilterBranch(branch);
            await setFilterprovider(provider);
        } else {
            await setFilterBranch();
            await setFilterprovider();
        }
        await setDashboard();

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
    await setDashboard();
});

$("#btnResetFilter").off("click").on("click", async function (e) {
    if (e) e.preventDefault();
    await resetSuggestionFilters();
    await setDashboard();
});

$("#btnExportExcel").off("click").on("click", async function (e) {
    if (e) e.preventDefault();
    await exportSuggestionExcel();
});