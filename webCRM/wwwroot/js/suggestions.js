$(document).ready(function () {
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

    loadDepartmentOptions();

    var table = $('#suggestionsTable').DataTable({
        order: [[4, 'asc']],
        searching: true,
        dom: '<"d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 mb-3"l>t<"d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 mt-3"i p>',
        language: {
            lengthMenu: "แสดง _MENU_ รายการ",
            info: "แสดง _START_ ถึง _END_ จาก _TOTAL_ รายการ",
            infoEmpty: "แสดง 0 ถึง 0 จาก 0 รายการ",
            infoFiltered: "(กรองข้อมูลจาก _MAX_ รายการทั้งหมด)",
            paginate: {
                first: "หน้าแรก",
                last: "หน้าสุดท้าย",
                next: "ถัดไป",
                previous: "ก่อนหน้า"
            }
        }
    });

    function updateSuggestionsTotalCount() {
        const info = table.page.info();
        $('#suggestionsTotalBadge').text('ทั้งหมด ' + info.recordsTotal + ' รายการ');
    }

    table.on('draw.dt init.dt', updateSuggestionsTotalCount);
    updateSuggestionsTotalCount();

    // ค้นหาเมื่อพิมพ์
    $('#customSearchInput').on('keyup input', function () {
        table.search(this.value).draw();
    });

    // กรองตามหัวข้อ
    $('#filterTopic').on('change', function () {
        var val = $.fn.dataTable.util.escapeRegex($(this).val());
        table.column(1).search(val ? val : '', true, false).draw();
    });

    // กรองตามสถานะ
    $('#filterStatus').on('change', function () {
        var val = $.fn.dataTable.util.escapeRegex($(this).val());
        table.column(3).search(val ? val : '', true, false).draw();
    });

    // Event delegation สำหรับคลิกเลือกรายการในตาราง
    $('#suggestionsTable tbody').on('click', 'tr', function () {
        showDetails(this);
    });

    // เลือกรายการแรกโดยอัตโนมัติหากมีข้อมูล
    const firstRow = $('#suggestionsTable tbody tr').first();
    if (firstRow.length && firstRow.find('td').length > 1) {
        showDetails(firstRow[0]);
    }
});

