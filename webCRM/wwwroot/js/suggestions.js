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
        order: [],
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
    $('#detail-status').text(getVal('status'));
    $('#detail-address').text(getVal('address'));
    $('#detail-date').text(getVal('date'));
    $('#detail-recorded-by').text(getVal('recordedby'));
    $('#detail-suggestion').text(getVal('suggestion'));
    $('#detail-reply').text(getVal('reply'));

    const replyVal = getVal('reply');
    $('#reply-input').val(replyVal !== '-' ? replyVal : '');

    $('#detail-guid').text(getVal('guid'));
    $('#detail-updBy').text(getVal('updby'));
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
