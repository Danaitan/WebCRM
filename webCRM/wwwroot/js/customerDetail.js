const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");

let masterData = null;
let currentContactData = null;
let currentCustomerSearchData = [];
let currentCustomerCompanyFilter = 'ALL';
let currentContactInfoRequestId = 0;
let currentClaimListRequestId = 0;
let currentReceiveListRequestId = 0;
let currentContactRequestId = 0;
let currentCustomerSelectionId = 0;
let currentSelectedCustomerRow = null;
let currentContactLoadPromise = Promise.resolve(null);

const contactInfoCache = new Map();
const receiveListCache = new Map();
const claimListCache = new Map();
// Customer-level caches so re-opening a previously viewed customer does not
// re-fetch anything. Keyed by the value each endpoint actually depends on.
const pdpaCache = new Map();        // key: company code
const checkPdpaCache = new Map();   // key: idno
const contactListCache = new Map(); // key: idno (GetContact payload)

async function getPDPAbg(checkPDPA, company) {

    if (company == 'MIB') return '';

    const list = Array.isArray(checkPDPA) ? checkPDPA : (Array.isArray(checkPDPA?.data) ? checkPDPA.data : []);
    if (!list || list.length === 0) return 'red';

    const isAllApproved = list.every(
        item => item.LastestStatus === 'approved'
    );

    const isSomeApproved = list.some(
        item => item.LastestStatus === 'approved'
    );

    const isNoDeclined = !list.some(
        item => item.LastestStatus === 'approved'
    );

    if (isAllApproved) {
        return 'green';
    } else if (isSomeApproved) {
        return 'yellow';
    } else if (isNoDeclined) {
        return 'red';
    }

    return '';
}

async function getmaster() {
    try {
        const response = await fetch('/Home/GetMaster');
        masterData = await response.json();
        renderCompanyTabs();
        renderProductSummary();
    } catch (error) {
        console.error("Error fetching master data:", error);
    }
}

function getCompanyCountText(compName, contactData) {
    const nameLower = compName.toLowerCase();
    if (nameLower === 'micro') {
        const count = contactData ? (contactData.contactMicroCount || 0) : 0;
        return `${count}`;
    } else if (nameLower === 'mfin') {
        const count = contactData ? (contactData.contactMFINCount || 0) : 0;
        return `${count}`;
    } else if (nameLower === 'mib') {
        const count = contactData ? (contactData.contactMIBCount || 0) : 0;
        return `${count}`;
    } else {
        const countKey = `contact${compName}Count`;
        const listKey = `contact${compName}`;
        const count = contactData ? (contactData[countKey] ?? (Array.isArray(contactData[listKey]) ? contactData[listKey].length : 0)) : 0;
        return `${count}`;
    }
}

function updateContactTabLabel(compName) {
    const contactBtn = document.getElementById("tab-btn-table-contact") || document.querySelector('.button-tab-contact[data-target="tab-table-contact"]');
    if (!contactBtn) return;

    if (!compName) {
        const activeCompBtn = document.querySelector('#contact-company-tabs .button-tab-contact.active');
        if (activeCompBtn) {
            compName = activeCompBtn.getAttribute('data-target') || '';
        }
    }

    const isMIB = compName && (compName.toLowerCase() === 'mib' || compName.toLowerCase() === 'contact-mib');
    if (isMIB) {
        contactBtn.innerHTML = '<i class="bi bi-file-earmark-text fs-5"></i> กรมธรรม์';
    } else {
        contactBtn.innerHTML = '<i class="bi bi-file-earmark-text fs-5"></i> สัญญา';
    }
}

function normalizeCompanyName(value) {
    return (value == null ? '' : String(value)).trim().toUpperCase();
}

function waitForBrowserPaint() {
    return new Promise(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
    });
}

function showContractCompanyPane(company) {
    const normalizedCompany = normalizeCompanyName(company);
    if (!normalizedCompany || normalizedCompany === 'ALL') return;

    const paneByCompany = {
        MICRO: 'contact-Micro',
        MIB: 'contact-MIB',
        MFIN: 'contact-MFIN'
    };
    const targetId = paneByCompany[normalizedCompany];
    if (!targetId) return;

    Object.values(paneByCompany).forEach(id => {
        const pane = document.getElementById(id);
        if (!pane) return;
        const isTarget = id === targetId;
        pane.classList.toggle('d-none', !isTarget);
        pane.classList.toggle('show', isTarget);
        pane.classList.toggle('active', isTarget);
    });

    updateContactTabLabel(normalizedCompany);
    setTimeout(() => {
        const tableId = `#dt-${targetId}`;
        if (window.jQuery && $.fn && $.fn.DataTable && $.fn.DataTable.isDataTable(tableId)) {
            $(tableId).DataTable().columns.adjust();
        }
    }, 50);
}

async function applyCustomerCompanyFilter(company, selectFirstVisible = true) {
    const normalizedFilter = normalizeCompanyName(company) || 'ALL';
    currentCustomerCompanyFilter = normalizedFilter;

    const container = document.getElementById('contact-company-tabs');
    if (container) {
        container.querySelectorAll('[data-company-filter]').forEach(button => {
            button.classList.toggle('active', normalizeCompanyName(button.dataset.companyFilter) === normalizedFilter);
        });
    }

    const tbody = document.getElementById('searchResultBody');
    let visibleCount = 0;

    if (tbody) {
        tbody.querySelectorAll('tr[data-index]').forEach(customerRow => {
            const index = Number(customerRow.dataset.index);
            const customer = currentCustomerSearchData[index];
            const customerCompany = normalizeCompanyName(customer?.companyCde || customer?.CompanyCde);
            const visible = normalizedFilter === 'ALL' || customerCompany === normalizedFilter;
            const contractCardRow = customerRow.nextElementSibling?.classList.contains('customer-contract-card-row')
                ? customerRow.nextElementSibling
                : null;

            customerRow.classList.toggle('d-none', !visible);
            if (contractCardRow) {
                const isExpanded = contractCardRow.dataset.expanded === 'true';
                contractCardRow.classList.toggle('d-none', !visible || !isExpanded);
            }
            if (visible) visibleCount++;
        });
    }

    const countElement = document.getElementById('customerCount');
    if (countElement) countElement.innerText = visibleCount;

    if (selectFirstVisible && tbody) {
        const activeRow = tbody.querySelector('tr[data-index].active-row:not(.d-none)');
        if (!activeRow) {
            const firstVisibleRow = tbody.querySelector('tr[data-index]:not(.d-none)');
            const index = Number(firstVisibleRow?.dataset.index);
            const selectedCustomer = currentCustomerSearchData[index];

            if (firstVisibleRow && selectedCustomer) {
                setActiveCustomerRow(tbody, firstVisibleRow);
                await loadCustomerSelection(selectedCustomer, index);
            }
        }
    }

    return visibleCount;
}

function renderCompanyTabs(customers = currentCustomerSearchData) {
    const container = document.getElementById("contact-company-tabs");
    if (!container || !masterData || !Array.isArray(masterData.company)) return;

    const customerList = Array.isArray(customers) ? customers : [];
    const availableCompanies = new Set(customerList.map(customer =>
        normalizeCompanyName(customer.companyCde || customer.CompanyCde)
    ).filter(Boolean));

    if (currentCustomerCompanyFilter !== 'ALL' && !availableCompanies.has(currentCustomerCompanyFilter)) {
        currentCustomerCompanyFilter = 'ALL';
    }

    container.innerHTML = "";
    container.classList.toggle('d-none', customerList.length === 0);
    if (customerList.length === 0) return;

    const companyOrder = { 'MICRO': 1, 'MIB': 2, 'MFIN': 3 };
    const companyNames = [...new Set(masterData.company
        .map(comp => normalizeCompanyName(comp.company))
        .filter(Boolean))]
        .sort((a, b) => (companyOrder[a] ?? 999) - (companyOrder[b] ?? 999) || a.localeCompare(b));

    const filters = ['ALL', ...companyNames];
    filters.forEach(companyName => {
        const count = companyName === 'ALL'
            ? customerList.length
            : customerList.filter(customer => normalizeCompanyName(customer.companyCde || customer.CompanyCde) === companyName).length;

        const button = document.createElement("button");
        button.type = 'button';
        button.className = `button-tab-contact${currentCustomerCompanyFilter === companyName ? " active" : ""}`;
        button.style.padding = "0.3rem 1rem";
        button.style.fontSize = "0.85rem";
        button.setAttribute("data-company-filter", companyName);
        button.textContent = companyName === 'ALL' ? `ทั้งหมด(${count})` : `${companyName}(${count})`;
        container.appendChild(button);
    });

    applyCustomerCompanyFilter(currentCustomerCompanyFilter, false);
}

