
function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

let masterFiltersData = [];
let selectedFilterCodes = [];
let selectedCampaignCode = "";
let selectedCampaignGuid = "";
let selectedCampaignId = 0;
const pageSize = 5;
let page = 1;
let rawMasterFilters = [];
let campaignTable;

async function SearchCampaign() {
    page = 1;
    if (campaignTable) {
        campaignTable.page(0).draw(false);
    } else {
        const searchText = $("#campaignSearchInput").val();
        const response = await getCampainList(page, pageSize, searchText);
        console.log("response", response);
    }
}   

async function GetMasterObjective() {
    const response = await fetch(`/Campain/GetMasterObjective`);
    if (!response.ok) return [];
    const data = await response.json();
    return data || [];
}

async function renderMasterObjectives() {
    try {
        const objectives = await GetMasterObjective();
        const $objectiveSelects = $("#campaignObjective, #modalCampaignObjective");
        
        $objectiveSelects.html('<option value="">เลือกวัตถุประสงค์</option>');
        
        let popoverInnerHtml = "";

        if (Array.isArray(objectives) && objectives.length > 0) {
            objectives.forEach(item => {
                const code = item.Code || "";
                const nameEn = item.NameEn || "";
                const nameTh = item.NameTh || "";

                const labelText = `${code}: ${nameEn} ${nameTh}`.replace(/\s+/g, ' ').trim();

                $objectiveSelects.append(
                    $("<option></option>").attr("value", code).text(labelText)
                );

                popoverInnerHtml += `
                    <div style="display:grid; grid-template-columns:30px 15px 1fr; gap:0;">
                        <strong class="text-primary">${code}</strong>
                        <span>:</span>
                        <span>${nameEn} ${nameTh}</span>
                    </div>
                `;
            });
        }

        const popoverContentHtml = `<div class='py-1 text-nowrap' style='font-size: 0.875rem; line-height: 1.8; white-space: nowrap;'>${popoverInnerHtml}</div>`;
        
        const $popoverIcons = $('label[for="campaignObjective"] [data-bs-toggle="popover"], label[for="modalCampaignObjective"] [data-bs-toggle="popover"]');
        $popoverIcons.attr("data-bs-content", popoverContentHtml);
        
        $popoverIcons.each(function () {
            const existingPopover = bootstrap.Popover.getInstance(this);
            if (existingPopover) {
                existingPopover.dispose();
            }
            bootstrap.Popover.getOrCreateInstance(this, {
                container: 'body',
                html: true,
                sanitize: false,
                trigger: 'click'
            });
        });
    } catch (error) {
        console.error("Error rendering master objectives:", error);
    }
}

async function GetFilterByGuid(productGuid) {
    const guid = productGuid || selectedCampaignGuid || "";
    if (!guid) return [];
    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
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
    const isDisabled = !selectedCampaignCode;
    $(".filter-chk, #chkSelectAllFilters").prop("disabled", isDisabled);

    $(".filter-chk").each(function () {
        const code = $(this).attr("data-fcode") || $(this).val();
        $(this).prop("checked", selectedFilterCodes.includes(code));
    });
    updateSelectAllFiltersState();
    updateSelectedFiltersDisplay();
}

async function fetchRawMasterFilters() {
    if (rawMasterFilters && rawMasterFilters.length > 0) {
        return rawMasterFilters;
    }
    try {
        const response = await fetch(`/Campain/GetMasterFilter`);
        if (!response.ok) return [];
        const data = await response.json();
        rawMasterFilters = data || [];
        return rawMasterFilters;
    } catch (e) {
        console.error("Error fetching raw master filter:", e);
        return [];
    }
}

async function getImportFilter() {
    const rawList = await fetchRawMasterFilters();
    const importItem = rawList.find(item => {
        const name = (item.fname || item.fName || item.FName || item.f_name || "").toString().toLowerCase();
        return name === "import";
    });
    return importItem;
}

