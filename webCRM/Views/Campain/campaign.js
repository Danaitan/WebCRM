// Campaign Management JavaScript

async function GetFilterByGuid(productGuid) {
    const guid = productGuid || selectedCampaignGuid || "";
    if (!guid) return [];
    startLoading('กำลังโหลดข้อมูล...', 'กำลังดึงข้อมูล Filter ของ Product / Campaign...');
    try {
        const response = await fetch(`/Campain/GetFilterByGuid?fguid=${guid}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error("Error in GetFilterByGuid:", error);
        return [];
    } finally {
        stopLoading();
    }
}

function updateFilterSelectionUI() {
    $(".filter-chk, #chkSelectAllFilters").prop("disabled", false);

    $(".filter-chk").each(function () {
        const code = $(this).attr("data-fcode") || $(this).val();
        $(this).prop("checked", selectedFilterCodes.includes(code));
    });
    updateSelectAllFiltersState();
    updateSelectedFiltersDisplay();
}

async function postFilter(productGuid) {
    const guid = productGuid || selectedCampaignGuid || "c0fdef43-449f-4fc8-bcd7-d7cfe9050721";
    const company = window.CURRENT_COMPANY || "MICRO";

    const postData = (selectedFilterCodes && selectedFilterCodes.length > 0)
        ? selectedFilterCodes.map(code => ({
            fguid: guid,
            fcode: code,
            fcompany: company
        }))
        : [];

    if (postData.length === 0) {
        console.warn("No filters selected to post.");
        return { status: "warning", message: "ยังไม่ได้เลือก Filter" };
    }

    startLoading('กำลังบันทึกข้อมูล...', 'ระบบกำลังบันทึกข้อมูล Filter...');
    try {
        const response = await fetch(`/Campain/InsertFilter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in postFilter:", error);
        return { status: "error", message: error.message };
    } finally {
        stopLoading();
    }
}

async function getMasterFilter() {
    startLoading('กำลังโหลดข้อมูล...', 'กำลังดึงข้อมูล Filter...');
    try {
        const response = await fetch(`/Campain/GetMasterFilter`);
        const data = await response.json();
        
        const mappedData = (data || [])
            .filter(item => {
                const code = (item.fcode || item.fCode || item.FCode || "").toString().toUpperCase();
                const name = (item.fname || item.fName || item.FName || "").toString().toLowerCase();
                return code !== "F999" && name !== "import";
            })
            .map(item => ({
                id: item.id ?? item.Id ?? 0,
                fcode: item.fcode || item.fCode || item.FCode || item.f_code || "",
                fname: item.fname || item.fName || item.FName || item.f_name || "",
                fremark: item.fremark || item.fRemark || item.FRemark || item.f_remark || "",
                ftype: item.ftype || item.fType || item.FType || item.f_type || "",
                fcompany: item.fcompany || item.fCompany || item.FCompany || item.f_company || "",
                fstatus: item.fstatus || item.fStatus || item.FStatus || item.f_status || "",
                fremark2: item.fremark2 || item.fRemark2 || item.FRemark2 || item.f_remark2 || ""
            }));
        
        return mappedData;
    } catch (error) {
        console.error('Error fetching master filter data:', error);
        return [];
    } finally {
        stopLoading();
    }
}

let masterFiltersData = [];
let selectedFilterCodes = [];
let selectedCampaignCode = "";
let selectedCampaignGuid = "";

async function renderMasterFilters() {
    try {
        const $rowsCount = $("#filterNameRowsCount");
        const $emptyState = $("#filterNameEmptyState");
        const $container = $("#filterNameListContainer");

        $rowsCount.text("Loading...");
        $emptyState.addClass("d-none").attr("style", "display: none !important;");
        $container.removeClass("d-none").show().html(`
            <div class="d-flex align-items-center justify-content-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                <span style="font-size: 0.85rem;">กำลังโหลดหัวข้อ Filter...</span>
            </div>
        `);

        const filters = await getMasterFilter();
        masterFiltersData = filters || [];
        $container.empty();

        if (!masterFiltersData || masterFiltersData.length === 0) {
            $rowsCount.text("Rows: 0");
            $emptyState.removeClass("d-none").attr("style", "display: flex !important;");
            $container.addClass("d-none").hide();
            updateSelectedFiltersDisplay();
            return;
        }

        $rowsCount.text(`Rows: ${masterFiltersData.length}`);
        $emptyState.addClass("d-none").attr("style", "display: none !important;");
        $container.removeClass("d-none").show();

        masterFiltersData.forEach(item => {
            const filterName = item.fname || item.fcode || "-";
            const description = item.fremark || item.fremark2 || item.ftype || "-";
            const isChecked = selectedFilterCodes.includes(item.fcode) ? "checked" : "";
            const rowHtml = `
                <div class="filter-name-row d-flex py-2 align-items-center" style="border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; cursor: pointer;" data-id="${item.id}" data-fcode="${item.fcode}">
                    <div style="width: 8%; text-align: center;">
                        <input type="checkbox" class="filter-chk" value="${item.fcode}" data-fcode="${item.fcode}" ${isChecked} style="cursor: pointer;">
                    </div>
                    <div style="width: 50%; color: #1e293b; font-weight: 500; padding-right: 0.5rem; word-break: break-word;">${description}</div>
                </div>
            `;
            $container.append(rowHtml);
        });

        // Attach checkbox change event
        $(".filter-chk").off("change").on("change", function (e) {
            e.stopPropagation();
            const code = $(this).attr("data-fcode") || $(this).val();
            if ($(this).is(":checked")) {
                if (!selectedFilterCodes.includes(code)) {
                    selectedFilterCodes.push(code);
                }
            } else {
                selectedFilterCodes = selectedFilterCodes.filter(c => c !== code);
            }
            updateSelectAllFiltersState();
            updateSelectedFiltersDisplay();
        });

        // Click row toggles checkbox
        $(".filter-name-row").off("click").on("click", function (e) {
            if ($(e.target).is("input[type='checkbox']")) return;
            const $chk = $(this).find(".filter-chk");
            $chk.prop("checked", !$chk.is(":checked")).trigger("change");
        });

        // Select All Filters Checkbox handler
        $("#chkSelectAllFilters").off("change").on("change", function () {
            const isChecked = $(this).is(":checked");
            if (isChecked) {
                selectedFilterCodes = masterFiltersData.map(f => f.fcode);
            } else {
                selectedFilterCodes = [];
            }
            $(".filter-chk").prop("checked", isChecked);
            updateSelectedFiltersDisplay();
        });

        updateSelectAllFiltersState();
        updateSelectedFiltersDisplay();

    } catch (err) {
        console.error("Error rendering master filters:", err);
    }
}

function updateSelectAllFiltersState() {
    const total = masterFiltersData.length;
    const checkedCount = selectedFilterCodes.length;
    $("#chkSelectAllFilters").prop("checked", total > 0 && checkedCount === total);
}

function updateSelectedFiltersDisplay() {
    const $rowsCount = $("#selectedFiltersRowsCount");
    const $emptyState = $("#selectedFiltersEmptyState");
    const $container = $("#selectedFiltersListContainer");

    $container.empty();

    if (!selectedFilterCodes || selectedFilterCodes.length === 0) {
        $rowsCount.text("Rows: 0");
        $emptyState.removeClass("d-none").attr("style", "display: flex !important;");
        $container.addClass("d-none").hide();
        return;
    }

    $rowsCount.text(`Rows: ${selectedFilterCodes.length}`);
    $emptyState.addClass("d-none").attr("style", "display: none !important;");
    $container.removeClass("d-none").show();

    selectedFilterCodes.forEach(code => {
        const filterObj = masterFiltersData.find(f => f.fcode === code);
        const filterName = filterObj ? (filterObj.fname || filterObj.fcode) : code;
        const description = filterObj ? (filterObj.fremark || filterObj.fremark2 || filterObj.fname || filterObj.ftype || code) : code;
        const company = filterObj ? (filterObj.fcompany || "MICRO") : "MICRO";

        const rowHtml = `
            <div class="selected-filter-row d-flex py-2 align-items-center" style="border-bottom: 1px solid #f1f5f9; font-size: 0.85rem;">
                <div style="width: 100%; color: #1e293b; font-weight: 500; padding-right: 0.5rem; word-break: break-word;">${description}</div>
            </div>
        `;
        $container.append(rowHtml);
    });
}

async function getCampainList() {
    startLoading('กำลังโหลดข้อมูล...', 'กำลังดึงข้อมูล Product / Campaign...');
    try {
        const response = await fetch(`/Campain/GetCampainList`);
        if (!response.ok) throw new Error("Failed to fetch campaigns list");
        const data = await response.json();
        const mapped = data.map(item => ({
            guid: item.product_guid || "",
            code: item.product_code || "",
            name: item.product_name || "",
            status: item.product_status || "ปกติ",
            startDate: item.product_start ? item.product_start.substring(0, 10) : "",
            endDate: item.product_end ? item.product_end.substring(0, 10) : "",
            branches: item.offcde ? item.offcde.split(',') : [],
            remarks: item.product_remark || "",
            isImportFromExcel: false
        }));
        
        return mapped;
    }
    catch(error){
        console.error("Error in getCampainList:", error);
        return [];
    } finally {
        stopLoading();
    }
}

$(document).ready(async function () {
    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่ ระบบกำลังดึงข้อมูล Product / Campaign...');
    // Fetch Campaigns Data
    let campaigns = await getCampainList();
    // Fetch Branches Data
    let branchesData = [];
    try {
        startLoading('กำลังโหลดข้อมูล...', 'กำลังดึงข้อมูลสาขา...');
        const branchRes = await fetch(`/Campain/getBranchListForCRM`);
        const branchList = await branchRes.json();
        branchesData = branchList.map(b => ({
            code: b.offcde || b.Offcde || "",
            name: b.branch_name || b.branchName || b.bname || b.Bname || "ไม่ทราบชื่อ"
        }));
    } catch (err) {
        console.error("Failed to load branches:", err);
    } finally {
        stopLoading();
    }

    // UI State Variables
    let selectedBranches = [];

    // Sorting State Variables
    let activeSortField = "endDate"; // Default to product_end (checked in mockup)
    let activeSortOrder = "asc"; // Default to A to Z (checked in mockup)
    let tempSortField = "endDate";
    let tempSortOrder = "asc";

    const $sortBtn = $("#sortBtn");
    const $sortDropdownPanel = $("#sortDropdownPanel");

    const sortFieldToColumnIdx = {
        "code": 1,
        "name": 2,
        "status": 3,
        "startDate": 4,
        "endDate": 5
    };

    // DOM Elements
    const $campaignsTable = $("#campaignsTable");
    const $totalCampaignsCount = $("#totalCampaignsCount");
    const $campaignSearchInput = $("#campaignSearchInput");
    const $branchSearchInput = $("#branchSearchInput");
    const $branchesListContainer = $("#branchesListContainer");
    const $branchSelectDisplay = $("#branchSelectDisplay");
    const $branchDropdownPanel = $("#branchDropdownPanel");
    const $chkSelectAllBranches = $("#chkSelectAllBranches");
    const $remarks = $("#remarks");
    const $remarksCharCounter = $("#remarksCharCounter");

    // Initialize Branch Checkbox List
    function renderBranchCheckboxes() {
        $branchesListContainer.empty();
        branchesData.forEach(branch => {
            const itemHtml = `
                <div class="branch-item" data-code="${branch.code}">
                    <input type="checkbox" id="chk_branch_${branch.code}" class="branch-chk" value="${branch.code}">
                    <label for="chk_branch_${branch.code}" class="m-0 cursor-pointer w-100">${branch.name}</label>
                </div>
            `;
            $branchesListContainer.append(itemHtml);
        });

        // Attach event handlers to dynamic checkboxes
        $(".branch-chk").on("change", function () {
            const code = $(this).val();
            const isChecked = $(this).is(":checked");
            
            if (code === "99") {
                // If selecting "99-ทุกสาขา", clear all other selections and check only 99
                if (isChecked) {
                    selectedBranches = ["99"];
                    $(".branch-chk").not("#chk_branch_99").prop("checked", false);
                } else {
                    selectedBranches = [];
                }
            } else {
                // If selecting another branch
                if (isChecked) {
                    // Uncheck 99 if checked
                    $("#chk_branch_99").prop("checked", false);
                    selectedBranches = selectedBranches.filter(b => b !== "99");
                    
                    if (!selectedBranches.includes(code)) {
                        selectedBranches.push(code);
                    }
                } else {
                    selectedBranches = selectedBranches.filter(b => b !== code);
                }
            }
            
            updateBranchDisplay();
            updateSelectAllState();
        });
    }

    // Sync Branch Checklist checkboxes with selectedBranches array
    function syncCheckboxesState() {
        $(".branch-chk").prop("checked", false);
        selectedBranches.forEach(code => {
            $(`#chk_branch_${code}`).prop("checked", true);
        });
        updateSelectAllState();
    }

    // Update Select All Checkbox state
    function updateSelectAllState() {
        const totalCheckable = branchesData.length;
        const totalChecked = selectedBranches.length;
        
        if (totalChecked === totalCheckable) {
            $chkSelectAllBranches.prop("checked", true);
        } else {
            $chkSelectAllBranches.prop("checked", false);
        }
    }

    // Handle Select All Click
    $chkSelectAllBranches.on("change", function () {
        const isChecked = $(this).is(":checked");
        if (isChecked) {
            // Select all codes
            selectedBranches = branchesData.map(b => b.code);
        } else {
            selectedBranches = [];
        }
        syncCheckboxesState();
        updateBranchDisplay();
    });

    // Update Branch Input Display with tag pills
    function updateBranchDisplay() {
        // Clear existing tags
        $branchSelectDisplay.find(".branch-tag").remove();
        
        if (selectedBranches.length === 0) {
            $("#branchSelectPlaceholder").show();
        } else {
            $("#branchSelectPlaceholder").hide();
            
            // Render tags
            selectedBranches.forEach(code => {
                const branchObj = branchesData.find(b => b.code === code);
                if (branchObj) {
                    const labelText = `${branchObj.name}`;
                    // Special blue styling for specific selected tags
                    const tagHtml = `
                        <div class="branch-tag branch-tag-blue" data-code="${code}">
                            <span>${labelText}</span>
                            <button type="button" class="tag-remove-btn" title="นำออก">&times;</button>
                        </div>
                    `;
                    // Append before the arrow
                    $(tagHtml).insertBefore($branchSelectDisplay.find(".branch-dropdown-arrow"));
                }
            });
        }
    }

    // Remove tag click event handler (using event delegation)
    $branchSelectDisplay.on("click", ".tag-remove-btn", function (e) {
        e.stopPropagation(); // Avoid opening the dropdown
        const code = $(this).closest(".branch-tag").attr("data-code");
        selectedBranches = selectedBranches.filter(b => b !== code);
        
        $(`#chk_branch_${code}`).prop("checked", false);
        updateSelectAllState();
        updateBranchDisplay();
    });

    // Toggle Dropdown Panel
    $branchSelectDisplay.on("click", function (e) {
        e.stopPropagation();
        $branchSelectDisplay.toggleClass("open");
        $branchDropdownPanel.toggleClass("show");
        
        // Clear branch search input on open
        $branchSearchInput.val("").trigger("input");
    });

    // Toggle Sort Dropdown Panel
    $sortBtn.on("click", function (e) {
        e.stopPropagation();
        $sortDropdownPanel.toggleClass("show");
        
        // Initialize temporary selection with current active state
        tempSortField = activeSortField;
        tempSortOrder = activeSortOrder;
        
        updateSortUIState();
    });

    // Update CSS selected classes in dropdown list based on temp states
    function updateSortUIState() {
        $(".sort-option").removeClass("selected");
        $(`.sort-option[data-field="${tempSortField}"]`).addClass("selected");
        
        $(".sort-order-option").removeClass("selected");
        $(`.sort-order-option[data-order="${tempSortOrder}"]`).addClass("selected");
    }

    // Click sort field option
    $(".sort-option").on("click", function (e) {
        e.stopPropagation();
        tempSortField = $(this).data("field");
        updateSortUIState();
    });

    // Click sort order option
    $(".sort-order-option").on("click", function (e) {
        e.stopPropagation();
        tempSortOrder = $(this).data("order");
        updateSortUIState();
    });

    // Close sort dropdown when clicking Cancel
    $("#cancelSortBtn").on("click", function (e) {
        e.stopPropagation();
        $sortDropdownPanel.removeClass("show");
    });

    // Click Apply Sort button
    $("#applySortBtn").on("click", function (e) {
        e.stopPropagation();
        activeSortField = tempSortField;
        activeSortOrder = tempSortOrder;
        
        if (campaignTable) {
            campaignTable.order([sortFieldToColumnIdx[activeSortField], activeSortOrder]).draw();
        }
        
        $sortDropdownPanel.removeClass("show");
    });

    // Close dropdowns when clicking outside
    $(document).on("click", function (e) {
        if (!$(e.target).closest(".sort-select-container").length) {
            $sortDropdownPanel.removeClass("show");
        }
        if (!$(e.target).closest(".branch-select-container").length) {
            $branchSelectDisplay.removeClass("open");
            $branchDropdownPanel.removeClass("show");
            $("#modalBranchSelectDisplay").removeClass("open");
            $("#modalBranchDropdownPanel").removeClass("show");
        }
    });

    // Search/Filter Branches inside dropdown
    $branchSearchInput.on("input", function () {
        const searchVal = $(this).val().toLowerCase().trim();
        
        $(".branch-item").each(function () {
            const text = $(this).find("label").text().toLowerCase();
            if (text.indexOf(searchVal) > -1) {
                $(this).removeClass("d-none");
            } else {
                $(this).addClass("d-none");
            }
        });
    });

    let campaignTable;

    function initDataTables() {
        campaignTable = $campaignsTable.DataTable({
            data: campaigns,
            pageLength: 5,
            ordering: true,
            dom: '<"campaign-list-container"t><"d-flex justify-content-center mt-3"p>',
            language: {
                infoEmpty: "ไม่พบรายการ",
                emptyTable: `<div class="text-center py-4 text-muted" style="font-size: 0.85rem;">
                                <i class="bi bi-emoji-neutral fs-4 d-block mb-1"></i>
                                ไม่พบรายการ
                            </div>`,
                paginate: {
                    previous: '<i class="bi bi-chevron-left"></i>',
                    next: '<i class="bi bi-chevron-right"></i>'
                }
            },
            columns: [
                { 
                    data: null,
                    orderable: false,
                    render: function (data, type, row) {
                        const isActive = row.code === selectedCampaignCode;
                        return `
                            <div class="campaign-card ${isActive ? 'active' : ''}" data-code="${row.code}">
                                <div class="card-code">${row.code}</div>
                                <div class="card-name">${row.name}</div>
                                <div class="card-status-row">
                                    <span>สถานะ:</span>
                                    <span class="badge-status-normal">${row.status}</span>
                                </div>
                            </div>
                        `;
                    }
                },
                { data: 'code', visible: false },
                { data: 'name', visible: false },
                { data: 'status', visible: false },
                { data: 'startDate', visible: false },
                { data: 'endDate', visible: false },
                { data: 'remarks', visible: false }
            ],
            order: [[sortFieldToColumnIdx[activeSortField], activeSortOrder]],
            drawCallback: function(settings) {
                $totalCampaignsCount.text(settings.fnRecordsDisplay());
            }
        });
    }

    function renderCampaignsList() {
        if (campaignTable) {
            campaignTable.clear().rows.add(campaigns).draw();
        }
    }

    // Load Campaign into Form
    async function loadCampaignToForm(code) {
        const campaign = campaigns.find(c => c.code === code);
        if (!campaign) return;
        
        startLoading('กำลังโหลดข้อมูล...', 'กำลังโหลดรายละเอียด Product / Campaign...');
        try {
            selectedCampaignCode = code;
            selectedCampaignGuid = campaign.guid || "c0fdef43-449f-4fc8-bcd7-d7cfe9050721";
            
            // Populate inputs
            $("#campaignCode").val(campaign.code);
            $("#campaignName").val(campaign.name);
            $("#startDate").val(campaign.startDate);
            $("#endDate").val(campaign.endDate);
            $("#remarks").val(campaign.remarks);
            
            // Update character counter
            const currentLen = campaign.remarks ? campaign.remarks.length : 0;
            $remarksCharCounter.text(`${currentLen} / 500`);
            
            // Populate branch selector
            selectedBranches = [...campaign.branches];
            syncCheckboxesState();
            updateBranchDisplay();
            
            // Show/hide Filter Name & Selected panels based on isImportFromExcel
            if (campaign.isImportFromExcel) {
                $("#filterSelectedRow").hide();
            } else {
                $("#filterSelectedRow").show();
                // Fetch assigned filters for selected campaign via GetFilterByGuid
                if (selectedCampaignGuid) {
                    try {
                        const filterData = await GetFilterByGuid(selectedCampaignGuid);
                        if (Array.isArray(filterData)) {
                            selectedFilterCodes = filterData
                                .map(item => item.fcode || item.fCode || item.FCode || item.f_code || "")
                                .filter(c => c !== "");
                        } else {
                            selectedFilterCodes = [];
                        }
                    } catch (err) {
                        console.error("Error loading filters by guid:", err);
                        selectedFilterCodes = [];
                    }
                } else {
                    selectedFilterCodes = [];
                }

                updateFilterSelectionUI();
            }
            
            // Re-render list to update active card styling
            renderCampaignsList();
        } finally {
            stopLoading();
        }
    }

    // Click Campaign Card event handler (using event delegation)
    $campaignsTable.on("click", ".campaign-card", async function () {
        const code = String($(this).data("code"));
        await loadCampaignToForm(code);
    });

    // Character Counter for Remarks Textarea
    $remarks.on("input", function () {
        const currentLen = $(this).val().length;
        $remarksCharCounter.text(`${currentLen} / 500`);
    });

    // Search/Filter Campaigns in Sidebar List
    $campaignSearchInput.on("input", function () {
        const query = $(this).val().trim();
        if (campaignTable) {
            campaignTable.search(query).draw();
        }
    });

    // Refresh List Buttons Action
    $("#refreshCampaignsListBtn").off("click").on("click", async function () {
        $campaignSearchInput.val("");
        startLoading('กำลังโหลดข้อมูล...', 'กำลังรีเฟรชรายการ Product / Campaign...');
        try {
            campaigns = await getCampainList();
            renderCampaignsList();
            if (campaignTable) {
                campaignTable.search("").draw();
            }
            Swal.fire({ title: "รีเฟรชข้อมูลสำเร็จ", text: "อัปเดตข้อมูลรายการแคมเปญเรียบร้อยแล้ว", icon: "success", timer: 1500, showConfirmButton: false });
        } catch (err) {
            console.error("Error refreshing campaigns:", err);
        } finally {
            stopLoading();
        }
    });

    // Refresh Filters Button Action
    $("#refreshFiltersBtn").off("click").on("click", async function () {
        startLoading('กำลังโหลดข้อมูล...', 'กำลังรีเฟรชข้อมูล Filter...');
        try {
            await renderMasterFilters();
            if (selectedCampaignGuid) {
                try {
                    const filterData = await GetFilterByGuid(selectedCampaignGuid);
                    if (Array.isArray(filterData)) {
                        selectedFilterCodes = filterData
                            .map(item => item.fcode || item.fCode || item.FCode || item.f_code || "")
                            .filter(c => c !== "");
                    }
                } catch (e) {
                    console.error("Error refreshing filters:", e);
                }
            }
            updateFilterSelectionUI();
            Swal.fire({ title: "รีเฟรช Filter สำเร็จ", text: "อัปเดตข้อมูล Filter เรียบร้อยแล้ว", icon: "success", timer: 1500, showConfirmButton: false });
        } finally {
            stopLoading();
        }
    });

    // Home / Back Actions
    $("#homeActionBtn").off("click").on("click", function () {
        window.location.href = "/";
    });

    $("#backActionBtn").off("click").on("click", function () {
        window.location.href = "/";
    });

    $("#prospectActionBtn").off("click").on("click", function () {
        Swal.fire({ title: "เมนู Prospect Setup", text: "กำลังย้ายไปเมนูการตั้งค่ากลุ่มลูกค้า Prospect", icon: "info", timer: 1200, showConfirmButton: false });
    });

    // Variables for Modal
    let modalSelectedBranches = [];
    const $modalBranchSelectDisplay = $("#modalBranchSelectDisplay");
    const $modalBranchDropdownPanel = $("#modalBranchDropdownPanel");
    const $modalBranchesListContainer = $("#modalBranchesListContainer");
    const $modalChkSelectAllBranches = $("#modalChkSelectAllBranches");

    // Init Modal Branch Checkboxes
    function renderModalBranchCheckboxes() {
        $modalBranchesListContainer.empty();
        branchesData.forEach(branch => {
            const itemHtml = `
                <div class="branch-item" data-code="${branch.code}">
                    <input type="checkbox" id="modal_chk_branch_${branch.code}" class="modal-branch-chk" value="${branch.code}">
                    <label for="modal_chk_branch_${branch.code}" class="m-0 cursor-pointer w-100">${branch.name}</label>
                </div>
            `;
            $modalBranchesListContainer.append(itemHtml);
        });

        $(".modal-branch-chk").on("change", function () {
            const code = $(this).val();
            const isChecked = $(this).is(":checked");
            
            if (code === "99") {
                if (isChecked) {
                    modalSelectedBranches = ["99"];
                    $(".modal-branch-chk").not("#modal_chk_branch_99").prop("checked", false);
                } else {
                    modalSelectedBranches = [];
                }
            } else {
                if (isChecked) {
                    $("#modal_chk_branch_99").prop("checked", false);
                    modalSelectedBranches = modalSelectedBranches.filter(b => b !== "99");
                    if (!modalSelectedBranches.includes(code)) modalSelectedBranches.push(code);
                } else {
                    modalSelectedBranches = modalSelectedBranches.filter(b => b !== code);
                }
            }
            
            updateModalBranchDisplay();
            updateModalSelectAllState();
        });
    }

    function syncModalCheckboxesState() {
        $(".modal-branch-chk").prop("checked", false);
        modalSelectedBranches.forEach(code => {
            $(`#modal_chk_branch_${code}`).prop("checked", true);
        });
        updateModalSelectAllState();
    }

    function updateModalSelectAllState() {
        const totalCheckable = branchesData.length;
        const totalChecked = modalSelectedBranches.length;
        $modalChkSelectAllBranches.prop("checked", totalChecked === totalCheckable);
    }

    $modalChkSelectAllBranches.on("change", function () {
        if ($(this).is(":checked")) {
            modalSelectedBranches = branchesData.map(b => b.code);
        } else {
            modalSelectedBranches = [];
        }
        syncModalCheckboxesState();
        updateModalBranchDisplay();
    });

    function updateModalBranchDisplay() {
        $modalBranchSelectDisplay.find(".branch-tag").remove();
        if (modalSelectedBranches.length === 0) {
            $("#modalBranchSelectPlaceholder").show();
        } else {
            $("#modalBranchSelectPlaceholder").hide();
            modalSelectedBranches.forEach(code => {
                const branchObj = branchesData.find(b => b.code === code);
                if (branchObj) {
                    const labelText = `${branchObj.name}`;
                    const tagHtml = `
                        <div class="branch-tag branch-tag-blue" data-code="${code}">
                            <span>${labelText}</span>
                            <button type="button" class="tag-remove-btn modal-tag-remove-btn" title="นำออก">&times;</button>
                        </div>
                    `;
                    $(tagHtml).insertBefore($modalBranchSelectDisplay.find(".branch-dropdown-arrow"));
                }
            });
        }
    }

    $modalBranchSelectDisplay.on("click", ".modal-tag-remove-btn", function (e) {
        e.stopPropagation();
        const code = $(this).closest(".branch-tag").attr("data-code");
        modalSelectedBranches = modalSelectedBranches.filter(b => b !== code);
        $(`#modal_chk_branch_${code}`).prop("checked", false);
        updateModalSelectAllState();
        updateModalBranchDisplay();
    });

    $modalBranchSelectDisplay.on("click", function (e) {
        e.stopPropagation();
        $modalBranchSelectDisplay.toggleClass("open");
        $modalBranchDropdownPanel.toggleClass("show");
        $("#modalBranchSearchInput").val("").trigger("input");
    });

    $("#modalBranchSearchInput").on("input", function () {
        const searchVal = $(this).val().toLowerCase().trim();
        $modalBranchDropdownPanel.find(".branch-item").not("#modalSelectAllBranchesItem").each(function () {
            const text = $(this).find("label").text().toLowerCase();
            if (text.indexOf(searchVal) > -1) {
                $(this).removeClass("d-none");
            } else {
                $(this).addClass("d-none");
            }
        });
    });

    $("#modalRemarks").on("input", function () {
        const currentLen = $(this).val().length;
        $("#modalRemarksCharCounter").text(`${currentLen} / 500`);
    });

    // Click "+ New" Button to open modal
    $("#newActionBtn").on("click", function () {
        // Clear Modal Form
        $("#modalCampaignCode").val("");
        $("#modalCampaignName").val("");
        $("#modalStartDate").val("");
        $("#modalEndDate").val("");
        $("#modalRemarks").val("");
        $("#modalRemarksCharCounter").text("0 / 500");
        
        // Reset Branch selection in modal
        modalSelectedBranches = [];
        syncModalCheckboxesState();
        updateModalBranchDisplay();
        
        // Reset isImportFromExcel checkbox
        $("#chkImportExcel").prop("checked", false);
        
        // Show modal
        var myModal = new bootstrap.Modal(document.getElementById('createCampaignModal'));
        myModal.show();
    });

    // Modal Submit Button
    $("#modalSubmitBtn").off("click").on("click", function () {
        const name = $("#modalCampaignName").val().trim();
        const code = $("#modalCampaignCode").val().trim();
        const start = $("#modalStartDate").val();
        const end = $("#modalEndDate").val();
        const note = $("#modalRemarks").val().trim();
        
        if (!name || !start || !end) {
            Swal.fire({ title: "กรอกข้อมูลไม่ครบถ้วน", text: "กรุณากรอกชื่อแคมเปญ วันที่เริ่มต้น และวันที่สิ้นสุด", icon: "warning" });
            return;
        }
        
        if (modalSelectedBranches.length === 0) {
            Swal.fire({ title: "กรอกข้อมูลไม่ครบถ้วน", text: "กรุณาเลือกสาขาอย่างน้อย 1 สาขา", icon: "warning" });
            return;
        }

        Swal.fire({
            title: "ยืนยันการสร้าง",
            text: `ต้องการสร้างแคมเปญ "${name}" หรือไม่`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#28a745",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ยืนยัน",
            cancelButtonText: "ยกเลิก"
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Hide modal
                bootstrap.Modal.getInstance(document.getElementById('createCampaignModal')).hide();

                // Show Global Loading Overlay
                startLoading("กำลังสร้างแคมเปญใหม่", "ระบบกำลังบันทึกข้อมูล...");

                try {
                    const newGuid = crypto.randomUUID();
                    const company = window.CURRENT_COMPANY || "MICRO";
                    const postData = {
                        productInfo: {
                            product_code: code,
                            product_name: name,
                            product_start: start,
                            product_end: end,
                            product_remark: note,
                            product_guid: newGuid,
                            createrd_by: window.CURRENT_USER_ID || "system",
                            product_company: company,
                            offcde: modalSelectedBranches.join(",")
                        },
                        filtersInfo: selectedFilterCodes.map(c => ({
                            fguid: newGuid,
                            fcode: c,
                            fcompany: company
                        }))
                    };

                    const response = await fetch(`/Campain/PostCampain`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(postData)
                    });
                    
                    const data = await response.json();
                    
                    if (data.status === "success") {
                        const isImportFromExcel = $("#chkImportExcel").is(":checked");

                        const campaignData = {
                            guid: newGuid,
                            code: code,
                            name: name,
                            status: "ปกติ",
                            startDate: start,
                            endDate: end,
                            branches: [...modalSelectedBranches],
                            remarks: note,
                            isImportFromExcel: isImportFromExcel
                        };

                        campaigns.unshift(campaignData);
                        selectedCampaignCode = code;
                        selectedCampaignGuid = newGuid;
                        
                        Swal.fire({ title: "สร้างสำเร็จ", text: `สร้างแคมเปญใหม่ รหัส ${code} เรียบร้อยแล้ว`, icon: "success" });
                        await loadCampaignToForm(code);
                    } else {
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: data.message || "ไม่สามารถสร้างแคมเปญได้", icon: "error" });
                    }
                } catch (error) {
                    console.error(error);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", icon: "error" });
                } finally {
                    stopLoading();
                }
            }
        });
        
    });

    // Click Delete Button
    $("#deleteActionBtn").off("click").on("click", function () {
        if (!selectedCampaignCode) {
            Swal.fire({ title: "ไม่สามารถลบได้", text: "กรุณาเลือกแคมเปญที่ต้องการลบจากรายการด้านซ้ายก่อน", icon: "warning" });
            return;
        }
        
        Swal.fire({
            title: "ยืนยันการลบ?",
            text: `ต้องการลบรหัสแคมเปญ ${selectedCampaignCode} หรือไม่?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ยืนยัน",
            cancelButtonText: "ยกเลิก"
        }).then(async (result) => {
            if (result.isConfirmed) {
                startLoading("กำลังลบข้อมูล...", "ระบบกำลังลบ Product / Campaign...");
                try {
                    const response = await fetch(`/Campain/DeleteCampain?productId=${selectedCampaignCode}`);
                    const resultText = await response.text();
                    
                    if (response.ok && resultText.includes("Success")) {
                        campaigns = campaigns.filter(c => c.code !== selectedCampaignCode);
                        
                        Swal.fire({ title: "ลบสำเร็จ!", text: "แคมเปญถูกลบออกจากระบบแล้ว", icon: "success" });
                        
                        // Load first campaign left in list
                        if (campaigns.length > 0) {
                            await loadCampaignToForm(campaigns[0].code);
                        } else {
                            // Reset form
                            $("#newActionBtn").trigger("click");
                        }
                    } else {
                        Swal.fire({ title: "ลบไม่สำเร็จ", text: resultText || "เกิดข้อผิดพลาดในการลบแคมเปญ", icon: "error" });
                    }
                } catch (error) {
                    console.error(error);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", icon: "error" });
                } finally {
                    stopLoading();
                }
            }
        });
    });

    // Cancel Form Button
    $("#cancelFormBtn").off("click").on("click", function () {
        if (selectedCampaignCode) {
            // Reload original
            loadCampaignToForm(selectedCampaignCode);
            Swal.fire({ title: "ยกเลิกการแก้ไข", text: "คืนค่าข้อมูลเดิมเรียบร้อย", icon: "info", timer: 1000, showConfirmButton: false });
        } else {
            $("#newActionBtn").trigger("click");
        }
    });

    // Submit Form Button
    $("#submitFormBtn").off("click").on("click", function () {
        const name = $("#campaignName").val().trim();
        const code = $("#campaignCode").val().trim();
        const start = $("#startDate").val();
        const end = $("#endDate").val();
        const note = $remarks.val().trim();
        
        if (!name || !start || !end) {
            Swal.fire({ title: "กรอกข้อมูลไม่ครบถ้วน", text: "กรุณากรอกชื่อแคมเปญ วันที่เริ่มต้น และวันที่สิ้นสุด", icon: "warning" });
            return;
        }
        
        if (selectedBranches.length === 0) {
            Swal.fire({ title: "กรอกข้อมูลไม่ครบถ้วน", text: "กรุณาเลือกสาขาอย่างน้อย 1 สาขา", icon: "warning" });
            return;
        }

        const existingIdx = campaigns.findIndex(c => c.code === selectedCampaignCode);
        const campaignData = {
            guid: selectedCampaignGuid,
            code: code,
            name: name,
            status: "ปกติ",
            startDate: start,
            endDate: end,
            branches: [...selectedBranches],
            remarks: note
        };

        if (existingIdx > -1) {
            Swal.fire({
                title: "ยืนยันการบันทึก",
                text: `ต้องการบันทึกข้อมูลแคมเปญรหัส ${code} ใช่หรือไม่`,
                icon: "question",
                showCancelButton: true,
                confirmButtonColor: "#28a745",
                cancelButtonColor: "#3085d6",
                confirmButtonText: "ยืนยัน",
                cancelButtonText: "ยกเลิก"
            }).then(async (result) => {
                if (result.isConfirmed) {
                    startLoading("กำลังบันทึกข้อมูล...", "ระบบกำลังบันทึกข้อมูลแคมเปญและ Filter...");
                    try {
                        const filterRes = await postFilter(selectedCampaignGuid);
                        if (filterRes && (filterRes.status === "success" || filterRes.status === "warning")) {
                            campaigns[existingIdx] = campaignData;
                            Swal.fire({ title: "บันทึกข้อมูลสำเร็จ", text: `อัปเดตข้อมูลแคมเปญรหัส ${code} เรียบร้อยแล้ว`, icon: "success" });
                            await loadCampaignToForm(code);
                        } else {
                            Swal.fire({ title: "เกิดข้อผิดพลาด", text: filterRes?.message || "ไม่สามารถบันทึก Filter ได้", icon: "error" });
                        }
                    } catch (err) {
                        console.error(err);
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกข้อมูลได้", icon: "error" });
                    } finally {
                        stopLoading();
                    }
                }
            });
        } else {
            Swal.fire({
                title: "ยืนยันการสร้าง",
                text: `ต้องการสร้างแคมเปญ "${name}" หรือไม่`,
                icon: "question",
                showCancelButton: true,
                confirmButtonColor: "#28a745",
                cancelButtonColor: "#3085d6",
                confirmButtonText: "ยืนยัน",
                cancelButtonText: "ยกเลิก"
            }).then(async (result) => {
                if (result.isConfirmed) {
                    startLoading("กำลังบันทึกข้อมูล", "ระบบกำลังบันทึกข้อมูลแคมเปญและจัดเตรียมกลุ่มเป้าหมาย...");

                    try {
                        const newGuid = crypto.randomUUID();
                        const company = window.CURRENT_COMPANY || "MICRO";
                        const postData = {
                            productInfo: {
                                product_code: code,
                                product_name: name,
                                product_start: start,
                                product_end: end,
                                product_remark: note,
                                product_guid: newGuid,
                                createrd_by: window.CURRENT_USER_ID || "system",
                                product_company: company,
                                offcde: selectedBranches.join(",")
                            },
                            filtersInfo: selectedFilterCodes.map(c => ({
                                fguid: newGuid,
                                fcode: c,
                                fcompany: company
                            }))
                        };

                        const response = await fetch(`/Campain/PostCampain`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(postData)
                        });
                        
                        const data = await response.json();
                        
                        if (data.status === "success") {
                            campaignData.guid = newGuid;
                            campaigns.unshift(campaignData);
                            selectedCampaignCode = code;
                            selectedCampaignGuid = newGuid;
                            Swal.fire({ title: "สร้างสำเร็จ", text: `สร้างแคมเปญใหม่ รหัส ${code} เรียบร้อยแล้ว`, icon: "success" });
                            await loadCampaignToForm(code);
                        } else {
                            Swal.fire({ title: "เกิดข้อผิดพลาด", text: data.message || "ไม่สามารถสร้างแคมเปญได้", icon: "error" });
                        }
                    } catch (error) {
                        console.error(error);
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", icon: "error" });
                    } finally {
                        stopLoading();
                    }
                }
            });
        }
    });

    // Initial Execution on Load
    try {
        renderBranchCheckboxes();
        renderModalBranchCheckboxes();
        await renderMasterFilters();
        initDataTables();
        if (selectedCampaignCode) {
            await loadCampaignToForm(selectedCampaignCode);
        } else if (campaigns && campaigns.length > 0) {
            await loadCampaignToForm(campaigns[0].code);
        }
    } finally {
        stopLoading();
    }
});
