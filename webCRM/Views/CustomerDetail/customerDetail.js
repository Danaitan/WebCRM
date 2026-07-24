const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");

function isCheck (isCheck)
{
    if (isCheck == '1'){
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

async function displayCustomerDetails(customer) {
    const response = await fetch(`/CustomerDetail/GetPDPA?search=${customer.idno}&company=${customer.companyCde}`);
    const pdpaData = await response.json();

    const pdpaCheckEl = document.getElementById("detail-pdpaCheck");
    if (pdpaCheckEl) pdpaCheckEl.innerText = customer.pdpaCheck || '-';
    const detailIdnoEl = document.getElementById("detail-idno");
    if (detailIdnoEl) detailIdnoEl.innerText = customer.idno || '-';
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
    document.getElementById("isCheck1").innerText = isCheck(pdpaData.MS1);
    document.getElementById("isCheck2").innerText = isCheck(pdpaData.MS2);

    const panelBg = document.getElementById("customer-detail-panel-bg");
    if (panelBg) {
        panelBg.classList.remove("bg-danger-light", "bg-warning-light", "bg-success-light");
        
        let pdpaVal = customer.pdpaCheck || customer.PdpaCheck;
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
}

async function performSearch() {
    const val = searchInput.value;
    if (val) {
        try {
            const originalText = searchBtn.innerHTML;
            searchBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังค้นหา...';
            
            const response = await fetch('/CustomerDetail/GetCustomerList?idno=' + encodeURIComponent(val));

            if (response.ok) {
                const data = await response.json();

                if (data && data.length > 0) {
                    document.getElementById("customerCount").innerText = data.length;
                    
                    // Use map().join('') for maximum rendering speed (O(1) DOM insertions)
                    const tbody = document.getElementById("searchResultBody");
                    
                    tbody.innerHTML = data.map((cust, index) => {
                        const name = cust.nameCus || cust.NameCus || '-';
                        const idno = cust.idno || cust.Idno || '-';
                        const licno = cust.licno || cust.Licno || '-';
                        
                        return `
                            <tr class="${index === 0 ? 'active-row cursor-pointer border-bottom' : 'cursor-pointer border-bottom hover-row'}" data-index="${index}">
                                <td class="py-3 d-flex align-items-center gap-2">
                                    <div class="avatar-sm ${index === 0 ? 'bg-blue-light text-primary' : 'bg-light text-muted'} rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                                        <i class="bi bi-person-fill"></i>
                                    </div>
                                    <span class="${index === 0 ? 'fw-medium ' : ''}text-dark text-nowrap name-span">${name}</span>
                                </td>
                                <td class="py-3 text-muted text-center text-nowrap">${idno}</td>
                                <td class="py-3 text-muted text-center text-nowrap">${licno}</td>
                            </tr>
                        `;
                    }).join('');

                    // Use Event Delegation for maximum click handling performance (O(1) event listeners instead of O(N))
                    tbody.onclick = function(e) {
                        const clickedRow = e.target.closest('tr');
                        if (!clickedRow) return;

                        // Optimization: Only update classes if we clicked a different row
                        if (clickedRow.classList.contains('active-row')) return;

                        // Remove active styling from previous active row
                        const activeRow = tbody.querySelector('.active-row');
                        if (activeRow) {
                            activeRow.classList.remove('active-row');
                            activeRow.classList.add('hover-row');
                            const avatar = activeRow.querySelector('.avatar-sm');
                            if(avatar) {
                                avatar.classList.remove('bg-blue-light', 'text-primary');
                                avatar.classList.add('bg-light', 'text-muted');
                            }
                            const nameSpan = activeRow.querySelector('.name-span');
                            if(nameSpan) {
                                nameSpan.classList.remove('fw-medium');
                            }
                        }

                        // Add active styling to clicked row
                        clickedRow.classList.add('active-row');
                        clickedRow.classList.remove('hover-row');
                        const avatar = clickedRow.querySelector('.avatar-sm');
                        if(avatar) {
                            avatar.classList.remove('bg-light', 'text-muted');
                            avatar.classList.add('bg-blue-light', 'text-primary');
                        }
                        const nameSpan = clickedRow.querySelector('.name-span');
                        if(nameSpan) {
                            nameSpan.classList.add('fw-medium');
                        }

                        const cust = data[clickedRow.getAttribute('data-index')];
                        const idno = cust.idno || cust.Idno;
                        displayCustomerDetails(cust);
                        getContact(idno);
                    };

                    displayCustomerDetails(data[0]);
                    const firstIdno = data[0].idno || data[0].Idno;
                    if (firstIdno) getContact(firstIdno);

                } else {
                    document.getElementById("customerCount").innerText = "0";
                    document.getElementById("searchResultBody").innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">ไม่พบข้อมูล</td></tr>';
                }
            } else {
                console.error("Error fetching data:", response.status);
                document.getElementById("searchResultBody").innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
            }
            
            searchBtn.innerHTML = originalText;
        } catch (error) {
            console.error("Fetch error:", error);
            searchBtn.innerHTML = '<i class="bi bi-search"></i> ค้นหา';
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
        searchInput.value = '';
    });
}

const getContactBtn = document.getElementById("getContactBtn");
if (getContactBtn) {
    getContactBtn.addEventListener("click", function(e) {
        e.preventDefault();
        getContact();
    });
}

// Tab selection logic
const tabLinks = document.querySelectorAll('.crm-tabs .nav-link');
const detailHeader = document.getElementById('dynamic-detail-header');
const tabContents = document.querySelectorAll('.tab-content-pane');

tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();

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

// Sub-tab selection logic for contract section
const contactTabButtons = document.querySelectorAll('.button-tab-contact');
contactTabButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();

        // Find the parent container of the clicked button
        const parentGroup = this.closest('.d-flex');
        
        // Find all buttons in the same group
        const groupButtons = parentGroup.querySelectorAll('.button-tab-contact');

        // Remove active class from all buttons in this group
        groupButtons.forEach(b => b.classList.remove('active'));
        
        // Add active class to the clicked button
        this.classList.add('active');

        // Hide all target contents associated with this group
        const targetIds = Array.from(groupButtons).map(b => b.getAttribute('data-target'));
        targetIds.forEach(id => {
            if (id) {
                const content = document.getElementById(id);
                if (content) {
                    content.classList.add('d-none');
                    content.classList.remove('show', 'active');
                }
            }
        });

        // Show the selected target content
        const targetId = this.getAttribute('data-target');
        if (targetId) {
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('d-none');
                targetContent.classList.add('show', 'active');
                
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
                const tabs = document.getElementById("contact-company-tabs");
                if (tabs) tabs.classList.remove("d-none");
                
                // Adjust DataTables in case they were initialized while hidden
                setTimeout(() => {
                    ['#dt-contact-Micro', '#dt-contact-MFIN', '#dt-contact-MIB'].forEach(id => {
                        if ($.fn.DataTable.isDataTable(id)) {
                            $(id).DataTable().columns.adjust();
                        }
                    });
                }, 50);
            } else if (targetId === "tab-table-person") {
                const tabs = document.getElementById("contact-company-tabs");
                if (tabs) tabs.classList.add("d-none");
            }

            // Abort pending requests and clear UI when switching company tabs
            if (targetId === "contact-Micro" || targetId === "contact-MFIN" || targetId === "contact-MIB") {
                if (typeof currentContactInfoRequestId !== 'undefined') {
                    currentContactInfoRequestId++;
                }
                if (typeof currentClaimListRequestId !== 'undefined') {
                    currentClaimListRequestId++;
                }
                const loadingInd = document.getElementById("contract-loading-indicator");
                const detailsCont = document.getElementById("contract-details-container");
                if (loadingInd && detailsCont) {
                    loadingInd.classList.add("d-none");
                    detailsCont.classList.remove("d-none");
                }

                // Reset key fields to '-' to avoid confusion
                ['contract-detail-contno', 'contract-detail-loantype', 'contract-detail-company', 
                 'loan-detail-status', 'mib-detail-policy-no'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.innerText = '-';
                });

                // Deselect active rows
                document.querySelectorAll('.contract-row.active-row').forEach(r => {
                    r.classList.remove('active-row');
                    r.classList.add('hover-row');
                    r.querySelectorAll('.contract-col').forEach(col => col.classList.remove('fw-medium', 'text-primary'));
                });
            }

            // Change tab layout when switching company tab
            if (targetId === "contact-Micro" || targetId === "contact-MFIN") {
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
            } else if (targetId === "contact-MIB") {
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
        }
    });
});