function renderProductSummary(contactData = currentContactData, isLoading = false) {
    const container = document.getElementById("product-summary-container");
    if (!container || !masterData || !Array.isArray(masterData.company)) return;

    container.innerHTML = "";

    masterData.company.forEach((comp, index) => {
        const compName = comp.company || "";
        if (!compName) return;

        const compLower = compName.toLowerCase();
        const isMIB = compLower === 'mib';
        const unit = isMIB ? 'กรมธรรม์' : 'สัญญา';

        let countText;
        if (isLoading) {
            countText = '<span class="spinner-border spinner-border-sm text-muted" role="status" aria-hidden="true"></span>';
        } else {
            const count = getCompanyCountText(compName, contactData);
            countText = `${count} ${unit}`;
        }

        let iconClass = "bi bi-file-earmark-text";
        let bgClass = "bg-secondary";
        let iconStyle = "";

        if (compLower === 'micro') {
            bgClass = "bg-primary";
            iconClass = "bi bi-window-stack";
        } else if (compLower === 'mfin') {
            bgClass = "bg-success";
            iconClass = "bi bi-graph-up";
        } else if (compLower === 'mib') {
            bgClass = "";
            iconStyle = ' style="background-color: #8b5cf6;"';
            iconClass = "bi bi-shield-check";
        }

        const isLast = index === masterData.company.length - 1;
        const borderClass = isLast ? "" : " border-bottom";

        const itemDiv = document.createElement("div");
        itemDiv.className = `d-flex justify-content-between align-items-center${borderClass} py-3`;

        const iconBgAttr = bgClass 
            ? `class="product-icon ${bgClass} text-white rounded d-flex align-items-center justify-content-center"` 
            : `class="product-icon text-white rounded d-flex align-items-center justify-content-center"${iconStyle}`;

        itemDiv.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div ${iconBgAttr}>
                    <i class="${iconClass}"></i>
                </div>
                <span class="fw-medium text-dark">${compName}</span>
            </div>
            <span class="text-muted" id="summary-${compLower}-count">${countText}</span>
        `;

        container.appendChild(itemDiv);
    });
}

function initPopovers() {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    [...popoverTriggerList].forEach(popoverTriggerEl => {
        bootstrap.Popover.getOrCreateInstance(popoverTriggerEl, {
            sanitize: false
        });
    });

    // Close popovers when clicking outside
    $(document).off('click.popoverDismiss').on('click.popoverDismiss', function (e) {
        $('[data-bs-toggle="popover"]').each(function () {
            if (!this.contains(e.target) && $(e.target).closest('.popover').length === 0) {
                const popover = bootstrap.Popover.getInstance(this);
                if (popover) {
                    popover.hide();
                }
            }
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        getmaster();
        initPopovers();
        setContractTabEnabled(false);
    });
} else {
    getmaster();
    initPopovers();
    setContractTabEnabled(false);
}

function isCheck (isCheck)
{
    if (isCheck === true || isCheck === '1'){
        return '✅';
    }else{
        return '❌';
    }
}

function allowCard(status) {
    if (status === true){
        return '<span class="badge bg-success-light text-success px-3 py-2 rounded">ยินยอม</span>';
    }else if (status === false){
        return '<span class="badge bg-danger-light text-danger px-3 py-2 rounded">ไม่ยินยอม</span>';
    }else{
        return '<span class="badge bg-secondary-light text-secondary px-3 py-2 rounded">ไม่ระบุ</span>';
    }
}

function clearContractDetails() {
    if (typeof currentContactInfoRequestId !== 'undefined') {
        currentContactInfoRequestId++;
    }
    if (typeof currentClaimListRequestId !== 'undefined') {
        currentClaimListRequestId++;
    }
    if (typeof currentReceiveListRequestId !== 'undefined') {
        currentReceiveListRequestId++;
    }

    const fieldsToClear = [
        // ข้อมูลสัญญา (Normal Contract Details)
        'contract-detail-contno', 'contract-detail-loantype', 'contract-detail-company',
        'contract-detail-veh-type', 'contract-detail-veh-brand', 'contract-detail-veh-year',
        'contract-detail-channel', 'contract-detail-license', 'contract-detail-old-contno',
        'contract-detail-province', 'contract-detail-branch', 'contract-detail-collector',

        // ข้อมูลสินเชื่อ (Loan Details)
        'loan-detail-fianlamount', 'loan-detail-aging', 'loan-detail-appraisal',
        'loan-detail-status', 'loan-detail-ltv', 'loan-detail-open-date',
        'loan-detail-balance', 'loan-detail-first-due-date', 'loan-detail-terms',
        'loan-detail-last-due-date', 'loan-detail-termpaid', 'loan-detail-close-date',
        'loan-detail-overdue-days', 'loan-detail-installment-amount', 'loan-detail-overdue-terms',
        'loan-detail-insurance-due-date', 'loan-detail-interest-rate', 'loan-detail-tax-due-date',

        // ข้อมูลกรมธรรม์ (MIB Details)
        'mib-detail-policy-no', 'mib-detail-veh-category', 'mib-detail-veh-year',
        'mib-detail-veh-brand', 'mib-detail-channel', 'mib-detail-register',
        'mib-detail-claim-count',

        // ข้อมูลแผนประกัน (MIB Insurance)
        'mib-ins-plan', 'mib-ins-premium', 'mib-ins-company',
        'mib-ins-terms', 'mib-ins-cover-amount', 'mib-ins-status-install',
        'mib-ins-start-date', 'mib-ins-end-date', 'mib-ins-payment-type',
        'mib-ins-status', 'mib-ins-remaining-days'
    ];

    fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = '-';
    });

    const statusElem = document.getElementById("mib-ins-status");
    const statusContainer = document.getElementById("mib-ins-status-container") || (statusElem ? statusElem.closest('.d-flex') : null);
    if (statusContainer) {
        statusContainer.style.removeProperty('background-color');
        statusContainer.style.removeProperty('padding');
        statusContainer.style.removeProperty('border-radius');
        const labelSpan = statusContainer.querySelector('.detail-label-sm span') || statusContainer.querySelector('.detail-label-sm') || statusContainer.children[0];
        if (labelSpan) labelSpan.style.removeProperty('color');
        if (statusElem) statusElem.style.removeProperty('color');
    }

    if (window.jQuery && $.fn && $.fn.DataTable) {
        ['#tab-table-guarantor', '#tab-table-payment', '#tab-table-claim'].forEach(tableId => {
            if ($.fn.DataTable.isDataTable(tableId)) {
                $(tableId).DataTable().clear().draw();
            }
        });
    }

    document.querySelectorAll('.contract-row.active-row').forEach(r => {
        r.classList.remove('active-row');
        r.classList.add('hover-row');
        r.querySelectorAll('.contract-col').forEach(col => col.classList.remove('fw-medium', 'text-primary'));
    });
}

function clearCustomerDetails() {
    const fieldsToClear = [
        'detail-idno',
        'detail-name',
        'detail-type',
        'detail-dob',
        'detail-gender',
        'detail-marital',
        'detail-mobile',
        'detail-phone1',
        'detail-phone2',
        'detail-occupation',
        'detail-email',
        'detail-BW',
        'detail-pdpaCheck',
        'detail-marketing-consent',
        'detail-cross-sell-consent',
        'contract-detail-idno',
        'contract-detail-name'
    ];

    fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = '-';
    });

    const pdpaContainer = document.getElementById("pdpa-consent-container");
    if (pdpaContainer) pdpaContainer.innerHTML = '';

    document.querySelectorAll(".cus-name-consent").forEach(el => { el.innerText = '-'; });

    const panelBg = document.getElementById("customer-detail-panel-bg");
    if (panelBg) {
        panelBg.classList.remove("bg-danger-light", "bg-warning-light", "bg-success-light");
    }
}

async function displayCustomerDetails(customer, selectionId) {
    clearContractDetails();
    clearCustomerDetails();
    const companyCode = customer.companyCde || '';
    let pdpaData = null;
    let checkPDPAData = null;
    let MS1Purpose = null;
    let MS2Purpose = null;
    try {
        const pdpaKey = String(companyCode ?? '');
        const checkPdpaKey = String(customer.idno ?? '');

        // Serve PDPA data from cache when available; otherwise fetch and cache.
        if (pdpaCache.has(pdpaKey)) {
            pdpaData = pdpaCache.get(pdpaKey);
        } else {
            const response = await fetch(`/CustomerDetail/GetPDPA?company=${companyCode}`);
            if (response.ok) {
                pdpaData = await response.json();
                pdpaCache.set(pdpaKey, pdpaData);
            }
        }

        if (checkPdpaCache.has(checkPdpaKey)) {
            checkPDPAData = checkPdpaCache.get(checkPdpaKey);
        } else {
            const checkPDPA = await fetch(`/CustomerDetail/GetCheckPDPA?idno=${customer.idno || ''}`);
            if (checkPDPA.ok) {
                checkPDPAData = await checkPDPA.json();
                checkPdpaCache.set(checkPdpaKey, checkPDPAData);
            }
        }

        if (companyCode === "MICRO"){
            MS1Purpose = "291e16b1-403b-4f0d-6256-08da3957c070";
            MS2Purpose = "7018373d-b0b5-4d6e-4a8b-08da3d7327ea";
        } else if (companyCode === "MFIN"){
            MS1Purpose = "1d9ac4c8-fe6a-4fa6-ab04-08db72459de6";
            MS2Purpose = "40e07f77-7245-40c3-ab05-08db72459de6";
        }

    } catch (e) {
        console.error("Error fetching PDPA data:", e);
    }

    if (selectionId !== currentCustomerSelectionId) return false;

    const pdpaCheckEl = document.getElementById("detail-pdpaCheck");
    if (pdpaCheckEl) pdpaCheckEl.innerText = customer.pdpaCheck || '-';
    const detailIdnoEl = document.getElementById("detail-idno");
    if (detailIdnoEl) detailIdnoEl.innerText = " "+customer.idno || '-';
    const detailNameEl = document.getElementById("detail-name");
    if (detailNameEl) detailNameEl.innerText = customer.nameCus || '-';
    
    // Update the title in the Contract tab
    const contractIdnoElement = document.getElementById("contract-detail-idno");
    if (contractIdnoElement) contractIdnoElement.innerText = customer.idno || '-';
    
    const contractNameElement = document.getElementById("contract-detail-name");
    if (contractNameElement) contractNameElement.innerText = customer.nameCus || '-';
    document.getElementById("detail-type").innerText = customer.custyp || '-';
    document.getElementById("detail-gender").innerText = customer.gender || '-';
    document.getElementById("detail-dob").innerText = customer.birdte || '-';
    document.getElementById("detail-marital").innerText = customer.marcde || '-';
    document.getElementById("detail-mobile").innerText = customer.mobile || '-';
    document.getElementById("detail-phone1").innerText = customer.phone1 || '-';
    document.getElementById("detail-phone2").innerText = customer.phone2 || '-';
    document.getElementById("detail-occupation").innerText = customer.occupation || '-';
    document.getElementById("detail-email").innerText = customer.mail || '-';
    document.getElementById("detail-BW").innerText = customer.BLWL || '-';

    const container = document.getElementById("pdpa-consent-container");

    if (container) {
        let items = [];
        if (Array.isArray(pdpaData)) {
            items = pdpaData;
        } else if (pdpaData && Array.isArray(pdpaData.data)) {
            items = pdpaData.data;
        } else if (pdpaData && typeof pdpaData === 'object') {
            items = Object.keys(pdpaData).map(key => ({
                purpose: key,
                purposeDesc: pdpaData[key]?.purposeDesc,
                status: pdpaData[key]?.status ?? pdpaData[key]
            }));
        }

        const pdpaList = Array.isArray(checkPDPAData) ? checkPDPAData : (Array.isArray(checkPDPAData?.data) ? checkPDPAData.data : []);

        const sortedPdpaList = [...pdpaList].sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));

        let popoverInnerHtml = "";
        if (companyCode === "MIB") {
            popoverInnerHtml = `<div class="text-muted text-center py-1"></div>`;
        } else if (sortedPdpaList.length > 0) {
            popoverInnerHtml = sortedPdpaList.map((item, index) => {
                const isApproved = item.LastestStatus === "approved";
                const icon = isApproved 
                    ? `<i class="bi bi-check-circle-fill text-success fs-6 me-2"></i>` 
                    : `<i class="bi bi-x-circle-fill text-danger fs-6 me-2"></i>`;
                
                const numBadge = item.number != null 
                    ? `<span class="badge ${isApproved ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'} me-2">ข้อ ${item.number}</span>` 
                    : '';
                
                const descStr = item.description || item.purposeDesc || item.name || item.title || item.detail || '';
                const isLast = index === sortedPdpaList.length - 1;
                const borderClass = isLast ? '' : 'border-bottom pb-1 mb-1';

                return `<div class="d-flex align-items-center ${borderClass}">${icon}${numBadge}<span class="text-dark fw-medium">${descStr || `ข้อ ${item.number}`}</span></div>`;
            }).join('');
        } else {
            popoverInnerHtml = `<div class="text-muted text-center py-1"><i class="bi bi-exclamation-circle me-1"></i>ไม่พบข้อมูลรายการ PDPA</div>`;
        }

        const popoverContentHtml = `<div class="p-1" style="font-size: 0.875rem; min-width: 220px; max-height: 260px; overflow-y: auto;"><div class="fw-bold text-dark border-bottom pb-1 mb-2 d-flex align-items-center position-sticky top-0 bg-white z-1"><i class="bi bi-shield-check text-primary me-2"></i>รายละเอียด PDPA</div><div>${popoverInnerHtml}</div></div>`;
        const pdpaInfoIcon = document.getElementById("pdpa-info-icon") || document.querySelector('#pdpa-consent-container')?.previousElementSibling?.querySelector('[data-bs-toggle="popover"]');
        if (pdpaInfoIcon) {
            const oldPopover = bootstrap.Popover.getInstance(pdpaInfoIcon);
            if (oldPopover) {
                oldPopover.dispose();
            }
            pdpaInfoIcon.setAttribute("data-bs-content", popoverContentHtml);
            bootstrap.Popover.getOrCreateInstance(pdpaInfoIcon, { sanitize: false });
        }

        if (companyCode === "MIB") {
            container.innerHTML = '<div class="text-muted small"></div>';
        } else if (items.length > 0) {
            container.innerHTML = items.map((item, idx) => {
                let descText = item.purposeDesc || '';
                let MScheck = false;

                if (Array.isArray(pdpaList) && pdpaList.length > 0) {
                    if (item.purpose == MS1Purpose){
                        MScheck = [4, 6, 10].every(number =>
                            pdpaList.some(data =>
                                data.number === number &&
                                data.LastestStatus === "approved"
                            )
                        );
                    } else if (item.purpose == MS2Purpose){
                        MScheck = [2, 3, 5, 7, 10].every(number =>
                            pdpaList.some(data =>
                                data.number === number &&
                                data.LastestStatus === "approved"
                            )
                        );
                    }
                }

                return `
                    <div class="consent-box bg-white border rounded p-3 p-xl-4 d-flex align-items-center shadow-sm w-100">
                        <span class="consent-icon me-3">${isCheck(MScheck)}</span>
                        <div class="flex-grow-1">
                            ${descText}
                        </div>
                    </div>
                `;
            }).join('');
            initPopovers();
        } else {
            container.innerHTML = '<div class="text-muted small">ไม่พบข้อมูลรายการยินยอม</div>';
        }
    }
    const bgColor = await getPDPAbg(checkPDPAData,companyCode)
    if (selectionId !== currentCustomerSelectionId) return false;

    const panelBg = document.getElementById("customer-detail-panel-bg");
    if (panelBg) {
        panelBg.classList.remove("bg-danger-light", "bg-warning-light", "bg-success-light");
        // let pdpaVal = customer.pdpaCheck;
        let pdpaVal = bgColor;
        if (typeof pdpaVal === 'string') {
            pdpaVal = pdpaVal.toLowerCase();
        }
        
        if (pdpaVal === "red") {
            panelBg.classList.add("bg-danger-light");
        } else if (pdpaVal === "yellow") {
            panelBg.classList.add("bg-warning-light");
        } else if (pdpaVal === "green") {
            panelBg.classList.add("bg-success-light");
        }
    }

    const marketingEl = document.getElementById("detail-marketing-consent");
    if (marketingEl) marketingEl.innerHTML = allowCard(customer.marketingConsent || customer.MarketingConsent);

    const crossSellEl = document.getElementById("detail-cross-sell-consent");
    if (crossSellEl) crossSellEl.innerHTML = allowCard(customer.crossSellConsent || customer.CrossSellConsent);

    document.querySelectorAll(".cus-name-consent").forEach(el => { el.innerText = customer.nameCus || ""; });
    return true;
}

async function loadCustomerSelection(selectedCustomer, customerIndex) {
    const selectionId = ++currentCustomerSelectionId;

    setContractTabEnabled(false);
    showContractDetailLoading(true);
    setContractCardLoading(customerIndex, selectedCustomer);

    try {
        // Contract data belongs to the search, not an individual row click.
        // Every selection waits for and reuses the same search-level request.
        const [, contactData] = await Promise.all([
            displayCustomerDetails(selectedCustomer, selectionId),
            currentContactLoadPromise
        ]);

        if (selectionId !== currentCustomerSelectionId) return;

        if (!contactData) {
            currentContactData = null;
            clearContactTables();
            renderProductSummary(null);
            fillAllContractCards(currentCustomerSearchData, {});
        }

        const selectedCompany = selectedCustomer.companyCde || selectedCustomer.CompanyCde;
        if (selectedCompany) {
            showContractCompanyPane(selectedCompany);
        }

        // A null response is still a completed load. Render an empty card so
        // the selected row never remains stuck in its loading state.
        updateContractCard(customerIndex, selectedCustomer, contactData || {});
    } finally {
        if (selectionId === currentCustomerSelectionId) {
            showContractDetailLoading(false);
        }
    }
}

function setActiveCustomerRow(tbody, customerRow) {
    if (!tbody || !customerRow) return;

    // A selection change only needs to update the previously selected row.
    // Avoid walking every customer row: with 2,000 results that made each
    // click perform thousands of DOM lookups and could freeze the page.
    const previousRow = currentSelectedCustomerRow?.isConnected
        ? currentSelectedCustomerRow
        : tbody.querySelector('tr[data-index].active-row, tr[data-index].selected-contract-row');

    if (previousRow && previousRow !== customerRow) {
        const row = previousRow;
        row.classList.remove('active-row', 'selected-contract-row', 'contract-expanded');
        row.classList.add('hover-row');

        const cardRow = row.nextElementSibling?.classList.contains('customer-contract-card-row')
            ? row.nextElementSibling
            : null;
        const toggle = row.querySelector('.customer-contract-inline-toggle');

        if (cardRow) {
            cardRow.dataset.expanded = 'false';
            cardRow.classList.add('d-none');
        }
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
            const chevron = toggle.querySelector('.customer-contract-inline-chevron');
            if (chevron) {
                chevron.classList.add('bi-chevron-down');
                chevron.classList.remove('bi-chevron-up');
            }
        }

        const avatar = row.querySelector('.avatar-sm');
        if (avatar) {
            avatar.classList.remove('bg-blue-light', 'text-primary');
            avatar.classList.add('bg-light', 'text-muted');
        }

        const nameSpan = row.querySelector('.name-span');
        if (nameSpan) nameSpan.classList.remove('fw-medium');
    }

    customerRow.classList.add('active-row', 'selected-contract-row');
    customerRow.classList.remove('hover-row');

    const avatar = customerRow.querySelector('.avatar-sm');
    if (avatar) {
        avatar.classList.remove('bg-light', 'text-muted');
        avatar.classList.add('bg-blue-light', 'text-primary');
    }

    const nameSpan = customerRow.querySelector('.name-span');
    if (nameSpan) nameSpan.classList.add('fw-medium');

    currentSelectedCustomerRow = customerRow;
}

function clearContactTables() {
    if (window.jQuery && $.fn && $.fn.DataTable) {
        ['#dt-contact-Micro', '#dt-contact-MFIN', '#dt-contact-MIB'].forEach(tableId => {
            if ($.fn.DataTable.isDataTable(tableId)) {
                $(tableId).DataTable().clear().draw();
            } else {
                const tbody = document.querySelector(`${tableId} tbody`);
                if (tbody) tbody.innerHTML = '';
            }
        });
    } else {
        ['#dt-contact-Micro', '#dt-contact-MFIN', '#dt-contact-MIB'].forEach(tableId => {
            const tbody = document.querySelector(`${tableId} tbody`);
            if (tbody) tbody.innerHTML = '';
        });
    }
}

async function performSearch() {
    const searchValue = searchInput.value.trim();
    if (searchValue) {
        // A new search owns a new contract-list request. Invalidate any result
        // still returning from the previous search before replacing the rows.
        currentContactRequestId++;
        currentContactLoadPromise = Promise.resolve(null);

        try {
            startLoading('กำลังค้นหาข้อมูล...', 'ระบบกำลังค้นหาข้อมูลลูกค้า กรุณารอสักครู่...');
            const originalText = searchBtn.innerHTML;
            searchBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังค้นหา...';
            const response = await fetch('/CustomerDetail/GetCustomerList?idno=' + encodeURIComponent(searchValue));

            if (response.ok) {
                const data = await response.json();

                if (data && data.length > 0) {
                    currentCustomerSearchData = data;
                    currentCustomerCompanyFilter = 'ALL';
                    document.getElementById("customerCount").innerText = data.length;
                    const tbody = document.getElementById("searchResultBody");
  
                    tbody.innerHTML = data.map((cust, index) => {
                        const name = cust.nameCus || '-';
                        const idno = cust.idno || '-';
                        const licno = cust.licno || '-';
                        const contno = cust.contno || '-';
                        const comCde = cust.companyCde || '-'

                        const licnoHtml = (() => {
                            if (!licno || licno === '-') return '-';
                            const m = licno.trim().match(/^(.+)\s+([^\s]+)$/);
                            return m
                                ? `<div>${m[1]}</div><small class="text-muted">${m[2]}</small>`
                                : licno;
                        })();

                        return `
                            <tr class="${index === 0 ? 'active-row selected-contract-row cursor-pointer' : 'cursor-pointer hover-row'}" data-index="${index}" data-active-status="unknown">
                                <td class="py-3 text-center text-nowrap customer-active-status text-muted" title="กำลังตรวจสอบสถานะ">-</td>
                                <td class="py-3 align-middle">

                                    <div class="d-flex flex-column">
                                        <span class="${index === 0 ? 'fw-medium ' : ''}text-dark text-nowrap name-span">
                                            ${name}
                                        </span>
                                        <small class="text-muted text-nowrap">
                                            ${idno}
                                        </small>
                                    </div>
                                </td>
                                <td class="py-3 text-muted text-center text-nowrap">
                                    ${licnoHtml}
                                </td>
                                <td class="py-3 text-muted text-center text-nowrap">${comCde}</td>
                                <td class="py-3 text-muted text-center text-nowrap">
                                    <span>${contno}</span>
                                    <button type="button"
                                            class="btn btn-sm p-0 border-0 bg-transparent ms-2 customer-contract-inline-toggle"
                                            data-card-index="${index}"
                                            aria-expanded="false"
                                            title="ขยายเพื่อดูข้อมูลสัญญา">
                                        <i class="bi bi-chevron-down customer-contract-inline-chevron"></i>
                                    </button>
                                </td>
                            </tr>
                            <tr class="customer-contract-card-row border-bottom d-none" data-card-index="${index}" data-expanded="false">
                                <td colspan="5" class="p-0">
                                    ${buildCustomerContractCard(cust)}
                                </td>
                            </tr>
                        `;
                    }).join('');
                    currentSelectedCustomerRow = tbody.querySelector('tr[data-index].active-row');

                    renderCompanyTabs(currentCustomerSearchData);
                    currentContactLoadPromise = getContact(searchValue);

                    tbody.onclick = async function(e) {
                        // The inline contract toggle has its own delegated handler.
                        if (e.target.closest('.customer-contract-inline-toggle')) return;
                        
                        let clickedRow = e.target.closest('tr[data-index]');
                        if (!clickedRow) {
                            const cardRow = e.target.closest('tr.customer-contract-card-row');
                            if (cardRow) {
                                const cardIdx = cardRow.dataset.cardIndex;
                                clickedRow = tbody.querySelector(`tr[data-index="${cardIdx}"]`);
                            }
                        }
                        if (!clickedRow || clickedRow.dataset.index == null) return;
                        if (clickedRow.classList.contains('active-row')) return;

                        setActiveCustomerRow(tbody, clickedRow);

                        const idx = parseInt(clickedRow.dataset.index);
                        const selectedCust = data[idx];
                        if (selectedCust) {
                            await loadCustomerSelection(selectedCust, idx);
                        }
                    };

                    showLoading(
                        'กำลังประมวลผลข้อมูล...',
                        `พบข้อมูล ${data.length.toLocaleString('th-TH')} รายการ ระบบกำลังจัดเตรียมรายละเอียด กรุณารอสักครู่...`
                    );
                    // Keep the page-level loading screen visible until the
                    // contact lists, contract matching, and first customer
                    // details have all finished rendering.
                    await waitForBrowserPaint();
                    await loadCustomerSelection(data[0], 0);

                } else {
                    currentCustomerSearchData = [];
                    currentCustomerCompanyFilter = 'ALL';
                    document.getElementById("customerCount").innerText = "0";
                    document.getElementById("searchResultBody").innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">ไม่พบรายการ</td></tr>';
                    currentContactData = null;
                    renderProductSummary(null);
                    renderCompanyTabs();
                    clearContactTables();
                    clearContractDetails();
                    clearCustomerDetails();
                }
            } else {
                console.error("Error fetching data:", response.status);
                document.getElementById("searchResultBody").innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
            }
            
            searchBtn.innerHTML = originalText;
        } catch (error) {
            console.error("Fetch error:", error);
            searchBtn.innerHTML = '<i class="bi bi-search"></i> ค้นหา';
        } finally {
            stopLoading();
        }
    }
}

if (searchInput) {
    searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            performSearch();
        }
    });
}

if (searchBtn) {
    searchBtn.addEventListener("click", function(e) {
        e.preventDefault();
        performSearch();
    });
}

if (clearBtn) {
    clearBtn.addEventListener("click", function(e) {
        e.preventDefault();
        currentCustomerSelectionId++;
        currentContactRequestId++;
        currentContactLoadPromise = Promise.resolve(null);
        searchInput.value = '';
        clearContractDetails();
        clearCustomerDetails();
        clearContactTables();
        showContractDetailLoading(false);
        document.getElementById("customerCount").innerText = "0";
        document.getElementById("searchResultBody").innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">ไม่พบรายการ</td></tr>';

        currentContactData = null;
        currentCustomerSearchData = [];
        currentCustomerCompanyFilter = 'ALL';
        renderProductSummary(null);
        renderCompanyTabs();

        const personTabBtn = document.querySelector('.button-tab-contact[data-target="tab-table-person"]');
        if (personTabBtn && !personTabBtn.classList.contains('active')) {
            personTabBtn.click();
        }
    });
}

const getContactBtn = document.getElementById("getContactBtn");
if (getContactBtn) {
    getContactBtn.addEventListener("click", function(e) {
        e.preventDefault();
        const activeRow = document.querySelector('#searchResultBody tr[data-index].active-row');
        const customerIndex = activeRow ? Number(activeRow.dataset.index) : -1;
        const selectedCustomer = currentCustomerSearchData[customerIndex];
        if (selectedCustomer) {
            loadCustomerSelection(selectedCustomer, customerIndex);
        }
    });
}

// Tab selection logic
const tabLinks = document.querySelectorAll('.crm-tabs .nav-link');
const detailHeader = document.getElementById('dynamic-detail-header');
const tabContents = document.querySelectorAll('.tab-content-pane');

function setContractTabEnabled(enabled) {
    const contractTab = document.querySelector('.crm-tabs .nav-link[data-target="tab-content-contract"]');
    if (!contractTab) return;
    if (enabled) {
        contractTab.classList.remove('disabled');
        contractTab.removeAttribute('aria-disabled');
    } else {
        contractTab.classList.add('disabled');
        contractTab.setAttribute('aria-disabled', 'true');
        // If contract tab was active, switch back to customer info tab
        if (contractTab.classList.contains('active')) {
            const infoTab = document.querySelector('.crm-tabs .nav-link[data-target="tab-content-info"]');
            if (infoTab) infoTab.click();
        }
    }
}

tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        if (this.classList.contains('active') || this.classList.contains('disabled')) return;

        tabLinks.forEach(t => {
            t.classList.remove('active');
            t.classList.add('text-muted');
        });

        this.classList.add('active');
        this.classList.remove('text-muted');

        if (detailHeader) {
            detailHeader.textContent = 'รายละเอียด' + this.textContent.trim();
        }

        const targetId = this.getAttribute('data-target');
        tabContents.forEach(content => {
            if (content.id === targetId) {
                content.classList.remove('d-none');
            } else {
                content.classList.add('d-none');
            }
        });
    });
});

// Sub-tab selection logic for contract section (Event Delegation)
document.addEventListener('click', async function(e) {
    const btn = e.target.closest('.button-tab-contact');
    if (!btn) return;

    // Company buttons are customer filters. Handle them before the generic tab
    // logic because they intentionally do not have a data-target attribute.
    if (btn.closest('#contact-company-tabs') && btn.hasAttribute('data-company-filter')) {
        e.preventDefault();
        const company = btn.getAttribute('data-company-filter') || 'ALL';
        const companyLabel = company === 'ALL' ? 'ทุกบริษัท' : company;

        startLoading(
            'กำลังกรองข้อมูลบริษัท...',
            `ระบบกำลังจัดเตรียมข้อมูล ${companyLabel} กรุณารอสักครู่...`
        );

        try {
            // Yield after showing the overlay so it is painted before filtering
            // a large number of customer and contract rows.
            await waitForBrowserPaint();
            const visibleCount = await applyCustomerCompanyFilter(company);
            showContractCompanyPane(company);
            showLoading(
                'กำลังแสดงข้อมูลบริษัท...',
                `พบข้อมูล ${visibleCount.toLocaleString('th-TH')} รายการ กำลังจัดเตรียมหน้าจอ...`
            );
            await waitForBrowserPaint();
        } catch (error) {
            console.error('Error applying company filter:', error);
        } finally {
            stopLoading();
        }
        return;
    }

    e.preventDefault();
    if (btn.classList.contains('active')) return;

    // Find the parent container of the clicked button
    const parentGroup = btn.closest('.d-flex');
    if (!parentGroup) return;
    
    // Find all buttons in the same group
    const groupButtons = parentGroup.querySelectorAll('.button-tab-contact');

    // Remove active class from all buttons in this group
    groupButtons.forEach(b => b.classList.remove('active'));
    
    // Add active class to the clicked button
    btn.classList.add('active');

    // Hide all target contents associated with this group
    const targetIds = Array.from(groupButtons).map(b => b.getAttribute('data-target'));
    targetIds.forEach(id => {
        if (id) {
            document.querySelectorAll(`[id="${id}"]`).forEach(content => {
                content.classList.add('d-none');
                content.classList.remove('show', 'active');
            });
        }
    });

    // Show the selected target content
    const targetId = btn.getAttribute('data-target');
    if (targetId) {
        const targetContents = document.querySelectorAll(`[id="${targetId}"]`);
        targetContents.forEach(targetContent => {
            targetContent.classList.remove('d-none');
            targetContent.classList.add('show', 'active');
        });
                
                // Adjust DataTables when Guarantor, Payment, or MIB Claim tab becomes visible
                setTimeout(() => {
                    if (targetId === "tab-content-contact-guarantor" && $.fn.DataTable.isDataTable('#tab-table-guarantor')) {
                        $('#tab-table-guarantor').DataTable().columns.adjust();
                    }
                    if (targetId === "tab-content-contact-payment" && $.fn.DataTable.isDataTable('#tab-table-payment')) {
                        $('#tab-table-payment').DataTable().columns.adjust();
                    }
                    if (targetId === "tab-content-contact-MIB-claim" && $.fn.DataTable.isDataTable('#tab-table-claim')) {
                        $('#tab-table-claim').DataTable().columns.adjust();
                    }
                }, 100);
            }

            if (targetId === "tab-table-contact") {
                setContractTabEnabled(true);
                const tabs = document.getElementById("contact-company-tabs");
                if (tabs) {
                    tabs.classList.remove("d-none");

                    // Ensure an active company tab button exists and its pane is visible
                    let activeCompBtn = tabs.querySelector('.button-tab-contact.active') || tabs.querySelector('.button-tab-contact');
                    if (activeCompBtn) {
                        tabs.querySelectorAll('.button-tab-contact').forEach(b => b.classList.remove('active'));
                        activeCompBtn.classList.add('active');

                        const compTargetId = activeCompBtn.getAttribute('data-target');
                        if (compTargetId) {
                            tabs.querySelectorAll('.button-tab-contact').forEach(btn => {
                                const id = btn.getAttribute('data-target');
                                if (id) {
                                    document.querySelectorAll(`[id="${id}"]`).forEach(el => {
                                        el.classList.add('d-none');
                                        el.classList.remove('show', 'active');
                                    });
                                }
                            });
                            document.querySelectorAll(`[id="${compTargetId}"]`).forEach(el => {
                                el.classList.remove('d-none');
                                el.classList.add('show', 'active');
                            });
                        }
                    }
                }
                
                setTimeout(() => {
                    ['#dt-contact-Micro', '#dt-contact-MFIN', '#dt-contact-MIB'].forEach(id => {
                        if ($.fn.DataTable.isDataTable(id)) {
                            $(id).DataTable().columns.adjust();
                        }
                    });
                }, 50);
            } else if (targetId === "tab-table-person") {
                setContractTabEnabled(false);
                const tabs = document.getElementById("contact-company-tabs");
                if (tabs) tabs.classList.toggle("d-none", currentCustomerSearchData.length === 0);
            }

            // Abort pending requests and clear UI when switching company tabs
            if (targetId.toLowerCase().startsWith("contact-")) {
                updateContactTabLabel(targetId);
            }
            if (targetId.toLowerCase() === "contact-micro" || targetId.toLowerCase() === "contact-mfin" || targetId.toLowerCase() === "contact-mib") {
                const loadingInd = document.getElementById("contract-loading-indicator");
                const detailsCont = document.getElementById("contract-details-container");
                if (loadingInd && detailsCont) {
                    loadingInd.classList.add("d-none");
                    detailsCont.classList.remove("d-none");
                }
                clearContractDetails();
            }

            // Change tab layout when switching company tab
            if (targetId.toLowerCase() === "contact-micro" || targetId.toLowerCase() === "contact-mfin") {
                // Adjust DataTables when switching sub-tabs
                setTimeout(() => {
                    if ($.fn.DataTable.isDataTable('#dt-' + targetId)) {
                        $('#dt-' + targetId).DataTable().columns.adjust();
                    }
                }, 50);
                
                const tabNormal = document.getElementById("tab-buttons-normal");
                const tabMib = document.getElementById("tab-buttons-mib");
                if (tabNormal && tabMib) {
                    tabNormal.classList.remove("d-none");
                    tabMib.classList.add("d-none");

                    // Hide ALL content panes from both groups first
                    ['tab-content-contact-detail','tab-content-contact-loan','tab-content-contact-guarantor','tab-content-contact-payment',
                     'tab-content-contact-MIB-detail','tab-content-contact-MIB-insurance','tab-content-contact-MIB-claim'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) { el.classList.add('d-none'); el.classList.remove('show','active'); }
                    });

                    // Reset active on all sub-tab buttons
                    document.querySelectorAll('#tab-buttons-normal .button-tab-contact, #tab-buttons-mib .button-tab-contact').forEach(b => b.classList.remove('active'));

                    // Activate first normal tab
                    const normalBtn = document.querySelector('#tab-buttons-normal .button-tab-contact[data-target="tab-content-contact-detail"]');
                    if (normalBtn) {
                        normalBtn.classList.add('active');
                        const firstContent = document.getElementById('tab-content-contact-detail');
                        if (firstContent) { firstContent.classList.remove('d-none'); firstContent.classList.add('show','active'); }
                    }
                }
            } else if (targetId.toLowerCase() === "contact-mib") {
                setTimeout(() => {
                    if ($.fn.DataTable.isDataTable('#dt-' + targetId)) {
                        $('#dt-' + targetId).DataTable().columns.adjust();
                    }
                }, 50);

                const tabNormal = document.getElementById("tab-buttons-normal");
                const tabMib = document.getElementById("tab-buttons-mib");
                if (tabNormal && tabMib) {
                    tabNormal.classList.add("d-none");
                    tabMib.classList.remove("d-none");

                    // Hide ALL content panes from both groups first
                    ['tab-content-contact-detail','tab-content-contact-loan','tab-content-contact-guarantor','tab-content-contact-payment',
                     'tab-content-contact-MIB-detail','tab-content-contact-MIB-insurance','tab-content-contact-MIB-claim'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) { el.classList.add('d-none'); el.classList.remove('show','active'); }
                    });

                    // Reset active on all sub-tab buttons
                    document.querySelectorAll('#tab-buttons-normal .button-tab-contact, #tab-buttons-mib .button-tab-contact').forEach(b => b.classList.remove('active'));

                    // Activate first MIB tab
                    const mibBtn = document.querySelector('#tab-buttons-mib .button-tab-contact[data-target="tab-content-contact-MIB-detail"]');
                    if (mibBtn) {
                        mibBtn.classList.add('active');
                        const firstContent = document.getElementById('tab-content-contact-MIB-detail');
                        if (firstContent) { firstContent.classList.remove('d-none'); firstContent.classList.add('show','active'); }
                    }
                }
            }
    });

function showContractDetailLoading(show) {
    const loadingInd = document.getElementById("contract-loading-indicator");
    const detailsCont = document.getElementById("contract-details-container");
    if (loadingInd) loadingInd.classList.toggle("d-none", !show);
    if (detailsCont) detailsCont.classList.toggle("d-none", show);
}

function buildCustomerContractCard(customer, match) {
    const rawCompany = (customer.companyCde || customer.CompanyCde || '').toString().trim();
    const companyUpper = rawCompany.toUpperCase();
    const itemLabel = (companyUpper === 'MIB') ? 'กรมธรรม์' : 'สัญญา';

    const val = (v) => (v == null || v === '' || v === '-') ? '-' : v;

    if (match === undefined) {
        return `
            <div class="mx-3 mb-3 mt-1 p-3 rounded-3 border bg-white text-muted small d-flex align-items-center gap-2">
                <i class="bi bi-cursor"></i> คลิกเพื่อดูข้อมูล${itemLabel}
            </div>`;
    }

    // Currently loading contract data for this customer.
    if (match === 'loading') {
        return `
            <div class="mx-3 mb-3 mt-1 p-3 rounded-3 border bg-white text-muted small d-flex align-items-center gap-2">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                กำลังโหลดข้อมูล${itemLabel}...
            </div>`;
    }

    // Loaded but no matching contract found.
    if (!match) {
        return `
            <div class="mx-3 mb-3 mt-1 p-3 rounded-3 border bg-white text-muted small">
                ไม่มีข้อมูล${itemLabel}
            </div>`;
    }

    const { contract, company } = match;
    const companyLabel = (company === 'MIB') ? 'กรมธรรม์' : 'สัญญา';

    // Full set of columns matching the contract list table headers.
    let fields;
    if (company === 'MIB') {
        fields = [
            { label: 'สถานะกรมธรรม์', value: val(contract.contsts) },
            { label: 'เลขที่กรมธรรม์', value: val(contract.contno) },
            { label: 'เลขที่ใบคำขอ', value: val(contract.applno) },
            { label: 'ประเภทผลิตภัณฑ์', value: val(contract.loantype) },
            { label: 'เลขที่รับแจ้ง', value: val(contract.trackingMIB) }
        ];
    } else {
        fields = [
            { label: 'สถานะสัญญา', value: val(contract.contsts) },
            { label: 'สัญญาเลขที่', value: val(contract.contno) },
            { label: 'เลขที่ใบคำขอ', value: val(contract.applno) },
            { label: 'ประเภทสินเชื่อ', value: val(contract.loantype) },
            { label: 'ประเภทสัญญา', value: val(contract.conttype) }
        ];
    }

    const rows = fields.map(f => `
        <div class="d-flex align-items-center justify-content-between py-1">
            <span class="text-muted small">${f.label}</span>
            <span class="text-dark fw-medium text-end">${f.value}</span>
        </div>`).join('');

    return `
        <div class="mx-3 mb-3 mt-1 p-3 rounded-3 border bg-white contract-card-detail">
            <div class="fw-medium text-dark mb-2">
                <i class="bi bi-file-earmark-text me-1"></i>ข้อมูล${companyLabel}
            </div>
            ${rows}
        </div>`;
}

// Show a loading state inside a customer's contract card while its data is fetched.
function setContractCardLoading(customerIndex, customer) {
    const cardRow = document.querySelector(`#searchResultBody tr.customer-contract-card-row[data-card-index="${customerIndex}"]`);
    if (!cardRow) return;
    const cell = cardRow.querySelector('td');
    if (!cell) return;
    cell.innerHTML = buildCustomerContractCard(customer, 'loading');
}

function getContractActiveState(contract) {
    if (!contract) return null;

    const rawValue = contract.IsActive ?? contract.isActive ?? contract.active;
    if (rawValue == null || rawValue === '') return null;

    if (rawValue === true || rawValue === 1) return true;
    if (rawValue === false || rawValue === 0) return false;

    const normalized = String(rawValue).trim().toUpperCase();
    if (['1', 'TRUE', 'A', 'ACTIVE', 'Y', 'YES'].includes(normalized)) return true;
    if (['0', 'FALSE', '', 'INACTIVE', 'N', 'NO'].includes(normalized)) return false;

    return null;
}

function updateCustomerActiveStatus(customerIndex, customer, contract) {
    const customerRow = document.querySelector(`#searchResultBody tr[data-index="${customerIndex}"]`);
    if (!customerRow) return;

    const rawContractNumber = customer?.contno ?? customer?.Contno;
    const normalizedContractNumber = rawContractNumber == null
        ? ''
        : String(rawContractNumber).trim();
    const isMissingContractNumber = normalizedContractNumber === '' || normalizedContractNumber === '-';
    const activeState = getContractActiveState(contract);
    const isInactive = activeState === false;

    const statusKey = isMissingContractNumber
        ? 'missing-contract-number'
        : (activeState === true ? 'true' : (isInactive ? 'false' : 'not-found'));

    customerRow.dataset.activeStatus = statusKey;
    customerRow.classList.toggle('inactive-customer-row', isInactive);

    const cardRow = document.querySelector(`#searchResultBody tr.customer-contract-card-row[data-card-index="${customerIndex}"]`);
    if (cardRow) cardRow.classList.toggle('inactive-customer-card', isInactive);

    const statusCell = customerRow.querySelector('.customer-active-status');
    if (statusCell) {
        statusCell.textContent = isMissingContractNumber
            ? 'ไม่พบเลขที่สัญญา'
            : (activeState === true ? 'A' : (isInactive ? '' : 'ไม่พบ'));
        statusCell.title = isMissingContractNumber
            ? 'ไม่พบเลขที่สัญญา'
            : (activeState === true ? 'A' : (isInactive ? '' : 'ไม่พบข้อมูลสัญญา'));
        statusCell.classList.toggle('fw-medium', activeState !== null);
        statusCell.classList.toggle('text-dark', activeState === true);
        statusCell.classList.toggle('text-muted', activeState !== true);
    }
}

function reorderCustomerRowsByActiveStatus() {
    const tbody = document.getElementById('searchResultBody');
    if (!tbody) return;

    const customerRows = Array.from(tbody.querySelectorAll('tr[data-index]'));
    const priority = {
        true: 0,
        false: 1,
        'not-found': 2,
        unknown: 2,
        'missing-contract-number': 3
    };
    customerRows.sort((a, b) =>
        (priority[a.dataset.activeStatus || 'unknown'] ?? 3) -
        (priority[b.dataset.activeStatus || 'unknown'] ?? 3)
    );

    customerRows.forEach(customerRow => {
        const index = customerRow.dataset.index;
        const cardRow = tbody.querySelector(`tr.customer-contract-card-row[data-card-index="${index}"]`);
        tbody.appendChild(customerRow);
        if (cardRow) tbody.appendChild(cardRow);
    });

}

// Re-render the contract card for a specific customer row once contract data
// has been loaded, filling in the full set of contract columns.
function updateContractCard(customerIndex, customer, contactData) {
    const cardRow = document.querySelector(`#searchResultBody tr.customer-contract-card-row[data-card-index="${customerIndex}"]`);
    const customerRow = document.querySelector(`#searchResultBody tr[data-index="${customerIndex}"]`);
    if (!cardRow || !customerRow) return;

    const cell = cardRow.querySelector('td');
    const toggle = customerRow.querySelector('.customer-contract-inline-toggle');
    if (!cell || !toggle) return;

    const wasExpanded = cardRow.dataset.expanded === 'true';
    const match = findMatchingContract(customer, contactData) || null;
    cell.innerHTML = buildCustomerContractCard(customer, match);
    updateCustomerActiveStatus(customerIndex, customer, match?.contract || null);

    // Preserve an expansion requested while the asynchronous contract data was
    // loading, and keep the row, button, and chevron state synchronized.
    cardRow.dataset.expanded = wasExpanded ? 'true' : 'false';
    cardRow.classList.toggle('d-none', !wasExpanded);
    customerRow.classList.toggle('contract-expanded', wasExpanded);
    toggle.setAttribute('aria-expanded', wasExpanded ? 'true' : 'false');
    const chevron = toggle.querySelector('.customer-contract-inline-chevron');
    if (chevron) {
        chevron.classList.toggle('bi-chevron-down', !wasExpanded);
        chevron.classList.toggle('bi-chevron-up', wasExpanded);
    }

    // Every customer-list row represents a contract/policy, so always keep the
    // expand control visible after loading. If matching failed, expanding the
    // row explains that no matching detail was returned instead of silently
    // hiding the control.
    toggle.classList.remove('d-none');

    if (match) {
        const { contract, company } = match;
        // ใช้ "เลขที่สัญญา" (contno) เป็นคีย์สำหรับทุกบริษัท
        const targetKey = customer.contno || '';
        toggle.setAttribute('data-company', company);
        toggle.setAttribute('data-target-key', encodeURIComponent(targetKey));
        toggle.setAttribute('data-contract', encodeURIComponent(JSON.stringify(contract)));
        toggle.title = company === 'MIB' ? 'เปิดข้อมูลกรมธรรม์' : 'เปิดข้อมูลสัญญา';
    } else {
        toggle.removeAttribute('data-company');
        toggle.removeAttribute('data-target-key');
        toggle.removeAttribute('data-contract');
        toggle.title = 'ขยายเพื่อดูผลการค้นหาข้อมูลสัญญา';
    }
}

// Fill every row, including rows with no matching contact. This clears stale
// state and gives unmatched rows an explicit status/card rather than blanks.
function fillAllContractCards(customers, contactData) {
    if (!Array.isArray(customers)) return;
    customers.forEach((cust, index) => {
        updateContractCard(index, cust, contactData || {});
    });
    reorderCustomerRowsByActiveStatus();
}

// Find the contract/policy that matches the selected customer.
// Mapping rules:
//   MICRO -> match by contno (สัญญาเลขที่)
//   MFIN  -> match by contno (สัญญาเลขที่)
//   MIB   -> match by applno (เลขที่ใบคำขอ)
function findMatchingContract(customer, contactData) {
    if (!customer || !contactData) return null;

    const rawCompany = (customer.companyCde || customer.CompanyCde || '').toString().trim();
    const companyUpper = rawCompany.toUpperCase();

    // Normalise a value for comparison: string, trimmed, upper-cased.
    const norm = (v) => (v == null ? '' : v.toString().trim().toUpperCase());
    // Numeric-only form (drops leading zeros / non-digits) as a fallback compare.
    const digits = (v) => norm(v).replace(/\D/g, '').replace(/^0+/, '');

    const custContno = norm(customer.contno || customer.Contno);
    const custApplno = norm(customer.applno || customer.Applno);
    const custTrackingMIB = norm(customer.trackingMIB || customer.TrackingMIB);

    let list = [];
    let company = '';
    // Preferred key per company; fall back to the other keys if needed so a
    // matching contract number is still found even when it lives in a different field.
    let preferredKey = 'contno';

    if (companyUpper === 'MICRO') {
        list = contactData.contactMicro || [];
        company = 'Micro';
        preferredKey = 'contno';
    } else if (companyUpper === 'MFIN') {
        list = contactData.contactMFIN || [];
        company = 'MFIN';
        preferredKey = 'contno';
    } else if (companyUpper === 'MIB') {
        list = contactData.contactMIB || [];
        company = 'MIB';
        // preferredKey = 'applno';
        preferredKey = 'trackingMIB';
    } else {
        return null;
    }

    list = list || [];
    if (list.length === 0) return null;

    // Candidate values from the customer to match against (the customer usually
    // only carries contno, but applno is checked too when present).
    const custValues = [custContno, custApplno, custTrackingMIB].filter(Boolean);
    if (custValues.length === 0) return null;

    // Keys on a contract that could hold the number, preferred key first.
    const contractKeys = [preferredKey, 'contno', 'trackingMIB'];

    const matchesContract = (item, comparator) => {
        // Pre-compute normalised customer values once.
        const custComparable = custValues.map(comparator).filter(Boolean);
        if (custComparable.length === 0) return false;

        for (const ck of contractKeys) {
            const ckVal = item[ck];
            if (ckVal == null || ckVal === '') continue;
            const ckComparable = comparator(ckVal);
            if (!ckComparable) continue;
            if (custComparable.includes(ckComparable)) {
                return true;
            }
        }
        return false;
    };

    // 1) Exact (normalised) match first.
    let contract = list.find(item => matchesContract(item, norm));

    // 2) Fall back to digit-only comparison (handles leading zeros / formatting).
    if (!contract) {
        contract = list.find(item => matchesContract(item, digits));
    }

    if (!contract) return null;

    return { contract, company };
}

// Auto-select and display the contract row that maps to the selected customer.
function autoSelectMatchingContract(customer, contactData) {
    const match = findMatchingContract(customer, contactData);
    if (!match) return;

    const { contract, company } = match;

    // The DataTable renders each row with an onclick that calls getContactInfo.
    // Locate the rendered row so we reuse the exact same target/highlight behaviour.
    const tableId = company === 'Micro'
        ? '#dt-contact-Micro'
        : (company === 'MFIN' ? '#dt-contact-MFIN' : '#dt-contact-MIB');

    // ใช้ "เลขที่สัญญา" (contno) เป็นคีย์สำหรับทุกบริษัท
    const targetKey = customer.contno || '';
    if (window.jQuery && $.fn && $.fn.DataTable && $.fn.DataTable.isDataTable(tableId)) {
        const dt = $(tableId).DataTable();
        let matchedNode = null;
        dt.rows().every(function () {
            const rowData = this.data();
            if (!rowData) return;
            const rowMatch = company === 'MIB'
                ? ((rowData.applno || '').toString().trim() === (contract.applno || '').toString().trim())
                : ((rowData.contno || '').toString().trim() === (contract.contno || '').toString().trim());
            if (rowMatch && !matchedNode) {
                matchedNode = this.node();
            }
        });

        if (matchedNode) {
            const encoded = encodeURIComponent(JSON.stringify(contract));
            getContactInfo(targetKey, company, encoded, matchedNode);
            return;
        }
    }

    // Fallback: call directly if the row node could not be located.
    const encoded = encodeURIComponent(JSON.stringify(contract));
    getContactInfo(targetKey, company, encoded, null);
}

async function getContact(idno) {
    const requestId = ++currentContactRequestId;
    try {
        renderProductSummary(currentContactData, true);

        const contactCacheKey = String(idno ?? '').trim();
        let data = contactListCache.get(contactCacheKey);

        if (!data) {
            const contactUrl = `/CustomerDetail/GetContact?idno=${encodeURIComponent(idno)}`;

            const response = await fetch(contactUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            data = await response.json();

            if (requestId !== currentContactRequestId) {
                return null;
            }

            if (data) {
                contactListCache.set(contactCacheKey, data);
            }
        } else if (requestId !== currentContactRequestId) {
            return null;
        }

        if (data) {
            currentContactData = data;

            renderProductSummary(data);
            renderCompanyTabs();

            function loadDataTable(tableId, dataList, company, idno) {
                const sortedDataList = [...(dataList || [])].sort((a, b) => {
                    const aActive = a.IsActive;
                    const bActive = b.IsActive;
                    if (aActive && !bActive) return -1;
                    if (!aActive && bActive) return 1;
                    return 0;
                });

                const dtConfig = {
                    data: sortedDataList,
                    destroy: true,
                    columns: [
                        { data: row => row.contno || '-' },
                        { data: row => {
                            if (company === 'MIB') {
                                return row.trackingMIB || '-';
                            }
                            return row.applno || '-';
                        }},
                        { data: row => row.conttype || '-' },
                        { data: row => row.loantype  || '-' }
                    ],
                    createdRow: function (row, data, dataIndex) {
                        $(row).addClass('hover-row border-bottom cursor-pointer contract-row');
                        $(row).find('td').addClass('text-center py-3 contract-col');

                        if (data.IsActive) {
                            $(row).find('td').css('color', '#1e293b');
                        } else {
                            $(row).find('td').css('color', '#94a3b8');
                        }

                        const cEncoded = encodeURIComponent(JSON.stringify(data));
   
                        // ใช้ "เลขที่สัญญา" (contno) จากข้อมูลลูกค้าแทน idno สำหรับทุกบริษัท
                        const targetContno = data.contno;
                        $(row).attr('onclick', `getContactInfo('${targetContno}', '${company}', '${cEncoded}', this)`);
                    },
                    language: {
                        emptyTable: "ไม่พบข้อมูล",
                        search: "ค้นหา:",
                        lengthMenu: "แสดง _MENU_ รายการ",
                        info: "แสดงรายการ _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
                        infoEmpty: "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ",
                        paginate: {
                            first: "หน้าแรก",
                            last: "หน้าสุดท้าย",
                            next: "ถัดไป",
                            previous: "ก่อนหน้า"
                        }
                    },
                    pageLength: 5,
                    lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
                    dom: '<"row flex-shrink-0 mx-0"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>><"flex-grow-1 overflow-auto min-vh-0"t><"row flex-shrink-0 mx-0 pt-2"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                    order: []
                };

                if ($.fn.DataTable.isDataTable(tableId)) {
                    $(tableId).DataTable().clear().rows.add(sortedDataList || []).draw();
                } else {
                    $(tableId).DataTable(dtConfig);
                }
            }

            loadDataTable('#dt-contact-Micro', data.contactMicro, 'Micro', idno);
            loadDataTable('#dt-contact-MFIN', data.contactMFIN, 'MFIN', idno);
            loadDataTable('#dt-contact-MIB', data.contactMIB, 'MIB', idno);
            fillAllContractCards(currentCustomerSearchData, data);

            return data;
        }

        return null;
    } catch (error) {
        if (requestId === currentContactRequestId) {
            console.error("Error fetching contact:", error);
        }
        return null;
    }
}

const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB');
};

const formatValues = (value) => {
    if (value != null && value !== '') {
        return Number(value).toLocaleString('en-US');
    } else {
        return '-';
    }
};

async function getContactInfo(idno, company, encodedC, clickedRow) {
    if (clickedRow && clickedRow.classList.contains('active-row')) return;
    const requestId = ++currentContactInfoRequestId;

    // Open the contract detail component immediately and render loading inside
    // that component. This keeps the customer/contract list interactive so the
    // user can select another item while the current request is still loading.
    setContractTabEnabled(true);
    const contractTab = document.querySelector('.crm-tabs .nav-link[data-target="tab-content-contract"]');
    if (contractTab && !contractTab.classList.contains('active')) {
        contractTab.click();
    }
    // Determine up front whether this contract's data is already cached.
    // When it is, we render straight from cache without ever showing the
    // loading indicator, so going back to an already-viewed contract does not
    // flash a spinner or trigger a reload.
    const preCacheKey = `${normalizeCompanyName(company)}|${String(idno ?? '').trim()}`;
    const isCached = contactInfoCache.has(preCacheKey);

    if (!isCached) {
        showContractDetailLoading(true);
    }
    try {
        // Apply highlight to the clicked row
        if (clickedRow) {
            // Remove highlight from all rows in the same table
            const tbody = clickedRow.closest('tbody');
            if (tbody) {
                const allRows = tbody.querySelectorAll('tr.contract-row');
                allRows.forEach(r => {
                    r.classList.remove('active-row');
                    r.classList.add('hover-row');
                    // Reset text styling
                    const cols = r.querySelectorAll('.contract-col');
                    cols.forEach(col => col.classList.remove('fw-medium', 'text-primary'));
                });
            }
            
            // Add highlight to the clicked row
            clickedRow.classList.add('active-row');
            clickedRow.classList.remove('hover-row');
            const cols = clickedRow.querySelectorAll('.contract-col');
            cols.forEach(col => col.classList.add('fw-medium', 'text-primary'));
        }
        const c = JSON.parse(decodeURIComponent(encodedC));
        const contactInfoUrl = `/CustomerDetail/GetContactInfo?idno=${encodeURIComponent(idno)}&company=${encodeURIComponent(company)}`;

        if (normalizeCompanyName(company) === 'MFIN') {
            const requestContno = String(idno ?? '');
            const mfinList = Array.isArray(currentContactData?.contactMFIN) ? currentContactData.contactMFIN : [];
            const exactMatches = mfinList.filter(item => String(item.contno ?? '').trim() === requestContno.trim());
            const selectedRowData = clickedRow && window.jQuery && $.fn && $.fn.DataTable
                ? (() => {
                    try {
                        const table = $(clickedRow).closest('table').DataTable();
                        return table.row(clickedRow).data();
                    } catch (error) {
                        return null;
                    }
                })()
                : null;
        }
        
        // Show loading indicators for the whole box only when we actually need
        // to fetch. For a cached contract we keep the current details visible
        // and just swap in the cached values, avoiding any loading flash.
        if (!isCached) {
            document.getElementById("contract-loading-indicator").classList.remove("d-none");
            document.getElementById("contract-details-container").classList.add("d-none");
        }

        const cacheKey = preCacheKey;
        let data = contactInfoCache.get(cacheKey);

        if (!data) {
            const response = await fetch(contactInfoUrl);

            if (requestId !== currentContactInfoRequestId) {
                return;
            }

            if (!response.ok) {
                const errorBodyText = await response.text();
                let errorBody = errorBodyText;
                try {
                    errorBody = errorBodyText ? JSON.parse(errorBodyText) : null;
                } catch (parseError) {
                    // Keep the raw response text when it is not JSON.
                }

                clearContractDetails();
                const container = document.getElementById("contract-details-container");
                if (container) {
                    container.classList.remove("d-none");
                    const notice = document.getElementById("contract-detail-error-notice");
                    if (notice) notice.remove();
                }
                document.getElementById("contract-loading-indicator").classList.add("d-none");
                console.warn(`GetContactInfo returned ${response.status} for ${company} ${idno}`, errorBody);
                return;
            }

            data = await response.json();

            contactInfoCache.set(cacheKey, data);
        }

        if (requestId !== currentContactInfoRequestId) {
            return;
        }

        const contract = data.contractInfo?.[0] || {};

         // Update UI with actual data
        if (contract) {
            setContractTabEnabled(true);
            const contractTab = document.querySelector('.crm-tabs .nav-link[data-target="tab-content-contract"]');
            if (contractTab && !contractTab.classList.contains('active')) {
                contractTab.click();
            }

            // Reset every sub-tab pane and button from BOTH groups first, so no
            // heading/content from the previously viewed company stays behind.
            const allSubPaneIds = [
                'tab-content-contact-detail', 'tab-content-contact-loan',
                'tab-content-contact-guarantor', 'tab-content-contact-payment',
                'tab-content-contact-MIB-detail', 'tab-content-contact-MIB-insurance',
                'tab-content-contact-MIB-claim'
            ];
            allSubPaneIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.classList.add('d-none'); el.classList.remove('show', 'active'); }
            });
            document.querySelectorAll('#tab-buttons-normal .button-tab-contact, #tab-buttons-mib .button-tab-contact')
                .forEach(b => b.classList.remove('active'));

            if (company === "MIB") {
                document.getElementById("tab-buttons-normal").classList.add("d-none");
                document.getElementById("tab-buttons-mib").classList.remove("d-none");
                updateContactTabLabel("MIB");
                const mibBtn = document.querySelector('#tab-buttons-mib .button-tab-contact[data-target="tab-content-contact-MIB-detail"]');
                if (mibBtn) {
                    mibBtn.classList.add('active');
                    const firstPane = document.getElementById('tab-content-contact-MIB-detail');
                    if (firstPane) { firstPane.classList.remove('d-none'); firstPane.classList.add('show', 'active'); }
                }
            } else {
                document.getElementById("tab-buttons-normal").classList.remove("d-none");
                document.getElementById("tab-buttons-mib").classList.add("d-none");
                updateContactTabLabel(company);
                const normalBtn = document.querySelector('#tab-buttons-normal .button-tab-contact[data-target="tab-content-contact-detail"]');
                if (normalBtn) {
                    normalBtn.classList.add('active');
                    const firstPane = document.getElementById('tab-content-contact-detail');
                    if (firstPane) { firstPane.classList.remove('d-none'); firstPane.classList.add('show', 'active'); }
                }
            }

            //#region ข้อมูลสัญญา
            
            if (company == "Micro"){
                document.getElementById("contract-detail-contno").innerText = contract.contno || '-';
                document.getElementById("contract-detail-loantype").innerText = contract.loantype || '-';
                document.getElementById("contract-detail-company").innerText = contract.companyCde || '-';
                document.getElementById("contract-detail-veh-type").innerText = contract.category || '-';
                document.getElementById("contract-detail-veh-brand").innerText = contract.brand || '-';
                document.getElementById("contract-detail-veh-year").innerText = contract.year || '-';
                document.getElementById("contract-detail-channel").innerText = contract.chanel || '-';
                document.getElementById("contract-detail-license").innerText = contract.plateNo || '-';
                document.getElementById("contract-detail-old-contno").innerText =
                    (contract.contnoOld === 0 || contract.contnoOld === "0")
                        ? "-"
                        : (contract.contnoOld ?? "-");
                document.getElementById("contract-detail-province").innerText = contract.province || '-';
                document.getElementById("contract-detail-branch").innerText = contract.branch || '-';
                document.getElementById("contract-detail-collector").innerText = contract.colcde || '-';

                getReceiveList(contract.contno, "Micro");
            }

            if (company == "MFIN"){

                document.getElementById("contract-detail-contno").innerText = contract.contno || '-';
                document.getElementById("contract-detail-loantype").innerText = contract.conttype || '-';
                document.getElementById("contract-detail-company").innerText = contract.companyCde || '-';
                document.getElementById("contract-detail-veh-type").innerText = contract.category || '-';
                document.getElementById("contract-detail-veh-brand").innerText = contract.brand || '-';
                document.getElementById("contract-detail-veh-year").innerText = contract.year || '-';
                document.getElementById("contract-detail-channel").innerText = contract.chanel || '-';
                document.getElementById("contract-detail-license").innerText = contract.plateNo || '-';
                document.getElementById("contract-detail-old-contno").innerText =
                    (contract.contnoOld === 0 || contract.contnoOld === "0")
                        ? "-"
                        : (contract.contnoOld ?? "-");
                document.getElementById("contract-detail-province").innerText = contract.province || '-';
                document.getElementById("contract-detail-branch").innerText = contract.branch || '-';
                document.getElementById("contract-detail-collector").innerText = contract.colcde || '-';

                getReceiveList(contract.contno, "MFIN");
            }

            if (company == "MIB"){
                
                const parseAnyDate = (val) => {
                    if (!val) return null;
                    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
                    if (typeof val === 'number') return new Date(val);
                    let str = String(val).trim();
                    if (!str || str === '-') return null;

                    if (str.indexOf('/Date(') !== -1) {
                        const ms = parseInt(str.replace(/\/Date\((.*?)\)\//, '$1'), 10);
                        if (!isNaN(ms)) return new Date(ms);
                    }

                    let d = new Date(str);
                    if (!isNaN(d.getTime())) return d;

                    const parts = str.split(/[\/\-\sT:]/);
                    if (parts.length >= 3) {
                        let p0 = parseInt(parts[0], 10);
                        let p1 = parseInt(parts[1], 10) - 1;
                        let p2 = parseInt(parts[2], 10);
                        if (p0 > 31) d = new Date(p0, p1, p2);
                        else if (p2 > 31) d = new Date(p2, p1, p0);
                        else if (p0 <= 12 && p1 <= 31) d = new Date(p2, p0 - 1, p1);
                        if (d && !isNaN(d.getTime())) return d;
                    }
                    return null;
                };

                const formatDt = (date) => {
                    const d = parseAnyDate(date);
                    if (!d) return '-';
                    return d.toLocaleDateString('en-GB');
                };
                const formatNum = (val) => (val != null && val !== '') ? Number(val).toLocaleString('en-US') : '-';

                document.getElementById("mib-detail-policy-no").innerText = contract.policyNo || '-';
                document.getElementById("mib-detail-veh-category").innerText = contract.category || '-';
                document.getElementById("mib-detail-veh-year").innerText = contract.year || '-';
                document.getElementById("mib-detail-veh-brand").innerText = contract.brand || '-';
                document.getElementById("mib-detail-channel").innerText = contract.chanel || '-';
                document.getElementById("mib-detail-register").innerText = contract.Register || '-';
                document.getElementById("mib-detail-claim-count").innerText = contract.claimCount || '-';
                
                document.getElementById("mib-ins-plan").innerText = contract.commDesc || '-';
                document.getElementById("mib-ins-premium").innerText = formatNum(contract.premiumAmount);
                document.getElementById("mib-ins-company").innerText = contract.insComp || '-';
                document.getElementById("mib-ins-terms").innerText = contract.terminstall || '-';
                document.getElementById("mib-ins-cover-amount").innerText = formatNum(contract.coverAmount);
                document.getElementById("mib-ins-status-install").innerText = contract.statusInstall || '-';
                document.getElementById("mib-ins-start-date").innerText = '  '+formatDt(contract.startDate) || '-';
                document.getElementById("mib-ins-end-date").innerText = formatDt(contract.endDate) || '-';
                document.getElementById("mib-ins-payment-type").innerText = contract.payDesc || '-';

                let remainingDays = '-';
                let statusBgColor = '';
                let statusTextColor = '';

                const rawEndDate = contract.endDate || contract.enddate || contract.endDateCover || contract.expDate;
                const end = parseAnyDate(rawEndDate);

                if (end) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const endDateMidnight = new Date(end);
                    endDateMidnight.setHours(0, 0, 0, 0);

                    const diffTime = endDateMidnight.getTime() - today.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                    remainingDays = diffDays;

                    if (diffDays >= 90) {
                        statusBgColor = '#28a745'; // เขียว: คงเหลือตั้งแต่ 90 วันขึ้นไป
                        statusTextColor = '#ffffff';
                    } else if (diffDays >= 31) {
                        statusBgColor = '#ffc107'; // เหลือง: คงเหลือ 31-60 วัน (31-89 วัน)
                        statusTextColor = '#212529';
                    } else if (diffDays >= 1) {
                        statusBgColor = '#fd7e14'; // ส้ม: คงเหลือ 1-30 วัน
                        statusTextColor = '#ffffff';
                    } else if (diffDays >= -365) {
                        statusBgColor = '#dc3545'; // แดง: ขาดอายุไม่เกิน 1 ปี
                        statusTextColor = '#ffffff';
                    } else {
                        statusBgColor = '#6c757d'; // เทา: ขาดอายุเกิน 1 ปี
                        statusTextColor = '#ffffff';
                    }
                }

                const statusElem = document.getElementById("mib-ins-status");
                const statusContainer = document.getElementById("mib-ins-status-container") || (statusElem ? statusElem.closest('.d-flex') : null);

                if (statusElem) {
                    statusElem.innerText = contract.cancel || '-';
                }

                if (statusContainer) {
                    const labelSpan = statusContainer.querySelector('.detail-label-sm span') || statusContainer.querySelector('.detail-label-sm') || statusContainer.children[0];
                    if (statusBgColor) {
                        statusContainer.style.setProperty('background-color', statusBgColor, 'important');
                        statusContainer.style.setProperty('padding', '6px 12px', 'important');
                        statusContainer.style.setProperty('border-radius', '6px', 'important');
                        if (labelSpan) labelSpan.style.setProperty('color', statusTextColor, 'important');
                        if (statusElem) statusElem.style.setProperty('color', statusTextColor, 'important');
                    } else {
                        statusContainer.style.removeProperty('background-color');
                        statusContainer.style.removeProperty('padding');
                        statusContainer.style.removeProperty('border-radius');
                        if (labelSpan) labelSpan.style.removeProperty('color');
                        if (statusElem) statusElem.style.removeProperty('color');
                    }
                }

                const remDaysElem = document.getElementById("mib-ins-remaining-days");
                if (remDaysElem) remDaysElem.innerText = remainingDays;

                // Fetch claim list using the application number from the MIB table
                getClaimList(c.trackingMIB || idno);
            }

            //#endregion

            //#region ข้อมูลสินเชื่อ

            document.getElementById("loan-detail-fianlamount").innerText = formatValues(contract.finamt);
            document.getElementById("loan-detail-aging").innerText = (contract.aging !== undefined && contract.aging !== null && contract.aging !== '') ? 'D' + contract.aging : '-';
            document.getElementById("loan-detail-appraisal").innerText = " "+formatValues(contract.estimatePrice);
            document.getElementById("loan-detail-status").innerText = contract.contsts || '-';
            document.getElementById("loan-detail-ltv").innerText =  formatValues(contract.ltv);
            document.getElementById("loan-detail-open-date").innerText = formatDate(contract.aprvdte);
            document.getElementById("loan-detail-balance").innerText = formatValues(contract.outsbal);
            document.getElementById("loan-detail-first-due-date").innerText = formatDate(contract.firstdte);
            document.getElementById("loan-detail-terms").innerText = contract.term || '-';
            document.getElementById("loan-detail-last-due-date").innerText = formatDate(contract.enddte);
            document.getElementById("loan-detail-termpaid").innerText = contract.termpaid || '-';
            document.getElementById("loan-detail-close-date").innerText = formatDate(contract.settledte);
            document.getElementById("loan-detail-overdue-days").innerText = formatValues(contract.DPD);
            document.getElementById("loan-detail-installment-amount").innerText = formatValues(contract.instamt) || '-';
            document.getElementById("loan-detail-overdue-terms").innerText = contract.totalOvd || '-';
            document.getElementById("loan-detail-insurance-due-date").innerText = formatDate(contract.insurancedte);
            document.getElementById("loan-detail-interest-rate").innerText = contract.rateFlat;
            document.getElementById("loan-detail-tax-due-date").innerText = formatDate(contract.taxdte);

            //#endregion

            //#region ข้อมูลผู้ค้ำประกัน

            const dtGuarantorConfig = {
                data: data.guarantorsInfo || [],
                destroy: true,
                searching: false,
                lengthChange: false,
                createdRow: function(row, data, dataIndex) {
                    $(row).addClass('cursor-pointer').attr('title', 'คลิกเพื่อดูที่อยู่');
                },
                columns: [
                    { data: 'idno_gty', render: data => data || '-', className: 'text-center' },
                    { data: 'name_gty', render: data => data || '-', className: 'text-center' },
                    { data: 'phone', render: data => data || '-', className: 'text-center' }
                ],
                language: {
                    emptyTable: "ไม่พบข้อมูลผู้ค้ำประกัน",
                    info: "แสดงรายการที่ _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
                    infoEmpty: "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ",
                    paginate: {
                        first: "หน้าแรก",
                        last: "หน้าสุดท้าย",
                        next: "ถัดไป",
                        previous: "ก่อนหน้า"
                    }
                },
                pageLength: 5,
                dom: '<"flex-grow-1 overflow-auto min-vh-0"t><"row flex-shrink-0 mx-0 pt-2"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                order: []
            };

            let guarantorTable;
            if ($.fn.DataTable.isDataTable('#tab-table-guarantor')) {
                guarantorTable = $('#tab-table-guarantor').DataTable();
                guarantorTable.clear().rows.add(data.guarantorsInfo || []).draw();
            } else {
                guarantorTable = $('#tab-table-guarantor').DataTable(dtGuarantorConfig);
            }

            $('#tab-table-guarantor tbody').off('click', 'tr.cursor-pointer');
            $('#tab-table-guarantor tbody').on('click', 'tr.cursor-pointer', function () {
                var tr = $(this);
                var row = guarantorTable.row(tr);

                if (row.child.isShown()) {
                    row.child.hide();
                    tr.removeClass('shown');
                    tr.css('background-color', '');
                } else {
                    let rowData = row.data();
                    if (rowData) {
                        let addresses = rowData.guarantorAddress || [];
                        let count = addresses.length;
                        
                        let html = '<div class="p-3 bg-light rounded border">';
                        html += '<h6 class="fw-bold mb-3 text-dark">รายการสถานที่อยู่ [' + count + ']</h6>';
                        html += '<table class="table table-sm table-bordered mb-0 bg-white">';
                        html += '<thead class="table-light"><tr><th class="text-center" style="width: 30%;">ประเภทที่อยู่</th><th>ที่อยู่</th></tr></thead>';
                        html += '<tbody>';
                        
                        if (count > 0) {
                            addresses.forEach(addr => {
                                let adrtyp = addr.adrtyp || '-';
                                let address = addr.address || '-';
                                html += '<tr><td class="text-center align-middle">' + adrtyp + '</td><td class="align-middle">' + address + '</td></tr>';
                            });
                        } else {
                            html += '<tr><td colspan="2" class="text-center text-muted py-3">ไม่พบข้อมูลที่อยู่</td></tr>';
                        }
                        
                        html += '</tbody></table></div>';
                        
                        row.child(html).show();
                        tr.addClass('shown');
                        tr.css('background-color', 'rgba(0,0,0,0.05)');
                    }
                }
            });

            //#endregion

        }
        
        if (requestId !== currentContactInfoRequestId) return;

        // The latest request has finished; reveal its detail content.
        document.getElementById("contract-loading-indicator").classList.add("d-none");
        document.getElementById("contract-details-container").classList.remove("d-none");

        return data;
    } catch (error) {
        // Ignore stale requests when the user has already selected another
        // contract. The latest request owns the detail component state.
        if (requestId !== currentContactInfoRequestId) return;

        console.error("Error fetching contact info:", error);
        document.getElementById("contract-detail-contno").innerText = '-';
        document.getElementById("contract-detail-loantype").innerText = '-';
        document.getElementById("contract-detail-company").innerText = '-';
        document.getElementById("loan-detail-status").innerText = '-';
    } finally {
        // An older request must not hide the loader of a newer selection.
        if (requestId === currentContactInfoRequestId) {
            showContractDetailLoading(false);
        }
    }
}