async function loadDepartmentOptions() {
    try {
        const response = await fetch('/Home/GetMaster');
        if (!response.ok) return;
        const data = await response.json();

        const currentCompany = (typeof userCompany !== 'undefined' ? userCompany : (window.CURRENT_COMPANY || "")).trim().toUpperCase();

        const deptSelect = document.getElementById('post-department');
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="" selected>เลือกแผนก</option>';

            if (data && Array.isArray(data.department)) {
                const filteredDepartments = data.department.filter(item => {
                    if (!currentCompany) return true;
                    return item.company && item.company.trim().toUpperCase() === currentCompany;
                });

                const uniqueSections = [];
                filteredDepartments.forEach(item => {
                    if (item.section && item.section.trim() !== '') {
                        const sectionName = item.section.trim();
                        if (!uniqueSections.includes(sectionName)) {
                            uniqueSections.push(sectionName);
                        }
                    }
                });

                uniqueSections.forEach(section => {
                    const option = document.createElement('option');
                    option.value = section;
                    option.textContent = section;
                    deptSelect.appendChild(option);
                });
            }
        }

        const sendToSelect = document.getElementById('post-send-to');
        const ccDropdownMenu = document.getElementById('cc-dropdown-menu');

        if (data && Array.isArray(data.email)) {
            const filteredEmails = data.email.filter(item => {
                if (!currentCompany) return true;
                return item.company && item.company.trim().toUpperCase() === currentCompany;
            });

            const uniqueEmails = [];
            filteredEmails.forEach(item => {
                if (item.groupEmail && item.groupEmail.trim() !== '') {
                    const emailVal = item.groupEmail.trim();
                    if (!uniqueEmails.includes(emailVal)) {
                        uniqueEmails.push(emailVal);
                    }
                }
            });

            if (sendToSelect) {
                sendToSelect.innerHTML = '<option value="" selected>เลือกผู้รับผิดชอบ</option>';
                uniqueEmails.forEach(emailVal => {
                    const option = document.createElement('option');
                    option.value = emailVal;
                    option.textContent = emailVal;
                    sendToSelect.appendChild(option);
                });
            }

            if (ccDropdownMenu) {
                ccDropdownMenu.innerHTML = '';
                if (uniqueEmails.length === 0) {
                    ccDropdownMenu.innerHTML = '<li><span class="dropdown-item text-muted small">ไม่มีข้อมูล</span></li>';
                } else {
                    uniqueEmails.forEach(emailVal => {
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <a class="dropdown-item d-flex align-items-center justify-content-between rounded py-2 cc-option-item" href="javascript:void(0)" data-value="${emailVal}">
                                <span class="small">${emailVal}</span>
                                <i class="bi bi-check2 text-primary d-none cc-check-icon fs-6"></i>
                            </a>
                        `;
                        ccDropdownMenu.appendChild(li);
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error loading master options:", error);
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined || str === '') return '-';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function parseDateForSort(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return 0;
    if (typeof dateStr === 'string' && (dateStr.toLowerCase().includes('invalid') || dateStr.startsWith('0001-01-01'))) return 0;
    
    let ts = Date.parse(dateStr);
    if (!isNaN(ts)) {
        let d = new Date(ts);
        if (d.getFullYear() <= 1900) return 0;
        return ts;
    }
    
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const parts = dateStr.trim().split(' ');
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            let hours = 0, minutes = 0, seconds = 0;
            if (parts[1]) {
                const timeParts = parts[1].split(':');
                hours = parseInt(timeParts[0] || 0, 10);
                minutes = parseInt(timeParts[1] || 0, 10);
                seconds = parseInt(timeParts[2] || 0, 10);
            }
            const dt = new Date(year, month, day, hours, minutes, seconds);
            if (!isNaN(dt.getTime()) && dt.getFullYear() > 1900) {
                return dt.getTime();
            }
        }
    }
    return 0;
}

function formatDateDisplay(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '-';
    if (typeof dateStr === 'string' && (dateStr.toLowerCase().includes('invalid') || dateStr.startsWith('0001-01-01'))) return '-';
    
    if (typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}/.test(dateStr.trim())) {
        return dateStr.trim();
    }
    
    let ts = parseDateForSort(dateStr);
    if (ts > 0) {
        const d = new Date(ts);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return '-';
}

function showDetails(row) {
    const $row = $(row);
    if (!$row.length) return;

    // เพิ่ม class ไฮไลท์แถวที่เลือก
    $('#suggestionsTable tbody tr').removeClass('table-active');
    $row.addClass('table-active');

    const getVal = (attr) => {
        const val = $row.attr('data-' + attr);
        return (val !== undefined && val !== null && val.trim() !== '') ? val : '-';
    };

    $('#detail-nameprovider').text(getVal('nameprovider'));
    $('#detail-phone').text(getVal('phone'));
    $('#detail-contact-back').text(getVal('contact'));
    $('#detail-email').text(getVal('email'));
    $('#detail-line').text(getVal('line'));
    $('#detail-idno').text(getVal('idno'));
    $('#detail-status').text(getVal('status').toLowerCase());
    $('#detail-address').text(getVal('address'));
    $('#detail-date').text(getVal('date'));
    $('#detail-suggestion').text(getVal('suggestion'));

    const replyVal = getVal('reply');
    $('#reply-input').val(replyVal !== '-' ? replyVal : '');

    $('#detail-guid').text(getVal('guid'));
    $('#detail-updBy').text(getVal('updby'));
    $('#detail-sendTo').text(getVal('sendto'));

    // Render Reply History Table
    let detailsData = $row.data('details');
    if (typeof detailsData === 'string') {
        try {
            detailsData = JSON.parse(detailsData);
        } catch (e) {
            detailsData = [];
        }
    }
    if (!Array.isArray(detailsData)) {
        detailsData = [];
    }

    if (detailsData.length === 0 && replyVal && replyVal !== '-') {
        const mainUpdBy = getVal('updby') !== '-' ? getVal('updby') : getVal('recordedby');
        const mainDate = getVal('date');
        detailsData.push({
            reply: replyVal,
            updByName: mainUpdBy,
            updBy: mainUpdBy,
            upDate: mainDate
        });
    }

    const $tbody = $('#detail-reply-list');
    $tbody.empty();

    if (detailsData.length > 0) {
        // เรียงลำดับจากล่าสุดขึ้นก่อน
        detailsData.sort((a, b) => {
            const timeA = parseDateForSort(a.upDate || a.UpDate);
            const timeB = parseDateForSort(b.upDate || b.UpDate);
            return timeB - timeA;
        });

        detailsData.forEach(item => {
            const replyMsg = item.reply || item.Reply || '-';
            const updByPerson = item.updByName || item.UpdByName || item.updBy || item.UpdBy || '-';
            const rawDate = item.upDate || item.UpDate || '-';
            const formattedDate = formatDateDisplay(rawDate);

            const $tr = $('<tr>');
            $tr.html(`
                <td class="text-center py-2 text-dark font-monospace" style="font-size: 0.85rem; white-space: nowrap;">${escapeHtml(formattedDate)}</td>
                <td class="py-2 text-dark text-break" style="word-break: break-word; overflow-wrap: break-word;">${escapeHtml(updByPerson)}</td>
                <td class="py-2 text-dark text-break" style="word-break: break-word; overflow-wrap: break-word;">${escapeHtml(replyMsg)}</td>
            `);
            $tbody.append($tr);
        });
    } else {
        $tbody.html(`
            <tr>
                <td colspan="3" class="text-center text-muted py-3">ไม่มีข้อมูลการตอบกลับ</td>
            </tr>
        `);
    }

    $('#replyHistoryTotalBadge').text('ทั้งหมด ' + detailsData.length + ' รายการ');
}

async function UpdateSuggestion() {
    var guid = $("#detail-guid").text();
    var reply = $("#reply-input").val();
    var updBy = typeof currentUserEmail !== 'undefined' ? currentUserEmail : '';

    if (!guid || guid.trim() === "-" || guid.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกรายการที่ต้องการบันทึกข้อความตอบกลับ');
        return;
    }

    try {
        var result = await AlertComponent.confirmSave('ต้องการบันทึกข้อความตอบกลับหรือไม่');

        if (result.isConfirmed) {
            showLoading('กำลังบันทึกข้อมูล', 'ระบบกำลังบันทึกข้อความตอบกลับของคุณ กรุณารอสักครู่...');
            var response = await fetch(`/Suggestions/UpdateSuggestion?guid=${encodeURIComponent(guid)}&reply=${encodeURIComponent(reply)}&updBy=${encodeURIComponent(updBy)}`);
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            var msg = await response.json();
            if (msg && msg.status === "error") {
                throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            }
            hideLoading();
            $("#reply-input").val("");
            showAlert('success', 'บันทึกสำเร็จ', 'บันทึกข้อความตอบกลับเรียบร้อยแล้ว', function () {
                window.location.reload();
            });
        }

    } catch (error) {
        console.error(error);
        hideLoading();
        showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }
}

async function AddSuggestion() {
    var selectedCc = [];
    $('#post-cc option:selected').each(function () {
        selectedCc.push($(this).val());
    });

    let timeVal = $("#post-contact-time").val();
    if (timeVal) {
        if (timeVal.split(':').length === 2) {
            timeVal += ":00";
        }
    } else {
        timeVal = null;
    }

    var requestData = {
        suggesCde: $("#post-title").val()?.toString(),
        nameProvider: $("#post-personal-name").val()?.toString(),
        emailProvider: $("#post-personal-email").val()?.toString(),
        addressProvider: $("#post-address").val()?.toString(),
        phoneProvider: $("#post-phone").val()?.toString(),
        lineProvider: $("#post-line-id").val()?.toString(),
        department: $("#post-department").val() ? $("#post-department").val().toString() : null,
        sendTo: $("#post-send-to").val() ? $("#post-send-to").val().toString() : null,
        dateSugges: $("#post-contact-date").val()?.toString(),
        timeSugges: timeVal,
        chanelProvider: $("#post-additional-contact").val()?.toString(),
        suggestion: $("#post-reply").val()?.toString(),
        cc: selectedCc.length > 0 ? selectedCc.join(",") : null
    };

    if (!requestData.suggesCde || requestData.suggesCde === "เลือกหัวข้อ" || requestData.suggesCde.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกหัวข้อ');
        return;
    }
    if (!requestData.nameProvider || requestData.nameProvider.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณากรอกชื่อ-นามสกุล');
        return;
    }
    if (!requestData.sendTo || requestData.sendTo.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกผู้รับผิดชอบ');
        return;
    }
    if (!requestData.suggestion || requestData.suggestion.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณากรอกบันทึกข้อเสนอแนะ / ร้องเรียน');
        return;
    }
    if (!requestData.dateSugges || requestData.dateSugges.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกวันที่และเวลาให้ติดต่อกลับ');
        return;
    }

    try {
        var result = await AlertComponent.confirmSave('ต้องการบันทึกข้อเสนอแนะ / ร้องเรียนหรือไม่');
        if (result.isConfirmed) {

            showLoading('กำลังบันทึกข้อมูล', 'ระบบกำลังบันทึกข้อมูลข้อเสนอแนะ / ร้องเรียนของคุณ กรุณารอสักครู่...');

            var response = await fetch(`/Suggestions/PostSuggestion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }

            var msg = await response.json();
            if (msg && msg.status === "error") {
                throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            }

            hideLoading();

            // Clear fields
            $("#post-title").val("");
            $("#post-personal-name").val("");
            $("#post-personal-email").val("");
            $("#post-address").val("");
            $("#post-phone").val("");
            $("#post-line-id").val("");
            $("#post-department").val("");
            $("#post-send-to").val("");
            $("#post-contact-date").val("");
            $("#post-contact-time").val("00:00");
            $("#post-additional-contact").val("");
            $("#post-reply").val("");
            $('.cc-option-item').removeClass('active').find('.cc-check-icon').addClass('d-none');
            $('#post-cc').empty();
            $('#cc-tags-container .badge').remove();
            $('#cc-placeholder').show();

            // Close Modal if using bootstrap
            var modalEl = document.getElementById('complaintModal');
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) {
                modal.hide();
            }

            showAlert('success', 'บันทึกสำเร็จ', 'บันทึกข้อเสนอแนะ / ร้องเรียนเรียบร้อยแล้ว', function () {
                window.location.reload();
            });

        }

    } catch (error) {
        console.error(error);
        hideLoading();
        showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }
}

function updateCcSelection() {
    var selected = [];
    $('#post-cc').empty();

    $('.cc-option-item.active').each(function () {
        var val = $(this).attr('data-value');
        if (val) {
            selected.push(val);
            $('#post-cc').append('<option value="' + val + '" selected>' + val + '</option>');
        }
    });

    var displayContainer = $('#cc-tags-container');
    displayContainer.find('.badge').remove();

    if (selected.length === 0) {
        $('#cc-placeholder').show();
    } else {
        $('#cc-placeholder').hide();
        selected.forEach(function (item) {
            var badge = $('<span class="badge bg-primary text-white d-inline-flex align-items-center gap-1 py-1 px-2 rounded-2" style="font-weight: 500; font-size: 0.82rem;"></span>').text(item);
            var closeBtn = $('<i class="bi bi-x ms-1" style="cursor: pointer; font-size: 1em;"></i>');
            closeBtn.on('click', function (e) {
                e.stopPropagation();
                var $opt = $('.cc-option-item[data-value="' + item + '"]');
                $opt.removeClass('active');
                $opt.find('.cc-check-icon').addClass('d-none');
                updateCcSelection();
            });
            badge.append(closeBtn);
            displayContainer.append(badge);
        });
    }
}

$(document).on('click', '.cc-option-item', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).toggleClass('active');
    if ($(this).hasClass('active')) {
        $(this).find('.cc-check-icon').removeClass('d-none');
    } else {
        $(this).find('.cc-check-icon').addClass('d-none');
    }
    updateCcSelection();
});