let currentContactRequestId = 0;
async function getContact(idno) {
    const requestId = ++currentContactRequestId;
    try {
        document.getElementById('summary-micro-count').innerHTML = '<span class="spinner-border spinner-border-sm text-muted" role="status" aria-hidden="true"></span>';
        document.getElementById('summary-mfin-count').innerHTML = '<span class="spinner-border spinner-border-sm text-muted" role="status" aria-hidden="true"></span>';
        document.getElementById('summary-mib-count').innerHTML = '<span class="spinner-border spinner-border-sm text-muted" role="status" aria-hidden="true"></span>';

        const response = await fetch(`/CustomerDetail/GetContact?idno=${encodeURIComponent(idno)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        
        if (requestId !== currentContactRequestId) return;

        if (data) {
            document.getElementById('summary-micro-count').innerText = (data.contactMicroCount || 0) + ' สัญญา';
            document.getElementById('summary-mfin-count').innerText = (data.contactMFINCount || 0) + ' สัญญา';
            document.getElementById('summary-mib-count').innerText = (data.contactMIBCount || 0) + ' กรมธรรม์';

            function loadDataTable(tableId, dataList, company, idno) {
                const dtConfig = {
                    data: dataList || [],
                    destroy: true,
                    columns: [
                        { data: row => row.contno || '-' },
                        { data: row => {
                            if (company === 'MIB') {
                                return row.trackingMIB || '-';
                            }
                            return row.applno || '-';
                        }},
                        { data: row => row.loantype || '-' },
                        { data: row => row.conttype || '-' }
                    ],
                    createdRow: function (row, data, dataIndex) {
                        $(row).addClass('hover-row border-bottom cursor-pointer contract-row');
                        $(row).find('td').addClass('text-center py-3 contract-col');
                        const cEncoded = encodeURIComponent(JSON.stringify(data));
                        
                        let targetIdno = idno;
                        if (company === 'MIB') {
                            targetIdno = data.trackingMIB;
                        } else {
                            targetIdno = data.contno;
                        }

                        $(row).attr('onclick', `getContactInfo('${targetIdno}', '${company}', '${cEncoded}', this)`);
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
                    $(tableId).DataTable().clear().rows.add(dataList || []).draw();
                } else {
                    $(tableId).DataTable(dtConfig);
                }
            }

            loadDataTable('#dt-contact-Micro', data.contactMicro, 'Micro', idno);
            loadDataTable('#dt-contact-MFIN', data.contactMFIN, 'MFIN', idno);
            loadDataTable('#dt-contact-MIB', data.contactMIB, 'MIB', idno);
        }

    } catch (error) {
        console.error("Error fetching contact:", error);
    }
}

const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB').replace(/\//g, '-');
};

const formatValues = (value) => {
    if (value != null && value !== '') {
        return Number(value).toLocaleString('en-US');
    } else {
        return '-';
    }
};

let currentContactInfoRequestId = 0;
let currentClaimListRequestId = 0;
async function getContactInfo(idno, company, encodedC, clickedRow) {
    const requestId = ++currentContactInfoRequestId;
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
        
        // Show loading indicators for the whole box
        document.getElementById("contract-loading-indicator").classList.remove("d-none");
        document.getElementById("contract-details-container").classList.add("d-none");

        const response = await fetch(`/CustomerDetail/GetContactInfo?idno=${idno}&company=${company}`);
        const data = await response.json();
        
        if (requestId !== currentContactInfoRequestId) {
            // Another request was started or tab was changed, do not update UI
            return;
        }

        const contract = data.contractInfo?.[0] || {};

         // Update UI with actual data
        if (contract) {

            if (company === "MIB") {
                document.getElementById("tab-buttons-normal").classList.add("d-none");
                document.getElementById("tab-buttons-mib").classList.remove("d-none");
                const mibBtn = document.querySelector('#tab-buttons-mib .button-tab-contact[data-target="tab-content-contact-MIB-detail"]');
                if (mibBtn) mibBtn.click();
            } else {
                document.getElementById("tab-buttons-normal").classList.remove("d-none");
                document.getElementById("tab-buttons-mib").classList.add("d-none");
                const normalBtn = document.querySelector('#tab-buttons-normal .button-tab-contact[data-target="tab-content-contact-detail"]');
                if (normalBtn) normalBtn.click();
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

                await getReceiveList (contract.contno, "Micro")
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

                await getReceiveList (contract.contno, "MFIN")
            }

            if (company == "MIB"){
                
                const formatDt = (date) => {
                    if (!date) return '-';
                    const d = new Date(date);
                    if (isNaN(d.getTime())) return '-';
                    return d.toLocaleDateString('en-GB').replace(/\//g, '-');
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
                document.getElementById("mib-ins-start-date").innerText = formatDt(contract.startDate);
                document.getElementById("mib-ins-end-date").innerText = formatDt(contract.endDate);
                document.getElementById("mib-ins-payment-type").innerText = contract.payDesc || '-';
                document.getElementById("mib-ins-status").innerText = contract.cancel || '-';

                // Fetch claim list using the application number from the MIB table
                await getClaimList(c.trackingMIB || idno);
            }

            //#endregion

            //#region ข้อมูลสินเชื่อ

            document.getElementById("loan-detail-fianlamount").innerText = formatValues(contract.finamt);
            document.getElementById("loan-detail-aging").innerText = contract.aging || '-';
            document.getElementById("loan-detail-appraisal").innerText = formatValues(contract.estimatePrice);
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
        
        // Hide loading indicator
        document.getElementById("contract-loading-indicator").classList.add("d-none");
        document.getElementById("contract-details-container").classList.remove("d-none");

        return data;
    } catch (error) {
        console.error("Error fetching contact info:", error);
        
        // In case of error, show dash
        document.getElementById("contract-detail-contno").innerText = '-';
        document.getElementById("contract-detail-loantype").innerText = '-';
        document.getElementById("contract-detail-company").innerText = '-';
        document.getElementById("loan-detail-status").innerText = '-';
        
        // Hide loading indicator even on error
        document.getElementById("contract-loading-indicator").classList.add("d-none");
        document.getElementById("contract-details-container").classList.remove("d-none");
    }
}

let currentReceiveListRequestId = 0;
async function getReceiveList(idno, company){
    const requestId = ++currentReceiveListRequestId;
    try{

        const response = await fetch(`/CustomerDetail/GetReceiveList?idno=${idno}&company=${company}`);
        const data = await response.json();
        
        if (requestId !== currentReceiveListRequestId) return;

            const dtPaymentConfig = {
                data: data || [],
                destroy: true,
                columns: [
                    { data: 'rcpdte', render: data => formatDate(data) || '-', className: 'text-center' },
                    { data: 'amount', render: data => formatValues(data) || '-', className: 'text-center' },
                    { data: 'recType', render: data => data || '-', className: 'text-center' },
                    { data: 'rawPaymer', render: data => data || '-', className: 'text-center' },
                    { data: 'recTel', render: data => data || '-', className: 'text-center' }
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

    }catch(error){

    }
}

async function getClaimList(tracking){
    const requestId = ++currentClaimListRequestId;
    try {
        
        const response = await fetch(`/CustomerDetail/GetClaimList?tracking=${tracking}`);
        const data = await response.json();

        if (requestId !== currentClaimListRequestId) return;

        const dtClaimConfig = {
            data: data || [],
            destroy: true,
            columns: [
                { data: 'policyNo', render: data => data || '-', className: 'text-center' },
                { data: 'claimDate', render: data => formatDate(data) || '-', className: 'text-center' },
                { data: 'claimNo', render: data => data || '-', className: 'text-center' },
                { data: 'idNo', render: data => data || '-', className: 'text-center' },
                { data: 'custName', render: data => data || '-', className: 'text-center' },
                { data: 'companyInsur', render: data => data || '-', className: 'text-center' },
                { data: 'register', render: data => data || '-', className: 'text-center' },
                { data: 'claimStatus', render: data => data || '-', className: 'text-center' },
                { data: 'appNoMicro', render: data => data || '-', className: 'text-center' },
                { data: 'venue', render: data => data || '-', className: 'text-center' },
                { data: 'cause', render: data => data || '-', className: 'text-center' },
                { data: 'claimDesc', render: data => data || '-', className: 'text-center' },
                { data: 'remark', render: data => data || '-', className: 'text-center' },
                { data: 'claimTotal', render: data => formatValues(data) || '-', className: 'text-center' },
                { data: 'contactName', render: data => data || '-', className: 'text-center' },
                { data: 'contactTel', render: data => data || '-', className: 'text-center' },
                { data: 'trackingIns', render: data => data || '-', className: 'text-center' }
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