async function getReceiveList(contno, company){
    const requestId = ++currentReceiveListRequestId;
    try{
        const cacheKey = `${normalizeCompanyName(company)}|${String(contno ?? '').trim()}`;
        let data = receiveListCache.get(cacheKey);

        if (!data) {
            const response = await fetch(`/CustomerDetail/GetReceiveList?contno=${encodeURIComponent(contno)}&company=${encodeURIComponent(company)}`);
            if (!response.ok) throw new Error(`GetReceiveList returned ${response.status}`);
            data = await response.json();
            receiveListCache.set(cacheKey, data);
        }

        if (requestId !== currentReceiveListRequestId) return;
        const dtPaymentConfig = {
            data: data || [],
            destroy: true,
                columns: [
                    { data: 'rcpdte', render: data => formatDate(data) || '-', className: 'text-center' },
                    { data: 'amount', render: data => formatValues(data) || '-', className: 'text-center' },
                    { data: 'recType', render: data => data || '-', className: 'text-center' },
                    { data: 'rawPaymer', render: data => data || '-', className: 'text-center' },
                    { data: 'Tel', render: data => data || '-', className: 'text-center' }
                ],
                language: {
                    emptyTable: "ไม่พบรายการรับชำระ",
                    search: "ค้นหา:",
                    lengthMenu: "แสดง _MENU_ รายการ",
                    info: "แสดงรายการที่ _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
                    infoEmpty: "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ",
                    paginate: {
                        first: "หน้าแรก",
                        last: "หน้าสุดท้าย",
                        next: "ถัดไป",
                        previous: "ก่อนหน้า"
                    }
                },
                pageLength: 5,
                lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
                dom: '<"row flex-shrink-0 mx-0"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>><"flex-grow-1 overflow-auto min-vh-0"t><"row flex-shrink-0 mx-0 pt-2"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                order: []
            };

            if ($.fn.DataTable.isDataTable('#tab-table-payment')) {
                $('#tab-table-payment').DataTable().clear().rows.add(data || []).draw();
            } else {
                $('#tab-table-payment').DataTable(dtPaymentConfig);
            }

            return data;

    }catch(error){
        console.error("Error getReceiveList:", error);
        return null;
    }
}