async function postFilter(productGuid) {
    const guid = productGuid || selectedCampaignGuid || "c0fdef43-449f-4fc8-bcd7-d7cfe9050721";
    const company = window.CURRENT_COMPANY || "MICRO";
    const isImportFromExcel = $("#chkImportExcel").is(":checked");

    let filterCodesToPost = [...(selectedFilterCodes || [])];

    if (isImportFromExcel) {
        const importFilterObj = await getImportFilter();
        if (importFilterObj) {
            const importCode = importFilterObj.fcode || importFilterObj.fCode || importFilterObj.FCode || importFilterObj.f_code || "";
            if (importCode && !filterCodesToPost.includes(importCode)) {
                filterCodesToPost.push(importCode);
            }
        }
    }

    const postData = filterCodesToPost.map(code => ({
        fguid: guid,
        fcode: code,
        fcompany: company
    }));

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
    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    try {
        const data = await fetchRawMasterFilters();
        const mappedData = (data || [])
            .filter(item => {
                const code = (item.fcode || "").toString().toUpperCase();
                const name = (item.fname || "").toString().toLowerCase();
                return code !== "F999" && name !== "import";
            })
            .map(item => ({
                id: item.id ?? 0,
                fcode: item.fcode || "",
                fname: item.fname || "",
                fremark: item.fremark || "",
                ftype: item.ftype || "",
                fcompany: item.fcompany || "",
                fstatus: item.fstatus || "",
                fremark2: item.fremark2 || ""
            }));
        
        return mappedData;
    } catch (error) {
        console.error('Error fetching master filter data:', error);
        return [];
    } finally {
        stopLoading();
    }
}

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
            const isDisabled = !selectedCampaignCode ? "disabled" : "";
            const rowHtml = `
                <div class="filter-name-row d-flex py-2 align-items-center" style="border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; cursor: pointer;" data-id="${item.id}" data-fcode="${item.fcode}">
                    <div style="width: 8%; text-align: center;">
                        <input type="checkbox" class="filter-chk" value="${item.fcode}" data-fcode="${item.fcode}" ${isChecked} ${isDisabled} style="cursor: pointer;">
                    </div>
                    <div style="width: 50%; color: #1e293b; font-weight: 500; padding-right: 0.5rem; word-break: break-word;">${description}</div>
                </div>
            `;
            $container.append(rowHtml);
        });

        // Attach checkbox change event
        $(".filter-chk").off("change").on("change", function (e) {
            if (!selectedCampaignCode) return;
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
            if (!selectedCampaignCode) return;
            if ($(e.target).is("input[type='checkbox']")) return;
            const $chk = $(this).find(".filter-chk");
            $chk.prop("checked", !$chk.is(":checked")).trigger("change");
        });

        // Select All Filters Checkbox handler
        $("#chkSelectAllFilters").off("change").on("change", function () {
            if (!selectedCampaignCode) return;
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
    const isDisabled = !selectedCampaignCode;
    $("#chkSelectAllFilters").prop("checked", total > 0 && checkedCount === total).prop("disabled", isDisabled);
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

async function getCampainList(page, pageSize, searchText) {
    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    try {
        let queryStr = (page !== undefined && pageSize !== undefined) 
            ? `?page=${page}&pageSize=${pageSize}`
            : '';
        if (searchText !== undefined && searchText !== null && searchText !== '') {
            queryStr += `&search=${searchText}`;
        }
        const response = await fetch(`/Campain/GetCampainList${queryStr}`);
        if (!response.ok) throw new Error("Failed to fetch campaigns list");
        const jsonResult = await response.json();
        const items = jsonResult && Array.isArray(jsonResult.data) ? jsonResult.data : (Array.isArray(jsonResult) ? jsonResult : []);
        const mapped = items.map(item => ({
            id: item.id ?? item.Id ?? 0,
            guid: item.product_guid || "",
            code: item.product_code || "",
            name: item.product_name || "",
            status: item.product_status || "ปกติ",
            startDate: item.product_start ? item.product_start.substring(0, 10) : "",
            endDate: item.product_end ? item.product_end.substring(0, 10) : "",
            objective: item.Objective_code || item.objective_code || item.ObjectiveCode || item.objectiveCode || item.objective || "",
            branches: item.offcde ? item.offcde.split(',') : [],
            remarks: item.product_remark || "",
            isImportFromExcel: false
        }));
        
        return {
            page: jsonResult.page ?? (page ? parseInt(page) : 1),
            pageSize: jsonResult.pageSize ?? (pageSize ? parseInt(pageSize) : mapped.length),
            count: jsonResult.count ?? mapped.length,
            data: mapped
        };
    }
    catch(error){
        console.error("Error in getCampainList:", error);
        return { page: page, pageSize: pageSize, count: 0, data: [] };
    } finally {
        stopLoading();
    }
}

$(document).ready(async function () {
    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    // Fetch Branches Data
    let branchesData = [];
    try {
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
        const branchRes = await fetch(`/Campain/getBranchListForCRM`);
        const branchList = await branchRes.json();
        branchesData = (branchList || [])
            .filter(b => (b.offcde || "") !== "99")
            .map(b => ({
                code: String(b.offcde || b.Offcde || "").trim(),
                name: b.branch_name || "ไม่ทราบชื่อ"
            }));

        // Always add virtual "ทุกสาขา" (code 99) option at the top
        branchesData.unshift({
            code: "99",
            name: "ทุกสาขา"
        });
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
    const $remarks = $("#remarks");
    const $remarksCharCounter = $("#remarksCharCounter");

    // Helper to identify excluded branches (MIB, MFIN, สาขาใหญ่)
    function isExcludedBranch(branch) {
        if (!branch) return false;
        const code = String(branch.code || "").trim().toUpperCase();
        const name = String(branch.name || "").trim().toUpperCase();
        
        // 1. MIB
        if (code === "MIB" || name.includes("MIB")) return true;
        
        // 2. MFIN
        if (code === "MFIN" || name.includes("MFIN")) return true;
        
        // 3. สาขาใหญ่
        if (code === "00" || code === "000" || name.includes("สาขาใหญ่") || name.includes("สำนักงานใหญ่") || name.includes("HEAD OFFICE") || name.includes("MAIN BRANCH")) return true;
        
        return false;
    }

    function updateSelectAllState() {
        const nonExcludedBranches = branchesData.filter(b => b.code !== "99" && !isExcludedBranch(b));
        const excludedBranches = branchesData.filter(b => b.code !== "99" && isExcludedBranch(b));
        
        const allNonExcludedChecked = nonExcludedBranches.length > 0 && 
            nonExcludedBranches.every(b => selectedBranches.includes(b.code));
        const anyExcludedChecked = excludedBranches.some(b => selectedBranches.includes(b.code));
        
        const is99Checked = allNonExcludedChecked && !anyExcludedChecked;
        
        $("#chk_branch_99").prop("checked", is99Checked);
        if (is99Checked) {
            if (!selectedBranches.includes("99")) {
                selectedBranches.push("99");
            }
        } else {
            selectedBranches = selectedBranches.filter(b => b !== "99");
        }
    }

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
                if (isChecked) {
                    const nonExcludedCodes = branchesData
                        .filter(b => b.code !== "99" && !isExcludedBranch(b))
                        .map(b => b.code);
                    
                    selectedBranches = ["99", ...nonExcludedCodes];
                    
                    branchesData.forEach(b => {
                        if (b.code === "99") {
                            $(`#chk_branch_${b.code}`).prop("checked", true);
                        } else if (isExcludedBranch(b)) {
                            $(`#chk_branch_${b.code}`).prop("checked", false);
                        } else {
                            $(`#chk_branch_${b.code}`).prop("checked", true);
                        }
                    });
                } else {
                    selectedBranches = [];
                    $(".branch-chk").prop("checked", false);
                }
            } else {
                if (isChecked) {
                    if (!selectedBranches.includes(code)) {
                        selectedBranches.push(code);
                    }
                } else {
                    selectedBranches = selectedBranches.filter(b => b !== code);
                }
                updateSelectAllState();
            }
            
            updateBranchDisplay();
        });
    }

    // Sync Branch Checklist checkboxes with selectedBranches array
    function syncCheckboxesState() {
        $(".branch-chk").prop("checked", false);
        if (selectedBranches.includes("99")) {
            const nonExcludedCodes = branchesData
                .filter(b => b.code !== "99" && !isExcludedBranch(b))
                .map(b => b.code);
            nonExcludedCodes.forEach(c => {
                if (!selectedBranches.includes(c)) {
                    selectedBranches.push(c);
                }
            });
        }
        selectedBranches.forEach(code => {
            $(`#chk_branch_${code}`).prop("checked", true);
        });
        updateSelectAllState();
    }

    // Update Branch Input Display with tag pills
    function updateBranchDisplay() {
        // Clear existing tags
        $branchSelectDisplay.find(".branch-tag").remove();
        
        // Exclude virtual "99" (ทุกสาขา) option from tag pill display
        const displayBranches = selectedBranches.filter(code => code !== "99");
        
        if (displayBranches.length === 0) {
            $("#branchSelectPlaceholder").show();
        } else {
            $("#branchSelectPlaceholder").hide();
            
            // Render tags
            displayBranches.forEach(code => {
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

    function setProductFormState(hasSelected) {
        if (!hasSelected) {
            selectedCampaignCode = "";
            selectedCampaignGuid = "";
            selectedCampaignId = 0;

            $("#campaignCode").val("");
            $("#campaignName").val("");
            $("#startDate").val("");
            $("#endDate").val("").removeAttr("min");
            $("#campaignObjective").val("");
            $("#remarks").val("");
            $("#remarksCharCounter").text("0 / 500");

            selectedBranches = [];
            syncCheckboxesState();
            updateBranchDisplay();

            $("#chkImportExcel").prop("checked", false);
            $("#excelFileInput").val("");
            $("#selectedFileNameDisplay").addClass("d-none").removeClass("d-flex").hide();
            $("#filterSelectedRow").hide();
            $("#btnGotoETL").hide();

            selectedFilterCodes = [];
            updateFilterSelectionUI();

            $("#campaignName, #startDate, #endDate, #campaignObjective, #remarks, #chkImportExcel, #btnImportExcel, #submitFormBtn").prop("disabled", true);
            $("#branchSelectDisplay, #branchSelectContainer").addClass("disabled").css("pointer-events", "none");
            $(".branch-chk").prop("disabled", true);
            $(".filter-chk, #chkSelectAllFilters").prop("disabled", true);

            $(".campaign-card").removeClass("active");
        } else {
            $("#campaignName, #startDate, #endDate, #campaignObjective, #remarks, #chkImportExcel, #btnImportExcel, #submitFormBtn").prop("disabled", false);
            $("#branchSelectDisplay, #branchSelectContainer").removeClass("disabled").css("pointer-events", "auto");
            $(".branch-chk").prop("disabled", false);
            $(".filter-chk, #chkSelectAllFilters").prop("disabled", false);
        }
    }

    // Remove tag click event handler (using event delegation)
    $branchSelectDisplay.on("click", ".tag-remove-btn", function (e) {
        if ($("#branchSelectDisplay").hasClass("disabled") || $("#branchSelectContainer").hasClass("disabled")) return;
        e.stopPropagation(); // Avoid opening the dropdown
        const code = $(this).closest(".branch-tag").attr("data-code");
        selectedBranches = selectedBranches.filter(b => b !== code);
        
        $(`#chk_branch_${code}`).prop("checked", false);
        updateSelectAllState();
        updateBranchDisplay();
    });

    // Toggle Dropdown Panel
    $branchSelectDisplay.on("click", function (e) {
        if (!selectedCampaignCode) return;
        if ($(this).hasClass("disabled") || $("#branchSelectContainer").hasClass("disabled")) return;
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

    function initDataTables() {
        campaignTable = $campaignsTable.DataTable({
            serverSide: true,
            processing: false,
            pageLength: pageSize,
            ordering: true,
            dom: '<"campaign-list-container"t><"d-flex justify-content-center mt-3"p>',
            language: {
                info: "แสดง _START_ ถึง _END_ จาก _TOTAL_ รายการ",
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
            ajax: async function (data, callback, settings) {
                const requestedPage = Math.floor(data.start / data.length) + 1;
                page = requestedPage;
                try {
                    const searchText = $("#campaignSearchInput").val();
                    const res = await getCampainList(page, pageSize, searchText);
                    const rawItems = Array.isArray(res) ? res : (res.data || []);
                    campaigns = rawItems;
                    totalCampaignsCountValue = res.count !== undefined ? res.count : rawItems.length;
                    $totalCampaignsCount.text(totalCampaignsCountValue);

                    callback({
                        draw: data.draw,
                        recordsTotal: totalCampaignsCountValue,
                        recordsFiltered: totalCampaignsCountValue,
                        data: rawItems
                    });
                } catch (err) {
                    console.error("Error fetching DataTables page:", err);
                    callback({
                        draw: data.draw,
                        recordsTotal: 0,
                        recordsFiltered: 0,
                        data: []
                    });
                }
            },
            columns: [
                { 
                    data: null,
                    orderable: false,
                    render: function (data, type, row) {
                        if (!row || !row.code) return '';
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
            order: [[sortFieldToColumnIdx[activeSortField], activeSortOrder]]
        });
    }

    function renderCampaignsList() {
        if (campaignTable) {
            campaignTable.draw(false);
        }
    }

    // Load Campaign into Form
    async function loadCampaignToForm(code) {
        const campaign = campaigns.find(c => c.code === code);
        if (!campaign) return;
        
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
        try {
            selectedCampaignCode = code;
            selectedCampaignGuid = campaign.guid || "c0fdef43-449f-4fc8-bcd7-d7cfe9050721";
            selectedCampaignId = campaign.id || 0;
            setProductFormState(true);
            
            //#region setReadonly
            let canEdit = true;

            //#region setcanEdit
            const statusCanEdit = [
                "waiting prospect",
                "reject"
            ]

            if(statusCanEdit.includes(campaign.status)) {
                canEdit = false;
            } 

            //#endregion

            $('#campaignName').prop('disabled', canEdit);
            $('#startDate').prop('disabled', canEdit);
            $('#endDate').prop('disabled', canEdit);
            $('#campaignObjective').prop('disabled', canEdit);
            $('#remarks').prop('disabled', canEdit);
            $('#branchSelectContainer').toggleClass('disabled', canEdit);
            $('#branchSelectDisplay').toggleClass('disabled', canEdit);
            $('.branch-chk').prop('disabled', canEdit);
            if (canEdit) {
                $('#branchSelectDisplay, #branchSelectContainer').css('pointer-events', 'none');
            } else {
                $('#branchSelectDisplay, #branchSelectContainer').css('pointer-events', 'auto');
            }

            //#endregion
            // Populate inputs
            $("#campaignCode").val(campaign.code);
            $("#campaignName").val(campaign.name);
            $("#startDate").val(campaign.startDate);
            $("#endDate").val(campaign.endDate);
            $("#campaignObjective").val(campaign.objective || "");
            if (campaign.startDate) {
                $("#endDate").attr("min", campaign.startDate);
            } else {
                $("#endDate").removeAttr("min");
            }
            $("#remarks").val(campaign.remarks);
            
            // Update character counter
            const currentLen = campaign.remarks ? campaign.remarks.length : 0;
            $remarksCharCounter.text(`${currentLen} / 500`);
            
            // Populate branch selector
            selectedBranches = [...campaign.branches];
            syncCheckboxesState();
            updateBranchDisplay();
            
            // Fetch assigned filters for selected campaign via GetFilterByGuid
            if (selectedCampaignGuid) {
                try {
                    const filterData = await GetFilterByGuid(selectedCampaignGuid);
                    const importFilterObj = await getImportFilter();
                    const importCode = importFilterObj ? (importFilterObj.fcode || importFilterObj.fCode || importFilterObj.FCode || importFilterObj.f_code || "") : "";

                    const hasImportFilter = Array.isArray(filterData) && filterData.some(item => {
                        const fname = (item.fname || item.fName || item.FName || "").toString().toLowerCase();
                        const fcode = (item.fcode || item.fCode || item.FCode || item.f_code || "").toString();
                        return fname === "import" || (importCode && fcode === importCode);
                    });

                    if (hasImportFilter) {
                        campaign.isImportFromExcel = true;
                    }

                    if (campaign.isImportFromExcel) {
                        $("#chkImportExcel").prop("checked", true);
                        $("#filterSelectedRow").hide();
                        $("#btnGotoETL").show();
                    } else {
                        $("#chkImportExcel").prop("checked", false);
                        $("#filterSelectedRow").show();
                        $("#btnGotoETL").hide();
                    }

                    if (Array.isArray(filterData)) {
                        selectedFilterCodes = filterData
                            .map(item => item.fcode || item.fCode || item.FCode || item.f_code || "")
                            .filter(c => c !== "" && c !== importCode);
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

    // Restrict main endDate so it cannot be earlier than main startDate
    $("#startDate").on("change input", function () {
        const startDateVal = $(this).val();
        if (startDateVal) {
            $("#endDate").attr("min", startDateVal);
            if ($("#endDate").val() && $("#endDate").val() < startDateVal) {
                $("#endDate").val(startDateVal);
            }
        } else {
            $("#endDate").removeAttr("min");
        }
    });

    // Search/Filter Campaigns in Sidebar List
    $("#btnSearch").off("click").on("click", function () {
        SearchCampaign();
    });

    $campaignSearchInput.off("keyup").on("keyup", function (e) {
        if (e.key === "Enter" || e.keyCode === 13) {
            SearchCampaign();
        }
    });

    // Refresh List Buttons Action
    $("#refreshCampaignsListBtn").off("click").on("click", async function () {
        $campaignSearchInput.val("");
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
        try {
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
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
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

    function updateModalSelectAllState() {
        const nonExcludedBranches = branchesData.filter(b => b.code !== "99" && !isExcludedBranch(b));
        const excludedBranches = branchesData.filter(b => b.code !== "99" && isExcludedBranch(b));
        
        const allNonExcludedChecked = nonExcludedBranches.length > 0 && 
            nonExcludedBranches.every(b => modalSelectedBranches.includes(b.code));
        const anyExcludedChecked = excludedBranches.some(b => modalSelectedBranches.includes(b.code));
        
        const is99Checked = allNonExcludedChecked && !anyExcludedChecked;
        
        $("#modal_chk_branch_99").prop("checked", is99Checked);
        if (is99Checked) {
            if (!modalSelectedBranches.includes("99")) {
                modalSelectedBranches.push("99");
            }
        } else {
            modalSelectedBranches = modalSelectedBranches.filter(b => b !== "99");
        }
    }

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
                    const nonExcludedCodes = branchesData
                        .filter(b => b.code !== "99" && !isExcludedBranch(b))
                        .map(b => b.code);
                    
                    modalSelectedBranches = ["99", ...nonExcludedCodes];
                    
                    branchesData.forEach(b => {
                        if (b.code === "99") {
                            $(`#modal_chk_branch_${b.code}`).prop("checked", true);
                        } else if (isExcludedBranch(b)) {
                            $(`#modal_chk_branch_${b.code}`).prop("checked", false);
                        } else {
                            $(`#modal_chk_branch_${b.code}`).prop("checked", true);
                        }
                    });
                } else {
                    modalSelectedBranches = [];
                    $(".modal-branch-chk").prop("checked", false);
                }
            } else {
                if (isChecked) {
                    if (!modalSelectedBranches.includes(code)) modalSelectedBranches.push(code);
                } else {
                    modalSelectedBranches = modalSelectedBranches.filter(b => b !== code);
                }
                updateModalSelectAllState();
            }
            
            updateModalBranchDisplay();
        });
    }

    function syncModalCheckboxesState() {
        $(".modal-branch-chk").prop("checked", false);
        if (modalSelectedBranches.includes("99")) {
            const nonExcludedCodes = branchesData
                .filter(b => b.code !== "99" && !isExcludedBranch(b))
                .map(b => b.code);
            nonExcludedCodes.forEach(c => {
                if (!modalSelectedBranches.includes(c)) {
                    modalSelectedBranches.push(c);
                }
            });
        }
        modalSelectedBranches.forEach(code => {
            $(`#modal_chk_branch_${code}`).prop("checked", true);
        });
        updateModalSelectAllState();
    }

    function updateModalBranchDisplay() {
        $modalBranchSelectDisplay.find(".branch-tag").remove();
        
        // Exclude virtual "99" (ทุกสาขา) option from tag pill display
        const displayBranches = modalSelectedBranches.filter(code => code !== "99");
        
        if (displayBranches.length === 0) {
            $("#modalBranchSelectPlaceholder").show();
        } else {
            $("#modalBranchSelectPlaceholder").hide();
            displayBranches.forEach(code => {
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

    // Restrict modalEndDate so it cannot be earlier than modalStartDate
    $("#modalStartDate").on("change input", function () {
        const startDateVal = $(this).val();
        if (startDateVal) {
            $("#modalEndDate").attr("min", startDateVal);
            if ($("#modalEndDate").val() && $("#modalEndDate").val() < startDateVal) {
                $("#modalEndDate").val(startDateVal);
            }
        } else {
            $("#modalEndDate").removeAttr("min");
        }
    });

async function getCheckProductNo() {
    try {
        const response = await fetch('/Campain/GetCheckProductNo');
        if (!response.ok) return '';
        const resText = await response.text();
        if (!resText) return '';

        let data = resText;
        if (typeof resText === 'string') {
            try {
                data = JSON.parse(resText);
            } catch (e) {
                return resText;
            }
        }
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {}
        }

        if (Array.isArray(data) && data.length > 0) {
            return data[0].newCode || data[0].NewCode || data[0].code || data[0].Code || '';
        } else if (data && typeof data === 'object') {
            return data.newCode || data.NewCode || data.code || data.Code || '';
        }
        return '';
    } catch (err) {
        console.error("Error fetching GetCheckProductNo:", err);
        return '';
    }
}

    // Click "+ New" Button to open modal
    $("#newActionBtn").on("click", function () {
        // Clear Modal Form
        $("#modalCampaignCode").val("กำลังสร้างรหัส...");
        $("#modalCampaignName").val("");
        $("#modalStartDate").val("");
        $("#modalEndDate").val("").removeAttr("min");
        $("#modalCampaignObjective").val("");
        $("#modalRemarks").val("");
        $("#modalRemarksCharCounter").text("0 / 500");
        
        // Reset Branch selection in modal
        modalSelectedBranches = [];
        syncModalCheckboxesState();
        updateModalBranchDisplay();
        
        // Reset isImportFromExcel checkbox & file inputs in modal
        $("#modalChkImportExcel").prop("checked", false);
        $("#modalExcelFileInput").val("");
        $("#modalSelectedFileNameDisplay").addClass("d-none").removeClass("d-flex").hide();

        // Fetch and populate Product Code from GetCheckProductNo
        getCheckProductNo().then(newCode => {
            $("#modalCampaignCode").val(newCode);
            $("#campaignCode").val(newCode);
        });
        
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
        const Objective_code = $("#modalCampaignObjective").val();
        
        if (!name || !start || !end) {
            Swal.fire({ title: "กรอกข้อมูลไม่ครบถ้วน", text: "กรุณากรอกชื่อแคมเปญ วันที่เริ่มต้น และวันที่สิ้นสุด", icon: "warning" });
            return;
        }

        if (end < start) {
            Swal.fire({ title: "วันที่ไม่ถูกต้อง", text: "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น", icon: "warning" });
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
                    const newGuid = generateUUID();
                    const company = window.CURRENT_COMPANY || "MICRO";
                    const isImportFromExcel = $("#modalChkImportExcel").is(":checked");

                    let filterCodesToPost = [];

                    if (isImportFromExcel) {
                        const importFilterObj = await getImportFilter();
                        if (importFilterObj) {
                            const importCode = importFilterObj.fcode || importFilterObj.fCode || importFilterObj.FCode || importFilterObj.f_code || "";
                            if (importCode) {
                                filterCodesToPost.push(importCode);
                            }
                        }
                    }

                    const postData = {
                        productInfo: {
                            product_code: code,
                            product_name: name,
                            product_start: start,
                            product_end: end,
                            product_remark: note,
                            product_guid: newGuid,
                            createrd_by: window.CURRENT_USER_ID,
                            product_company: company,
                            offcde: modalSelectedBranches.filter(b => b !== "99").join(","),
                            Objective_code: Objective_code
                        },
                        filtersInfo: filterCodesToPost.map(c => ({
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
                        const campaignData = {
                            guid: newGuid,
                            code: code,
                            name: name,
                            status: "ปกติ",
                            startDate: start,
                            endDate: end,
                            objective: Objective_code,
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
        if (!selectedCampaignId && !selectedCampaignCode) {
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
                startLoading("กำลังลบข้อมูล...", "ระบบกำลังลบ Campaign...");
                try {
                    const response = await fetch(`/Campain/DeleteCampain?productId=${encodeURIComponent(selectedCampaignId)}`);
                    const resultText = await response.text();
                    
                    if (response.ok && resultText.includes("Success")) {
                        Swal.fire({ title: "ลบสำเร็จ!", text: "แคมเปญถูกลบออกจากระบบแล้ว", icon: "success" });
                        
                        // Re-fetch fresh campaign list from server
                        renderCampaignsList();
                        
                        setProductFormState(false);
                        renderCampaignsList();
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
            setProductFormState(false);
        }
    });

    // Submit Form Button
    $("#submitFormBtn").off("click").on("click", function () {
        if (!selectedCampaignCode) {
            Swal.fire({ title: "กรุณาเลือก Campaign", text: "กรุณาเลือก Campaign จากรายการทางด้านซ้ายก่อนทำการบันทึกข้อมูล", icon: "warning" });
            return;
        }
        const name = ($("#campaignName").val() || "").trim();
        const code = ($("#campaignCode").val() || "").trim();
        const start = $("#startDate").val() || "";
        const end = $("#endDate").val() || "";
        const note = ($remarks && $remarks.length && $remarks.val()) ? $remarks.val().trim() : "";
        const Objective_code = $("#campaignObjective").val() || "";

        if (start && end && end < start) {
            Swal.fire({ title: "วันที่ไม่ถูกต้อง", text: "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น", icon: "warning" });
            return;
        }

        const existingIdx = campaigns.findIndex(c => c.code === selectedCampaignCode);
        const currentCampaignId = selectedCampaignId || (existingIdx > -1 ? campaigns[existingIdx].id : 0);
        const campaignData = {
            id: currentCampaignId,
            code: code,
            name: name,
            status: "ปกติ",
            startDate: start,
            endDate: end,
            objective: Objective_code,
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
                        const company = window.CURRENT_COMPANY || "MICRO";
                        const updatePayload = {
                            productInfo: {
                                id: currentCampaignId ? String(currentCampaignId) : "",
                                product_code: code,
                                product_name: name,
                                product_start: start,
                                product_end: end,
                                product_remark: note,
                                product_guid: selectedCampaignGuid,
                                updated_by: window.CURRENT_USER_ID || "system",
                                product_company: company,
                                offcde: selectedBranches.filter(b => b !== "99").join(","),
                                Objective_code: Objective_code
                            }
                        };
                        await fetch(`/Campain/UpdateCampaign`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(updatePayload)
                        });

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
                        const newGuid = generateUUID();
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
                                offcde: selectedBranches.filter(b => b !== "99").join(","),
                                Objective_code: Objective_code
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
        await renderMasterObjectives();
        renderBranchCheckboxes();
        renderModalBranchCheckboxes();
        await renderMasterFilters();
        initDataTables();

        // Initialize Bootstrap Popovers
        const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
        [...popoverTriggerList].forEach(popoverTriggerEl => {
            bootstrap.Popover.getOrCreateInstance(popoverTriggerEl, {
                container: 'body',
                html: true,
                sanitize: false,
                trigger: 'click'
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
        $("#chkImportExcel").off("change").on("change", function () {
            if ($(this).is(":checked")) {
                $("#filterSelectedRow").hide();
            } else {
                $("#filterSelectedRow").show();
            }
        });

        $("#btnImportExcel").off("click").on("click", function () {
            $("#excelFileInput").trigger("click");
        });

        $("#btnModalImportExcel").off("click").on("click", function () {
            $("#modalExcelFileInput").trigger("click");
        });

        $("#excelFileInput").off("change").on("change", function () {
            const file = this.files && this.files[0];
            if (file) {
                $("#selectedFileNameText").text(file.name);
                $("#selectedFileNameDisplay").removeClass("d-none").addClass("d-flex").show();
                Swal.fire({
                    title: "เลือกไฟล์สำเร็จ",
                    text: `ไฟล์ที่เลือก: ${file.name}`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                $("#selectedFileNameDisplay").addClass("d-none").removeClass("d-flex").hide();
            }
        });

        $(document).off("click", "#btnRemoveExcelFile").on("click", "#btnRemoveExcelFile", function () {
            $("#excelFileInput").val("");
            $("#selectedFileNameDisplay").addClass("d-none").removeClass("d-flex").hide();
        });

        $("#modalExcelFileInput").off("change").on("change", function () {
            const file = this.files && this.files[0];
            if (file) {
                $("#modalSelectedFileNameText").text(file.name);
                $("#modalSelectedFileNameDisplay").removeClass("d-none").addClass("d-flex").show();
                Swal.fire({
                    title: "เลือกไฟล์สำเร็จ",
                    text: `ไฟล์ที่เลือก: ${file.name}`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                $("#modalSelectedFileNameDisplay").addClass("d-none").removeClass("d-flex").hide();
            }
        });

        $(document).off("click", "#btnRemoveModalExcelFile").on("click", "#btnRemoveModalExcelFile", function () {
            $("#modalExcelFileInput").val("");
            $("#modalSelectedFileNameDisplay").addClass("d-none").removeClass("d-flex").hide();
        });

        if (selectedCampaignCode) {
            await loadCampaignToForm(selectedCampaignCode);
        } else {
            setProductFormState(false);
        }
    } finally {
        stopLoading();
    }
});

$("#btnGotoETL").off("click").on("click", function () {
    if (!selectedCampaignGuid) return;
    var url = "http://172.16.17.73:8032/ImportExcel/LinkCRM?id=" + selectedCampaignGuid;
    window.location.href = url;
});

$("#btnSearch").off("click").on("click", function () {
    SearchCampaign();
});

$("#campaignSearchInput").off("keydown").on("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        SearchCampaign();
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const btnImport = document.getElementById('btnImportExcel');
    const fileInput = document.getElementById('excelFileInput');
    const fileDisplay = document.getElementById('selectedFileNameDisplay');
    const fileNameText = document.getElementById('selectedFileNameText');
    const btnRemove = document.getElementById('btnRemoveExcelFile');

    // นามสกุลไฟล์ที่อนุญาต
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'];
    btnImport.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (file) {
            const fileName = file.name;
            // หานามสกุลไฟล์ (แปลงเป็นพิมพ์เล็กเพื่อเทียบ)
            const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

            // ตรวจสอบว่านามสกุลไฟล์อยู่ใน list ที่อนุญาตหรือไม่
            if (!allowedExtensions.includes(fileExtension)) {

                Swal.fire({
                    title: "ประเภทไฟล์ไม่ถูกต้อง",
                    text: `กรุณาอัปโหลดเฉพาะไฟล์: ${allowedExtensions.join(', ')}`,
                    icon: "error",
                    timer: 2000,
                    showConfirmButton: true
                });
                removeFile(); // ลบค่าที่เลือกออก
                return;
            }

            // ถ้าไฟล์ถูกต้อง ให้แสดงชื่อไฟล์
            fileNameText.textContent = fileName;
            
            // สลับคลาสเพื่อแสดงกล่องชื่อไฟล์
            fileDisplay.classList.remove('d-none');
            fileDisplay.classList.add('d-flex');
        }
    });
    btnRemove.addEventListener('click', removeFile);

    // ฟังก์ชันเคลียร์ไฟล์
    function removeFile() {
        fileInput.value = '';
        fileNameText.textContent = '';
        fileDisplay.classList.remove('d-flex');
        fileDisplay.classList.add('d-none');
    }
});