async function PutSuggestionStatusUpd (){
    var guid = $("#detail-guid").text();
    showLoading('กำลังบันทึกข้อมูล', 'ระบบกำลังบันทึกข้อมูล กรุณารอสักครู่...');
    var response = await fetch(`/Suggestions/PutSuggestionStatusUpd?guid=${encodeURIComponent(guid)}`);
    var msg = await response.json();
    window.location.reload();
    hideLoading();
    if (msg && msg.status === "error") {
        throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
    }
}

async function ForwardSuggestion() {
    var guid = $("#detail-guid").text();
    if (!guid || guid.trim() === "-" || guid.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกรายการที่ต้องการส่งต่อ');
        return;
    }

    var currentSendTo = $("#detail-sendTo").text().trim();
    var optionsHtml = $('#post-send-to').html();

    var selectHtml = `
        <div class="text-start mt-2">
            <label class="form-label fw-medium small mb-1">เลือกผู้รับผิดชอบใหม่ (Send To) <span class="text-danger">*</span></label>
            <select id="swal-send-to" class="form-select rounded-3">
                ${optionsHtml}
            </select>
        </div>
    `;

    var result = await Swal.fire({
        title: 'ส่งต่อข้อเสนอแนะ / ร้องเรียน',
        html: selectHtml,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ยืนยันส่งต่อ',
        cancelButtonText: 'ยกเลิก',
        customClass: {
            confirmButton: 'text-dark fw-bold'
        },
        didOpen: () => {
            if (currentSendTo && currentSendTo !== "-") {
                const swalSelect = document.getElementById('swal-send-to');
                if (swalSelect) {
                    swalSelect.value = currentSendTo;
                }
            }
        },
        preConfirm: () => {
            const sendToVal = document.getElementById('swal-send-to').value;
            if (!sendToVal || sendToVal.trim() === "" || sendToVal === "เลือกผู้รับผิดชอบ") {
                Swal.showValidationMessage('กรุณาเลือกผู้รับผิดชอบ');
                return false;
            }
            return sendToVal;
        }
    });

    if (result.isConfirmed && result.value) {
        try {
            showLoading('กำลังบันทึกข้อมูล', 'ระบบกำลังส่งต่อข้อมูล กรุณารอสักครู่...');
            var response = await fetch(`/Suggestions/UpdateSuggestionStatus?guid=${encodeURIComponent(guid)}&statusTask=Forward&sendTo=${encodeURIComponent(result.value)}`);
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            var msg = await response.json();
            hideLoading();
            if (msg && msg.status === "error") {
                throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            }
            showAlert('success', 'สำเร็จ', 'ส่งต่อเรียบร้อยแล้ว', function () {
                window.location.reload();
            });
        } catch (error) {
            console.error(error);
            hideLoading();
            showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการส่งต่อ: ' + error.message);
        }
    }
}