async function getClaimList(tracking){
    const requestId = ++currentClaimListRequestId;
    try {
        const cacheKey = String(tracking ?? '').trim();
        let data = claimListCache.get(cacheKey);

        if (!data) {
            const response = await fetch(`/CustomerDetail/GetClaimList?tracking=${encodeURIComponent(tracking)}`);
            if (!response.ok) throw new Error(`GetClaimList returned ${response.status}`);
            data = await response.json();
            console.log("data",data)
            claimListCache.set(cacheKey, data);
        }

        if (requestId !== currentClaimListRequestId) return;

        const dtClaimConfig = {
            data: data || [],
            destroy: true,
            columns: [
                { data: 'Policy_No', render: data => data || '-', className: 'text-center' },
                { data: 'Claim_Date', render: data => formatDate(data) || '-', className: 'text-center' },
                { data: 'Claim_No', render: data => data || '-', className: 'text-center' },
                { data: 'idno', render: data => data || '-', className: 'text-center' },
                { data: 'Cust_Name', render: data => data || '-', className: 'text-center' },
                { data: 'companyInsur', render: data => data || '-', className: 'text-center' },
                { data: 'Register', render: data => data || '-', className: 'text-center' },
                { data: 'Claim_Status', render: data => data || '-', className: 'text-center' },
                { data: 'appNoMicro', render: data => data || '-', className: 'text-center' },
                { data: 'Venue', render: data => data || '-', className: 'text-center' },
                { data: 'Cause', render: data => data || '-', className: 'text-center' },
                { data: 'Claim_Desc', render: data => data || '-', className: 'text-center' },
                { data: 'Remark', render: data => data || '-', className: 'text-center' },
                { data: 'Claim_Total', render: data => formatValues(data) || '-', className: 'text-center' },
                { data: 'Contact_Name', render: data => data || '-', className: 'text-center' },
                { data: 'Contact_Tel', render: data => data || '-', className: 'text-center' },
                { data: 'Tracking_Ins', render: data => data || '-', className: 'text-center' }
            ],
            language: {
                emptyTable: "ไม่พบรายการเคลม",
                search: "ค้นหา:",
                lengthMenu: "แสดง _MENU_ รายการ",
                info: "แสดงรายการที่ _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
                infoEmpty: "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ",
                paginate: {
                    first: "หน้าแรก",
                    last: "หน้าสุดท้าย",
                    next: "ถัดไป",
                    previous: "ก่อนหน้า"
                }
            },
            pageLength: 5,
            lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
            dom: '<"row flex-shrink-0 mx-0"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>><"flex-grow-1 overflow-auto min-vh-0"t><"row flex-shrink-0 mx-0 pt-2"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            order: []
        };

        if ($.fn.DataTable.isDataTable('#tab-table-claim')) {
            $('#tab-table-claim').DataTable().clear().rows.add(data || []).draw();
        } else {
            $('#tab-table-claim').DataTable(dtClaimConfig);
        }

    } catch (error) {
        
    }
}

function startReplyTimeClock() {
    const el = document.getElementById('reply-current-time');
    if (!el) return;
    function updateReplyTime() {
        const target = document.getElementById('reply-current-time');
        if (!target) return;
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        target.innerText = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
    updateReplyTime();
    setInterval(updateReplyTime, 1000);
}

document.addEventListener('DOMContentLoaded', function () {
    startReplyTimeClock();
});

// Expand/collapse contract detail from the inline control in the customer row.
// When collapsed, the separate detail row is completely hidden, leaving one row.
document.addEventListener('click', function (e) {
    const toggle = e.target.closest('.customer-contract-inline-toggle');
    if (!toggle) return;

    e.preventDefault();
    e.stopPropagation();

    const index = toggle.getAttribute('data-card-index');
    const cardRow = document.querySelector(`#searchResultBody tr.customer-contract-card-row[data-card-index="${index}"]`);
    const customerRow = document.querySelector(`#searchResultBody tr[data-index="${index}"]`);
    if (!cardRow || !customerRow) return;

    const wasActive = customerRow.classList.contains('active-row');
    setActiveCustomerRow(customerRow.closest('tbody'), customerRow);

    if (!wasActive) {
        const selectedCustomer = currentCustomerSearchData[Number(index)];
        if (selectedCustomer) {
            void loadCustomerSelection(selectedCustomer, Number(index));
        }
    }

    const willOpen = cardRow.dataset.expanded !== 'true';

    if (willOpen) {
        document.querySelectorAll('#searchResultBody tr.customer-contract-card-row[data-expanded="true"]').forEach(otherRow => {
            otherRow.dataset.expanded = 'false';
            otherRow.classList.add('d-none');
            otherRow.previousElementSibling?.classList.remove('contract-expanded');
            const otherIndex = otherRow.getAttribute('data-card-index');
            const otherToggle = document.querySelector(`#searchResultBody .customer-contract-inline-toggle[data-card-index="${otherIndex}"]`);
            if (otherToggle) {
                otherToggle.setAttribute('aria-expanded', 'false');
                const otherChevron = otherToggle.querySelector('.customer-contract-inline-chevron');
                if (otherChevron) {
                    otherChevron.classList.add('bi-chevron-down');
                    otherChevron.classList.remove('bi-chevron-up');
                }
            }
        });
    }

    cardRow.dataset.expanded = willOpen ? 'true' : 'false';
    cardRow.classList.toggle('d-none', !willOpen);
    customerRow.classList.toggle('contract-expanded', willOpen);
    toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

    const chevron = toggle.querySelector('.customer-contract-inline-chevron');
    if (chevron) {
        chevron.classList.toggle('bi-chevron-down', !willOpen);
        chevron.classList.toggle('bi-chevron-up', willOpen);
    }

    if (!willOpen) return;

    const company = toggle.getAttribute('data-company') || '';
    const targetKey = decodeURIComponent(toggle.getAttribute('data-target-key') || '');
    const encodedContract = toggle.getAttribute('data-contract') || '';
    if (company && encodedContract && typeof getContactInfo === 'function') {
        getContactInfo(targetKey, company, encodedContract, null);
    }
});
