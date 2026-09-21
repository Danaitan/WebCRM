
let table;

// ใช้กฎสิทธิ์กลางร่วมกับหน้าการแจ้งเตือน เพื่อให้แก้เงื่อนไขเพียงจุดเดียว
const suggestionReplyAuthorization = window.SuggestionReplyAuthorization;

async function loadGroupEmailSet(forceReload = false) {
    return suggestionReplyAuthorization.loadGroupEmailSet(forceReload);
}

function isGroupSendTo(sendTo) {
    return suggestionReplyAuthorization.isGroupSendTo(sendTo);
}

async function evaluateReplyPermission(sendTo, replyDetails, status) {
    return suggestionReplyAuthorization.evaluate(sendTo, replyDetails, status);
}

async function getProfileByEmail(email) {
    try {
        const response = await fetch(`/Login/GetProfileByEmail?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in getProfileByEmail:", error);
    }
}

async function getProfileByCode (personalCode){
    try {
        const response = await fetch(`/Login/GetProfile?user=${personalCode}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in getProfileByCode:", error);
    }
}

async function PostNoti(PostNotiData){
    try {
        const payload = {
            header: PostNotiData.header,
            title: PostNotiData.title,
            message: PostNotiData.message,
            receiver: PostNotiData.receiver,
            sender: PostNotiData.sender,
            create_by: PostNotiData.create_by,
            end_date: PostNotiData.end_date,
            receiver_email: PostNotiData.receiver_email,
            ref_id: PostNotiData.ref_id
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

async function GetPersonalAndGroup() {
    try {
        const response = await fetch('/DashboardSuggestion/GetPersonalAndGroup');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in GetPersonalAndGroup:", error);
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

async function searchSuggestion(selectedGuidToPreserve = null, showLoadingSpinner = true) {
    if (!table) return;

    var topicVal = $('#filterTopic').val() || '';
    var statusVal = $('#filterStatus').val() || '';
    var keyword = $('#customSearchInput').val() || '';

    try {
        if (showLoadingSpinner) {
            startLoading('กำลังค้นหาข้อมูล...', 'กรุณารอสักครู่');
        }
        const isSeeAll = window.isEdit;
        const url = `/Suggestions/GetSuggestions?status=${encodeURIComponent(statusVal)}&header=${encodeURIComponent(topicVal)}&search=${encodeURIComponent(keyword)}&isSeeAll=${encodeURIComponent(isSeeAll)}`;
        const response = await fetch(url, { skipLoading: true });
        if (!response.ok) {
            throw new Error('HTTP error ' + response.status);
        }

        const data = await response.json();
        renderSuggestionsTable(data, selectedGuidToPreserve);

    } catch (error) {
        console.error("Error in searchSuggestion:", error);
    } finally {
        if (showLoadingSpinner) {
            stopLoading();
        }
    }
}

function escapeAttr(str) {
    if (str === null || str === undefined || str === '') return '-';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderSuggestionsTable(data, selectedGuidToPreserve = null) {
    if (!table) return;

    table.clear();

    // เรียงข้อมูลตาม "วันที่สร้าง" (createdDate) จากใหม่ไปเก่าก่อนเพิ่มลงตาราง
    if (Array.isArray(data)) {
        data.sort((a, b) => {
            const aCreated = getValidDateStr(a.createdDate || a.CreatedDate);
            const bCreated = getValidDateStr(b.createdDate || b.CreatedDate);
            return parseDateForSort(bCreated) - parseDateForSort(aCreated);
        });
    }

    if (Array.isArray(data) && data.length > 0) {
        data.forEach(item => {
            let rawCreated = getValidDateStr(item.createdDate || item.CreatedDate);
            let displayCreatedDate = rawCreated;

            if (!displayCreatedDate) {
                let dDate = getValidDateStr(item.dateSugges || item.DateSugges);
                if (dDate) {
                    let tTime = item.timeSugges || item.TimeSugges;
                    displayCreatedDate = tTime ? `${String(dDate).split('T')[0]}T${String(tTime).includes('T') ? String(tTime).split('T')[1] : tTime}` : dDate;
                }
            }
            if (!displayCreatedDate) {
                displayCreatedDate = getValidDateStr(item.upDate || item.UpDate);
            }

            const createdDateStr = formatDateDisplay(displayCreatedDate);
            // เรียงตาม "วันที่สร้าง" เท่านั้น: ใช้ค่า createdDate จริงเป็นตัวจัดลำดับ
            // ถ้าไม่มีค่อย fallback ไปใช้ค่าที่แสดง (displayCreatedDate)
            const rawCreatedForSort = getValidDateStr(item.createdDate || item.CreatedDate) || displayCreatedDate;
            const createdDateOrder = parseDateForSort(rawCreatedForSort);

            const rawUpDate = getValidDateStr(item.upDate || item.UpDate);
            const upDateStr = formatDateDisplay(rawUpDate);

            let timeDiffText = '-';
            const createdDt = parseDateToLocalObject(displayCreatedDate);
            if (createdDt) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const createdDateOnly = new Date(createdDt.getFullYear(), createdDt.getMonth(), createdDt.getDate());
                const diffTime = today.getTime() - createdDateOnly.getTime();
                let days = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (days < 0) days = 0;
                timeDiffText = `${days} วัน`;
            }

            const phone = item.phoneProvider || item.PhoneProvider || '-';

            let contactDateStr = '-';
            if (item.dateSugges || item.DateSugges) {
                const rawContact = item.dateSugges || item.DateSugges;
                contactDateStr = formatDateDisplay(rawContact).split(' ')[0];
                if (item.timeSugges || item.TimeSugges) {
                    const timePart = item.timeSugges || item.TimeSugges;
                    const timeMatch = String(timePart).match(/\d{2}:\d{2}/);
                    if (timeMatch) contactDateStr += ' ' + timeMatch[0];
                }
            }

            const email = item.emailProvider || '-';
            const line = item.lineProvider || '-';
            const idno = item.idno || '-';
            const statusTask = item.statusTask || '-';
            const statusLower = statusTask.toLowerCase();
            const address = item.addressProvider || '-';
            const recordedBy = item.personalName || '-';
            const reply = item.reply || '-';
            const nameProvider = item.nameProvider || '-';
            const suggestion = item.suggestion || '-';
            const title = item.suggestion_title || '-';
            const guid = item.guid || '-';
            const updBy = item.updBy || '-';
            const creator = item.creater || '';
            const sendTo = item.sendTo || '-';
            const detailsJson = (item.detail) ? JSON.stringify(item.detail) : '[]';

            const $tr = $(`
                <tr style="cursor: pointer;">
                    <td class="text-center py-2" data-order="${createdDateOrder}"><div class="fw-medium text-dark">${escapeHtml(createdDateStr)}</div></td>
                    <td class="text-center py-2"><div class="fw-medium text-dark">${escapeHtml(title)}</div></td>
                    <td class="text-center py-2"><div class="fw-medium text-dark">${escapeHtml(nameProvider)}</div></td>
                    <td class="text-center py-2"><div class="fw-medium text-dark">${escapeHtml(statusLower)}</div></td>
                    <td class="text-center py-2"><div class="fw-medium text-dark">${escapeHtml(upDateStr)}</div></td>
                    <td class="text-center py-2"><div class="fw-medium text-dark">${escapeHtml(timeDiffText)}</div></td>
                </tr>
            `);

            $tr.attr({
                'data-phone': phone,
                'data-contact': contactDateStr,
                'data-email': email,
                'data-line': line,
                'data-idno': idno,
                'data-status': statusLower,
                'data-address': address,
                'data-date': createdDateStr,
                'data-recordedby': recordedBy,
                'data-reply': reply,
                'data-nameprovider': nameProvider,
                'data-suggestion': suggestion,
                'data-guid': guid,
                'data-updby': updBy,
                'data-creater': creator,
                'data-sendto': sendTo,
                'data-details': detailsJson
            });

            table.row.add($tr[0]);
        });
    }

    table.draw();

    let targetRow = null;
    if (selectedGuidToPreserve) {
        $('#suggestionsTable tbody tr').each(function () {
            if ($(this).attr('data-guid') === selectedGuidToPreserve) {
                targetRow = this;
                return false;
            }
        });
    }

    if (!targetRow) {
        const firstRow = $('#suggestionsTable tbody tr').first();
        if (firstRow.length && firstRow.find('td').length > 1) {
            targetRow = firstRow[0];
        }
    }

    if (targetRow) {
        showDetailsSafely(targetRow);
    } else {
        clearDetails();
    }
}

// function isCreator(updBy) {
//     const personalId = window.CURRENT_PERSONAL_ID.toString().trim();
//     if (!personalId) return false;
//     if (!updBy || updBy === '-' || updBy === 'null' || updBy === 'undefined') return false;
//     return String(updBy).trim().toLowerCase() === personalId.toLowerCase();
// }

function canShowReplyBox(status) {
    return suggestionReplyAuthorization.canReplyToStatus(status);
}

function canShowForwardBtn(status) {
    if (!status) return true;
    const lowerStatus = String(status).toLowerCase().trim();
    if (lowerStatus === 'close') {
        return false;
    }
    return true;
}

function canEnableCloseBtn(status) {
    if (!status) return true;
    const lowerStatus = String(status).toLowerCase().trim();
    if (lowerStatus === 'close') {
        return false;
    }
    return true;
}

function updateActionButtonsState(status, updBy = '') {
    const lowerStatus = String(status || '').toLowerCase().trim();

    // กล่องบันทึกข้อมูล
    if (canShowReplyBox(lowerStatus)) {
        $('#replyBoxSection').show();
    } else {
        $('#replyBoxSection').hide();
    }

    // ปุ่มส่งต่อ
    if (lowerStatus === 'close') {
        $('#forwardBtn').prop('disabled', true);
    } else {
        $('#forwardBtn').prop('disabled', false);
    }

    // ปุ่มปิดงาน
    if (lowerStatus === 'close') {
        $('#closeBtn').prop('disabled', true);
    } else {
        $('#closeBtn').prop('disabled', false);
    }
}

// function updateActionButtonsState(status, updBy = '') {
//     const userIsCreator = isCreator(updBy);

//     // กล่องบันทึกข้อมูล
//     if (canShowReplyBox(status)) {
//         $('#replyBoxSection').show();
//     } else {
//         $('#replyBoxSection').hide();
//     }

//     // ถ้าไม่ใช่คนสร้าง จะซ่อนปุ่มส่งต่อและปิดงาน
//     // if (!userIsCreator) {
//     //     $('#forwardBtnContainer').hide();
//     //     $('#closeBtnContainer').hide();
//     // } else {
//     //     // ปุ่มส่งต่อ
//     //     if (canShowForwardBtn(status)) {
//     //         $('#forwardBtnContainer').show();
//     //     } else {
//     //         $('#forwardBtnContainer').hide();
//     //     }

//     //     // ปุ่มปิดงาน
//     //     $('#closeBtnContainer').show();
//     //     if (canEnableCloseBtn(status)) {
//     //         $('#closeBtn').prop('disabled', false);
//     //     } else {
//     //         $('#closeBtn').prop('disabled', true);
//     //     }
//     // }
// }

function clearDetails() {
    $('#detail-nameprovider').text('-');
    $('#detail-phone').text('-');
    $('#detail-contact-back').text('-');
    $('#detail-email').text('-');
    $('#detail-line').text('-');
    $('#detail-idno').text('-');
    $('#detail-status').text('-');
    $('#detail-address').text('-');
    $('#detail-date').text('-');
    $('#detail-suggestion').text('-');
    $('#reply-input').val('');
    $('#detail-guid').text('');
    $('#detail-updBy').text('');
    $('#detail-sendTo').text('');
    $('#detail-reply-list').html('<tr><td colspan="3" class="text-center text-muted py-3">ไม่มีข้อมูลการตอบกลับ</td></tr>');
    $('#replyHistoryTotalBadge').text('ทั้งหมด 0 รายการ');

    $('#replyPermissionDenied').remove();
    window.currentReplyPermission = null;

    updateActionButtonsState('');
}

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
    loadSuggestionHeaderOptions();
    loadSuggestionStatusOptions();

    table = $('#suggestionsTable').DataTable({
        // ปิดการเรียงของ DataTables ทั้งหมด แล้วใช้ลำดับจาก array ที่เราเรียงเอง
        // (เรียงตาม "วันที่สร้าง" ใหม่ไปเก่า ใน renderSuggestionsTable)
        ordering: false,
        searching: true,
        dom: '<"d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 mb-3"l>t<"d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 mt-3"i p>',
        language: {
            emptyTable: "ไม่พบรายการ",
            zeroRecords: "ไม่พบรายการ",
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

    // ค้นหาเมื่อพิมพ์ Enter
    $('#customSearchInput').on('keyup', function (e) {
        if (e.key === 'Enter') {
            searchSuggestion();
        }
    });

    // กรองตามหัวข้อ
    $('#filterTopic').on('change', function () {
        searchSuggestion();
    });

    // กรองตามสถานะ
    $('#filterStatus').on('change', function () {
        searchSuggestion();
    });

    // ปุ่มค้นหา
    $('#btnSearch').on('click', function () {
        searchSuggestion();
    });

    // Event delegation สำหรับคลิกเลือกรายการในตาราง
    $('#suggestionsTable tbody').on('click', 'tr', function () {
        showDetailsSafely(this);
    });

    // เริ่มต้นแสดงเวลาแบบ Real-time ในช่องตอบกลับ
    startReplyTimeClock();

    // โหลดชุดอีเมลกลุ่มให้เสร็จก่อน แล้วค่อยโหลดข้อมูลเริ่มต้น
    // เพื่อให้การตัดสินสิทธิ์การตอบกลับถูกต้องตั้งแต่แสดงผลครั้งแรก
    loadGroupEmailSet()
        .catch(error => console.error("Error in loadGroupEmailSet:", error))
        .finally(() => {
            searchSuggestion();
        });
});

async function loadDepartmentOptions() {
    try {
        const [masterRes, personalData] = await Promise.all([
            fetch('/Home/GetMaster').then(res => res.ok ? res.json() : null).catch(() => null),
            GetPersonalAndGroup().catch(() => null)
        ]);
        const data = masterRes;
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

        // อีเมลสำหรับ Send To ตอนสร้าง + CC (รวมทั้ง groupEmail จาก GetMaster และ personal)
        const uniqueEmails = [];
        // อีเมลสำหรับ "ส่งต่อ" (เฉพาะข้อมูลอีเมลของ personalData.personal เท่านั้น)
        const personalEmails = [];

        if (data && Array.isArray(data.email)) {
            const filteredEmails = data.email.filter(item => {
                if (!currentCompany) return true;
                return item.company && item.company.trim().toUpperCase() === currentCompany;
            });

            filteredEmails.forEach(item => {
                if (item.groupEmail && item.groupEmail.trim() !== '') {
                    const emailVal = item.groupEmail.trim();
                    if (!uniqueEmails.includes(emailVal)) {
                        uniqueEmails.push(emailVal);
                    }
                }
            });
        }

        if (personalData && Array.isArray(personalData.personal)) {
            personalData.personal.forEach(item => {
                const emailVal = (item.e_mail || '').trim();
                if (emailVal !== '') {
                    if (!uniqueEmails.includes(emailVal)) {
                        uniqueEmails.push(emailVal);
                    }
                    if (!personalEmails.includes(emailVal)) {
                        personalEmails.push(emailVal);
                    }
                }
            });
        }

        // เก็บอีเมลเฉพาะบุคคลไว้ใช้ตอน "ส่งต่อ" (ForwardSuggestion)
        window.forwardSendToEmails = personalEmails;

        if (sendToSelect) {
            sendToSelect.innerHTML = '<option value="" selected>เลือกผู้รับผิดชอบ</option>';
            uniqueEmails.forEach(emailVal => {
                const option = document.createElement('option');
                option.value = emailVal;
                option.textContent = emailVal;
                sendToSelect.appendChild(option);
            });

            if (typeof $.fn !== 'undefined' && $.fn.select2) {
                $(sendToSelect).select2({
                    theme: 'bootstrap-5',
                    dropdownParent: $('#complaintModal'),
                    placeholder: 'เลือกผู้รับผิดชอบ',
                    allowClear: true,
                    width: '100%'
                });
            }
        }

        if (ccDropdownMenu) {
            ccDropdownMenu.innerHTML = '';
            if (uniqueEmails.length === 0) {
                ccDropdownMenu.innerHTML = '<li><span class="dropdown-item text-muted small">ไม่มีข้อมูล</span></li>';
            } else {
                const searchLi = document.createElement('li');
                searchLi.className = 'p-1 sticky-top bg-white border-bottom mb-1';
                searchLi.id = 'cc-search-item';
                searchLi.innerHTML = `
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
                        <input type="text" id="cc-search-input" class="form-control border-start-0" placeholder="ค้นหา CC..." autocomplete="off">
                    </div>
                `;
                ccDropdownMenu.appendChild(searchLi);

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
    } catch (error) {
        console.error("Error loading master options:", error);
    }
}

async function loadSuggestionHeaderOptions() {
    try {
        const response = await fetch('/Suggestions/GetSuggestionHeader');
        if (!response.ok) return;
        const data = await response.json();

        if (Array.isArray(data)) {
            const postTitleSelect = document.getElementById('post-title');
            const filterTopicSelect = document.getElementById('filterTopic');

            if (postTitleSelect) {
                postTitleSelect.innerHTML = '<option value="" selected>เลือกหัวข้อ</option>';
            }
            if (filterTopicSelect) {
                filterTopicSelect.innerHTML = '<option value="">หัวข้อ (ทั้งหมด)</option>';
            }
            data.forEach(item => {
                const title = item.suggesDesc || '';
                if (!title) return;
                let code = item.suggesCde;

                if (postTitleSelect) {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = title;
                    postTitleSelect.appendChild(option);
                }

                if (filterTopicSelect) {
                    const option = document.createElement('option');
                    option.value = title;
                    option.textContent = title;
                    filterTopicSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error("Error loading suggestion header options:", error);
    }
}

window.suggestionStatusMap = {};

async function loadSuggestionStatusOptions() {
    try {
        const response = await fetch('/Suggestions/GetSuggestionStatus');
        if (!response.ok) return;
        const data = await response.json();

        if (Array.isArray(data)) {
            const filterStatusSelect = document.getElementById('filterStatus');
            const popoverEl = document.getElementById('statusInfoPopover');

            if (filterStatusSelect) {
                filterStatusSelect.innerHTML = '<option value="">สถานะ (ทั้งหมด)</option>';
            }

            let popoverContentHtml = `<div class="py-1" style="font-size: 0.875rem; line-height: 1.8;">`;

            data.forEach(item => {
                const nameEn = item.NameEn || item.nameEn || '';
                const nameTh = item.NameTh || item.nameTh || '';
                const isActive = item.IsActive !== undefined ? item.IsActive : true;

                if (!isActive || !nameEn) return;

                window.suggestionStatusMap[nameEn.toLowerCase()] = nameTh;

                if (filterStatusSelect) {
                    const option = document.createElement('option');
                    option.value = nameEn.toLowerCase();
                    option.textContent = nameTh ? `${nameEn} - ${nameTh}` : nameEn;
                    filterStatusSelect.appendChild(option);
                }

                popoverContentHtml += `<div><strong>${escapeHtml(nameEn)}</strong> ${nameTh ? '- ' + escapeHtml(nameTh) : ''}</div>`;
            });

            popoverContentHtml += `</div>`;

            if (popoverEl) {
                popoverEl.setAttribute('data-bs-content', popoverContentHtml);

                const existingPopover = bootstrap.Popover.getInstance(popoverEl);
                if (existingPopover) {
                    existingPopover.dispose();
                }
                bootstrap.Popover.getOrCreateInstance(popoverEl, {
                    container: 'body',
                    html: true,
                    sanitize: false,
                    trigger: 'click'
                });
            }
        }
    } catch (error) {
        console.error("Error loading suggestion status options:", error);
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

function getValidDateStr(dateVal) {
    if (!dateVal || dateVal === '-' || dateVal === 'null' || dateVal === 'undefined') return null;
    if (typeof dateVal === 'string' && (dateVal.toLowerCase().includes('invalid') || dateVal.startsWith('0001-01-01'))) return null;
    return dateVal;
}

function parseDateToLocalObject(dateStr) {
    const validStr = getValidDateStr(dateStr);
    if (!validStr) return null;

    if (typeof validStr === 'object' && validStr instanceof Date) {
        if (isNaN(validStr.getTime())) return null;
        let dt = new Date(validStr.getTime());
        if (dt.getFullYear() > 2400) {
            dt.setFullYear(dt.getFullYear() - 543);
        }
        return isNaN(dt.getTime()) ? null : dt;
    }

    const str = String(validStr).trim();

    const isoMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (isoMatch) {
        let year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        const hours = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
        const minutes = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
        const seconds = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;

        if (year > 2400) {
            year -= 543;
        }
        if (year <= 1900) return null;
        const dt = new Date(year, month, day, hours, minutes, seconds);
        return isNaN(dt.getTime()) ? null : dt;
    }

    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        let year = parseInt(dmyMatch[3], 10);
        const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
        const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
        const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

        if (year > 2400) {
            year -= 543;
        }
        if (year <= 1900) return null;
        const dt = new Date(year, month, day, hours, minutes, seconds);
        return isNaN(dt.getTime()) ? null : dt;
    }

    if (str.includes('/')) {
        const parts = str.split(' ');
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
            let day, month, year;
            if (dateParts[0].length === 4) {
                year = parseInt(dateParts[0], 10);
                month = parseInt(dateParts[1], 10) - 1;
                day = parseInt(dateParts[2], 10);
            } else {
                day = parseInt(dateParts[0], 10);
                month = parseInt(dateParts[1], 10) - 1;
                year = parseInt(dateParts[2], 10);
            }
            if (year > 2400) {
                year -= 543;
            }
            let hours = 0, minutes = 0, seconds = 0;
            if (parts[1]) {
                const timeParts = parts[1].split(':');
                hours = parseInt(timeParts[0] || 0, 10);
                minutes = parseInt(timeParts[1] || 0, 10);
                seconds = parseInt(timeParts[2] || 0, 10);
            }
            if (year <= 1900) return null;
            const dt = new Date(year, month, day, hours, minutes, seconds);
            return isNaN(dt.getTime()) ? null : dt;
        }
    }

    const ts = Date.parse(str);
    if (!isNaN(ts)) {
        const dt = new Date(ts);
        if (dt.getFullYear() > 2400) {
            dt.setFullYear(dt.getFullYear() - 543);
        }
        if (dt.getFullYear() <= 1900) return null;
        return dt;
    }

    return null;
}

function parseDateForSort(dateStr) {
    const dt = parseDateToLocalObject(dateStr);
    return dt ? dt.getTime() : 0;
}

function formatDateDisplay(dateStr) {
    const validStr = getValidDateStr(dateStr);
    if (!validStr) return '-';

    const dt = parseDateToLocalObject(validStr);
    if (dt) {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
    return '-';
}

function startReplyTimeClock() {
    function updateReplyTime() {
        const $el = $('#reply-current-time');
        if (!$el.length) return;
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const formatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        $el.text(formatted);
    }
    updateReplyTime();
    setInterval(updateReplyTime, 1000);
}

function showDetailsSafely(row) {
    showDetails(row).catch(error => {
        console.error("Error in showDetails:", error);
        window.currentReplyPermission = null;
        $('#replyBoxSection').hide();
        showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถตรวจสอบสิทธิ์การตอบกลับได้ กรุณาลองใหม่อีกครั้ง');
    });
}

async function showDetails(row) {
    const $row = $(row);
    if (!$row.length) return;
    $('#suggestionsTable tbody tr').removeClass('table-active');
    $row.addClass('table-active');
    window.currentReplyPermission = null;

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
    const rawStatus = getVal('status').toLowerCase();
    const thStatus = (window.suggestionStatusMap && window.suggestionStatusMap[rawStatus]) ? window.suggestionStatusMap[rawStatus] : '';
    const displayStatusText = (rawStatus !== '-' && thStatus) ? `${rawStatus} - ${thStatus}` : rawStatus;
    $('#detail-status').text(displayStatusText);
    $('#detail-address').text(getVal('address'));
    $('#detail-date').text(getVal('date'));
    $('#detail-suggestion').text(getVal('suggestion'));

    const replyVal = getVal('reply');
    $('#reply-input').val('');

    $('#detail-guid').text(getVal('guid'));
    const updBy = getVal('updby');
    $('#detail-updBy').text(updBy);
    $('#detail-sendTo').text(getVal('sendto'));

    // อัปเดตการแสดงผลและสถานะปุ่มตามสิทธิ์/สถานะเคส
    updateActionButtonsState(rawStatus, updBy);

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

    const isEmptyValue = value => {
        const val = String(value ?? '').trim().toLowerCase();

        return val === '' ||
            val === '-' ||
            val === 'null' ||
            val === 'undefined';
    };

    if (detailsData.length === 0 && !isEmptyValue(replyVal)) {
        const mainUpdBy = getVal('updby') !== '-'
            ? getVal('updby')
            : getVal('recordedby');

        const mainDate = getVal('date');
        if (
            !isEmptyValue(replyVal) ||
            !isEmptyValue(mainUpdBy) ||
            !isEmptyValue(mainDate)
        ) {
            detailsData.push({
                reply: replyVal,
                updByName: mainUpdBy,
                updBy: mainUpdBy,
                upDate: mainDate
            });
        }
    }

    const $tbody = $('#detail-reply-list');
    $tbody.empty();

    const validDetailsData = detailsData.filter(item => {
        return !isEmptyValue(item.reply);
    });

    if (validDetailsData.length > 0) {

        validDetailsData.sort((a, b) => {
            const timeA = parseDateForSort(a.upDate);
            const timeB = parseDateForSort(b.upDate);
            return timeB - timeA;
        });

        validDetailsData.forEach(item => {

            const replyMsg = isEmptyValue(item.reply)
                ? '-'
                : String(item.reply).trim();

            const updByPerson = isEmptyValue(item.updByName)
                ? '-'
                : String(item.updByName).trim();

            const rawDate = isEmptyValue(item.upDate)
                ? '-'
                : String(item.upDate).trim();

            const formattedDate = formatDateDisplay(rawDate);

            const $tr = $('<tr>');

            $tr.html(`
                <td class="text-center py-2 text-dark font-monospace"
                    style="font-size: 0.85rem; white-space: nowrap;">
                    ${escapeHtml(formattedDate)}
                </td>

                <td class="py-2 text-dark text-break"
                    style="word-break: break-word; overflow-wrap: break-word;">
                    ${escapeHtml(updByPerson)}
                </td>

                <td class="py-2 text-dark text-break"
                    style="word-break: break-word; overflow-wrap: break-word;">
                    ${escapeHtml(replyMsg)}
                </td>
            `);

            $tbody.append($tr);
        });

    } else {

        $tbody.html(`
            <tr>
                <td colspan="3" class="text-center text-muted py-3">
                    ไม่มีข้อมูลการตอบกลับ
                </td>
            </tr>
        `);
    }

    $('#replyHistoryTotalBadge').text(
        'ทั้งหมด ' + validDetailsData.length + ' รายการ'
    );

    // ===== ตัดสินสิทธิ์การตอบกลับตาม sendTo (กลุ่ม/บุคคล) =====
    const sendToVal = getVal('sendto');
    const permission = await evaluateReplyPermission(sendToVal, validDetailsData, rawStatus);

    // ผู้ใช้อาจเลือกรายการอื่นระหว่างรอตรวจ profile ของผู้ตอบคนแรก
    if (!document.body.contains(row) || !$(row).hasClass('table-active')) return;

    // เก็บผลไว้ให้ UpdateSuggestion ใช้ตอนกดบันทึก
    window.currentReplyPermission = permission;

    // แสดง/ซ่อนกล่องตอบกลับ:
    // - ต้องไม่ปิดงาน (canShowReplyBox) และมีสิทธิ์ตอบกลับ
    const $replyBox = $('#replyBoxSection');
    const $replyDeniedMsg = $('#replyPermissionDenied');

    if (canShowReplyBox(rawStatus) && permission.allowed) {
        $replyBox.show();
        $replyDeniedMsg.remove();
    } else {
        $replyBox.hide();

        // แสดงข้อความเหตุผลเมื่อถูกปิดกั้นเพราะสิทธิ์ (ไม่ใช่เพราะปิดงาน)
        if (canShowReplyBox(rawStatus) && !permission.allowed && permission.reason) {
            if ($replyDeniedMsg.length) {
                $replyDeniedMsg.text(permission.reason);
            } else {
                $replyBox.after(
                    `<div id="replyPermissionDenied" class="alert alert-warning py-2 px-3 mt-2" style="font-size: 0.9rem;">${permission.reason}</div>`
                );
            }
        } else {
            $replyDeniedMsg.remove();
        }
    }

}

async function UpdateSuggestion() {
    var guid = $("#detail-guid").text();
    var reply = $("#reply-input").val();

    if (!guid || guid.trim() === "-" || guid.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกรายการที่ต้องการบันทึกข้อความตอบกลับ');
        return;
    }

    if (!reply || reply.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณากรอกข้อความตอบกลับก่อนบันทึก');
        return;
    }

    var $activeRow = $('#suggestionsTable tbody tr.table-active');
    var currentStatus = $activeRow.length ? ($activeRow.attr('data-status') || '') : '';
    if (!canShowReplyBox(currentStatus)) {
        showAlert('warning', 'แจ้งเตือน', 'เคสนี้อยู่ในสถานะปิดงานแล้ว ไม่สามารถบันทึกข้อความตอบกลับได้');
        return;
    }

    // โหลด context ล่าสุดและใช้กฎชุดเดียวกับหน้าแจ้งเตือนก่อนบันทึกทุกครั้ง
    let permission;
    try {
        const context = await getSuggestionReplyContext(guid);
        const replyDetails = suggestionReplyAuthorization.getReplyDetails(context);
        permission = await evaluateReplyPermission(
            context.sendTo,
            replyDetails,
            context.statusTask
        );
    } catch (error) {
        console.error("Error checking reply permission:", error);
        showAlert('error', 'เกิดข้อผิดพลาด', error.message || 'ไม่สามารถตรวจสอบสิทธิ์การตอบกลับได้ กรุณาลองใหม่อีกครั้ง');
        return;
    }

    // ป้องกันการบันทึกผิดเคส หากผู้ใช้เปลี่ยนรายการระหว่างรอตรวจสอบสิทธิ์
    if (!$activeRow.hasClass('table-active') || $("#detail-guid").text() !== guid) {
        showAlert('warning', 'แจ้งเตือน', 'รายการที่เลือกมีการเปลี่ยนแปลง กรุณาตรวจสอบและบันทึกอีกครั้ง');
        return;
    }

    if (!permission.allowed) {
        showAlert('warning', 'แจ้งเตือน', permission.reason || 'คุณไม่มีสิทธิ์ตอบกลับเคสนี้');
        return;
    }

    try {
        startLoading('กำลังบันทึกข้อมูล', 'ระบบกำลังบันทึกข้อความตอบกลับของคุณ กรุณารอสักครู่...');
        var response = await fetch(`/Suggestions/UpdateSuggestion?guid=${encodeURIComponent(guid)}&reply=${encodeURIComponent(reply)}`, {
            method: 'POST',
            skipLoading: true
        });
        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }
        var msg = await response.json();
        if (msg && msg.status === "error") {
            throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
        }

            try {

                const $activeRow = $('#suggestionsTable tbody tr.table-active');
                const creator = $activeRow.length
                    ? ($activeRow.attr('data-creater') || '')
                    : '';
                const profile = await getProfileByCode(creator);

                const topicTitle = $activeRow.length > 0 ? $activeRow.find('td:nth-child(2)').text().trim() : '';
                const fullNameTh = userFullNameTh || '';
                const homeUrl = `${webDomain}/Login?returnUrl=${encodeURIComponent('/Suggestions')}`;
                const emailContent =
                    `เรียน ${profile.thname}<br><br>` +
                    `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${fullNameTh} ` +
                    `ได้ทำการตอบกลับข้อเสนอแนะ/ร้องเรียนหัวข้อ ${topicTitle} ` +
                    `โดยมีเนื้อหาดังนี้ ${reply}<br><br>` +
                    ` ` +
                    `<a href="${homeUrl}" target="_blank">คลิกที่นี่เพื่อเข้าสู่ระบบCRM</a>` +
                    `<br><br>` +
                    `ขอขอบคุณ<br>` +
                    `${fullNameTh}`;

                    await sendEmail(
                    profile.e_mail,
                    null,
                    "CRM : การตอบกลับข้อเสนอแนะ/ร้องเรียน เรื่อง " + topicTitle,
                    emailContent
                );
                const endDate = new Date();
                endDate.setFullYear(endDate.getFullYear() + 10);

                const senderId = typeof userId !== 'undefined' ? userId : '';
                const notiContent = `เรียน ${profile.thname},<br><br>` +
                    `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${fullNameTh} ` +
                    `ได้ทำการตอบกลับข้อเสนอแนะ/ร้องเรียนหัวข้อ ${topicTitle} ` +
                    `โดยมีเนื้อหาดังนี้ ${reply}<br><br>` +
                    `ขอขอบคุณ<br>` +
                    `${fullNameTh}`;

                await PostNoti({
                    header: "ข้อเสนอแนะ/ร้องเรียน",
                    title: "เรื่อง : " + topicTitle,
                    message: notiContent,
                    receiver_email: profile.e_mail,
                    receiver: profile.personnel_code,
                    sender: senderId,
                    create_by: senderId,
                    end_date: endDate,
                    ref_id: guid,
                });

            } catch (emailErr) {
                console.error("เกิดข้อผิดพลาดในการส่งอีเมล:", emailErr);
            }

        // โหลดข้อมูลล่าสุดก่อนปิด loading เพื่อให้หมุนรอบเดียวและข้อมูลอัปเดตเรียบร้อยก่อนแสดง alert
        await searchSuggestion(guid, false);

        $("#reply-input").val("");
        stopLoading(true);
        showAlert('success', 'บันทึกสำเร็จ', 'บันทึกข้อความตอบกลับเรียบร้อยแล้ว');

    } catch (error) {
        console.error(error);
        stopLoading(true);
        showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }
}

function syncContactTimeState() {
    const includeTime = $("#post-contact-include-time").is(":checked");
    const $timeFields = $("#post-contact-hour, #post-contact-minute");

    $timeFields.prop("disabled", !includeTime);

    if (includeTime) {
        const hour = $("#post-contact-hour").val() || "00";
        const minute = $("#post-contact-minute").val() || "00";
        $("#post-contact-time").val(`${hour}:${minute}`);
    } else {
        $("#post-contact-time").val("");
    }
}

async function AddSuggestion() {
    var selectedCc = [];
    $('#post-cc option:selected').each(function () {
        selectedCc.push($(this).val());
    });

    const includeContactTime = $("#post-contact-include-time").is(":checked");
    const contactTime = includeContactTime
        ? `${$("#post-contact-hour").val() || "00"}:${$("#post-contact-minute").val() || "00"}`
        : "";
    const timeVal = includeContactTime ? `${contactTime}:00` : null;
    $("#post-contact-time").val(contactTime);

    const sendToVal = $("#post-send-to").val() ? $("#post-send-to").val().toString() : null;
    const sendToText = $('#post-send-to option:selected').text() || sendToVal || '';
    const topicTitle = $('#post-title option:selected').text() || $('#post-title').val() || '';
    const suggestionDetail = $("#post-reply").val()?.toString() || '';
    const contactDate = $("#post-contact-date").val()?.toString() || '';
    const contactDateTime = contactTime ? `${contactDate} ${contactTime}` : contactDate;

    var requestData = {
        suggesCde: $("#post-title").val()?.toString(),
        nameProvider: $("#post-personal-name").val()?.toString(),
        emailProvider: $("#post-personal-email").val()?.toString(),
        addressProvider: $("#post-address").val()?.toString(),
        phoneProvider: $("#post-phone").val()?.toString(),
        lineProvider: $("#post-line-id").val()?.toString(),
        department: $("#post-department").val() ? $("#post-department").val().toString() : null,
        sendTo: sendToVal,
        dateSugges: contactDate,
        timeSugges: timeVal,
        chanelProvider: $("#post-additional-contact").val()?.toString(),
        suggestion: suggestionDetail,
        ccMail: selectedCc.length > 0 ? selectedCc.join(" , ") : null,
        cc: selectedCc.length > 0 ? selectedCc.join(" , ") : null
    };

    if (!requestData.suggesCde || requestData.suggesCde === "เลือกหัวข้อ" || requestData.suggesCde.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกหัวข้อ');
        return false;
    }
    if (!requestData.nameProvider || requestData.nameProvider.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณากรอกชื่อ-นามสกุล');
        return false;
    }
    if (!requestData.sendTo || requestData.sendTo.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกผู้รับผิดชอบ');
        return false;
    }
    if (!requestData.suggestion || requestData.suggestion.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณากรอกบันทึกข้อเสนอแนะ / ร้องเรียน');
        return false;
    }
    if (!requestData.dateSugges || requestData.dateSugges.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกวันที่ให้ติดต่อกลับ');
        return false;
    }

    try {
        var result = await AlertComponent.confirmSave('ต้องการบันทึกข้อเสนอแนะ / ร้องเรียนหรือไม่');
        if (result.isConfirmed) {

            startLoading('กำลังบันทึกข้อมูล', 'ระบบกำลังบันทึกข้อมูลข้อเสนอแนะ / ร้องเรียนของคุณ กรุณารอสักครู่...');

            var response = await fetch(`/Suggestions/PostSuggestion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData),
                skipLoading: true
            });

            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }

            var msg = await response.json();
            if (msg && msg.status === "error") {
                throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            }

            if (sendToVal) {
                (async () => {

                        const sendToText = sendToVal;
                        const fullNameTh = typeof userFullNameTh !== 'undefined' ? userFullNameTh : '';
                        const senderId = typeof userId !== 'undefined' ? userId : '';
                        const emailSubject = "CRM : การมอบหมายข้อเสนอแนะ/ร้องเรียน เรื่อง " + topicTitle;
                        const homeUrl = `${webDomain}/Login?returnUrl=${encodeURIComponent('/Suggestions')}`;
                        const emailContent =
                            `เรียน ${sendToText}<br><br>` +
                            `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ได้รับมอบหมายให้ดูแลข้อเสนอแนะ/ร้องเรียนหัวข้อ ${topicTitle} ` +
                            `โดยมีเนื้อหาการร้องเรียนดังนี้ ${suggestionDetail}<br><br>` +
                            ` ` +
                            `<a href='${homeUrl}'>คลิกที่นี่เพื่อเข้าสู่ระบบCRM</a>` +
                            `<br><br>` +
                            `โปรดตอบกลับภายใน ${contactDateTime}<br><br><br>` +
                            `ขอขอบคุณ<br>` +
                            `${fullNameTh}`;

                        await sendEmail(
                            sendToVal,
                            selectedCc,
                            emailSubject,
                            emailContent
                        );

                    if (isGroupSendTo(sendToVal)) {

                        const url = `/Suggestions/GetpersonalInGroup?groupEmail=${encodeURIComponent(sendToVal)}`;
                        const response = await fetch(url, { skipLoading: true });
                        if (!response.ok) {
                            throw new Error('HTTP error ' + response.status);
                        }
                        const data = await response.json();

                        for (const personel of data) {

                            const notiContent = 
                                `เรียน ${personel.thname}<br><br>` +
                                `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ได้รับมอบหมายให้ดูแลข้อเสนอแนะ/ร้องเรียนหัวข้อ ${topicTitle} ` +
                                `โดยมีเนื้อหาการร้องเรียนดังนี้ ${suggestionDetail}<br><br>` +
                                `<br><br>` +
                                `ขอขอบคุณ<br>` +
                                `${fullNameTh}`;

                            const endDate = new Date();
                            endDate.setFullYear(endDate.getFullYear() + 10);

                            await PostNoti({
                                header: "ข้อเสนอแนะ/ร้องเรียน",
                                title: "เรื่อง : " + topicTitle,
                                message: notiContent,
                                receiver_email: personel.e_mail,
                                sender: senderId,
                                create_by: senderId,
                                end_date: endDate,
                                ref_id: msg.guid,
                            });

                        }

                    } else {

                        const notiContent =
                            `เรียน ${sendToText}<br><br>` +
                            `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ได้รับมอบหมายให้ดูแลข้อเสนอแนะ/ร้องเรียนหัวข้อ ${topicTitle} ` +
                            `โดยมีเนื้อหาการร้องเรียนดังนี้ ${suggestionDetail}<br><br>` +
                            `<br><br>` +
                            `โปรดตอบกลับภายใน ${contactDateTime}<br><br><br>` +
                            `ขอขอบคุณ<br>` +
                            `${fullNameTh}`;

                        const endDate = new Date();
                        endDate.setFullYear(endDate.getFullYear() + 10);

                        await PostNoti({
                            header: "ข้อเสนอแนะ/ร้องเรียน",
                            title: "เรื่อง : " + topicTitle,
                            message: notiContent,
                            receiver_email: sendToVal,
                            sender: senderId,
                            create_by: senderId,
                            end_date: endDate,
                            ref_id: msg.guid,
                        });
                    }
                })().catch((emailErr) => {
                    console.error("เกิดข้อผิดพลาดในการส่งอีเมล:", emailErr);
                });
            }

            // โหลดข้อมูลล่าสุดก่อนปิด loading
            await searchSuggestion(null, false);

            stopLoading(true);

            // Clear fields
            $("#post-title").val("");
            $("#post-personal-name").val("");
            $("#post-personal-email").val("");
            $("#post-address").val("");
            $("#post-phone").val("");
            $("#post-line-id").val("");
            $("#post-department").val("");
            $("#post-send-to").val("").trigger("change");
            $("#post-contact-date").val("");
            $("#post-contact-hour").val("00");
            $("#post-contact-minute").val("00");
            $("#post-contact-include-time").prop("checked", true);
            syncContactTimeState();
            $("#post-additional-contact").val("");
            $("#post-reply").val("");
            $('.cc-option-item').removeClass('active').find('.cc-check-icon').addClass('d-none');
            $('#post-cc').empty();
            $('#cc-tags-container .badge').remove();
            $('#cc-placeholder').show();
            $('#cc-search-input').val('');
            $('#cc-dropdown-menu li').show();

            // Close Modal if using bootstrap
            var modalEl = document.getElementById('complaintModal');
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) {
                modal.hide();
            }

            showAlert('success', 'บันทึกสำเร็จ', 'บันทึกข้อเสนอแนะ / ร้องเรียนเรียบร้อยแล้ว');

        }

    } catch (error) {
        console.error(error);
        stopLoading(true);
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

$(document).on('keyup input', '#cc-search-input', function (e) {
    var searchVal = $(this).val().toLowerCase().trim();
    $('#cc-dropdown-menu .cc-option-item').each(function () {
        var text = $(this).text().toLowerCase();
        if (text.includes(searchVal)) {
            $(this).closest('li').show();
        } else {
            $(this).closest('li').hide();
        }
    });
});

$(document).on('click', '#cc-search-item', function (e) {
    e.stopPropagation();
});

$(document).on('shown.bs.dropdown', '.custom-multi-select', function () {
    $('#cc-search-input').val('').focus();
    $('#cc-dropdown-menu li').show();
});

$(document).on('select2:open', () => {
    setTimeout(() => {
        const searchInput = document.querySelector('.select2-container--open .select2-search__field');
        if (searchInput) {
            searchInput.focus();
        }
    }, 10);
});

async function PutSuggestionStatusUpd (){
    var guid = $("#detail-guid").text();
    if (!guid || guid.trim() === "-" || guid.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกรายการที่ต้องการปิดงาน');
        return;
    }

    var $activeRow = $('#suggestionsTable tbody tr.table-active');
    var updBy = $activeRow.length ? ($activeRow.attr('data-updby') || '') : '';
    // if (!isCreator(updBy)) {
    //     showAlert('warning', 'แจ้งเตือน', 'คุณไม่มีสิทธิ์ปิดงาน เนื่องจากไม่ใช่ผู้สร้างรายการนี้');
    //     return;
    // }

    var currentStatus = $activeRow.length ? ($activeRow.attr('data-status') || '') : '';
    if (!canEnableCloseBtn(currentStatus)) {
        showAlert('warning', 'แจ้งเตือน', 'เคสนี้อยู่ในสถานะปิดงานแล้ว');
        return;
    }

    try {
        var result = await AlertComponent.confirmSave('ต้องการปิดงานข้อเสนอแนะ / ร้องเรียนหรือไม่');
        if (result.isConfirmed) {
            startLoading('กำลังบันทึกข้อมูล', 'ระบบกำลังบันทึกข้อมูล กรุณารอสักครู่...');
            var response = await fetch(`/Suggestions/PutSuggestionStatusUpd?guid=${encodeURIComponent(guid)}`, {
                skipLoading: true
            });
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            var msg = await response.json();
            if (msg && msg.status === "error") {
                throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            }

            // โหลดข้อมูลล่าสุดก่อนปิด loading
            await searchSuggestion(guid, false);

            stopLoading(true);
            showAlert('success', 'สำเร็จ', 'ปิดงานเรียบร้อยแล้ว');
        }
    } catch (error) {
        console.error(error);
        stopLoading(true);
        showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }
}

async function ForwardSuggestion() {
    var guid = $("#detail-guid").text();
    if (!guid || guid.trim() === "-" || guid.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกรายการที่ต้องการส่งต่อ');
        return;
    }

    var $activeRow = $('#suggestionsTable tbody tr.table-active');
    var updBy = $activeRow.length ? ($activeRow.attr('data-updby') || '') : '';
    // if (!isCreator(updBy)) {
    //     showAlert('warning', 'แจ้งเตือน', 'คุณไม่มีสิทธิ์ส่งต่อ เนื่องจากไม่ใช่ผู้สร้างรายการนี้');
    //     return;
    // }

    var currentStatus = $activeRow.length ? ($activeRow.attr('data-status') || '') : '';
    if (!canShowForwardBtn(currentStatus)) {
        showAlert('warning', 'แจ้งเตือน', 'เคสนี้อยู่ในสถานะปิดงานแล้ว ไม่สามารถส่งต่อได้');
        return;
    }

    var currentSendTo = $("#detail-sendTo").text().trim();

    // "ส่งต่อ" แสดงเฉพาะอีเมลของบุคคล (personalData.personal) เท่านั้น
    var forwardEmails = Array.isArray(window.forwardSendToEmails) ? window.forwardSendToEmails : [];
    var optionsHtml = '<option value="" selected>เลือกผู้รับผิดชอบ</option>';
    forwardEmails.forEach(function (emailVal) {
        var safeVal = String(emailVal).replace(/"/g, '&quot;');
        optionsHtml += `<option value="${safeVal}">${safeVal}</option>`;
    });

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
            if (typeof $.fn !== 'undefined' && $.fn.select2) {
                $('#swal-send-to').select2({
                    theme: 'bootstrap-5',
                    dropdownParent: Swal.getPopup(),
                    width: '100%'
                });
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
            startLoading('กำลังบันทึกข้อมูล', 'ระบบกำลังส่งต่อข้อมูล กรุณารอสักครู่...');

            const sendToVal = result.value;
            const sendToText = $('#swal-send-to option:selected').text().trim() || sendToVal;
            const $activeRow = $('#suggestionsTable tbody tr.table-active');
            const topicTitle = $activeRow.length > 0 ? $activeRow.find('td:nth-child(2)').text().trim() : '';
            const suggestionDetail = $('#detail-suggestion').text().trim();
            const contactDateTime = $('#detail-contact-back').text().trim();

            var response = await fetch(`/Suggestions/UpdateSuggestionStatus?guid=${encodeURIComponent(guid)}&statusTask=Forward&sendTo=${encodeURIComponent(sendToVal)}`, {
                method: "PUT",
                headers: { "Accept": "application/json" },
                skipLoading: true
            });
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            var msg = await response.json();

            if (msg && msg.status === "error") {
                throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            }

            if (sendToVal) {
                try {
                    const fullNameTh = typeof userFullNameTh !== 'undefined' ? userFullNameTh : '';
                    const homeUrl = `${webDomain}/Login?returnUrl=${encodeURIComponent('/Suggestions')}`;
                    const emailContent =
                        `เรียน ${sendToText}<br><br>` +
                        `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ได้ถูกส่งต่อให้ดูแลข้อเสนอแนะ/ร้องเรียนหัวข้อ ${topicTitle} ` +
                        `โดยมีเนื้อหาการร้องเรียนดังนี้ ${suggestionDetail}<br><br>` +
                        ` ` +
                        `<a href="${homeUrl}">คลิกที่นี่เพื่อเข้าสู่ระบบCRM</a>` +
                        `<br><br>` +
                        `โปรดตอบกลับภายใน ${contactDateTime}<br><br><br>` +
                        `ขอขอบคุณ<br>` +
                        `${fullNameTh}`;

                    await sendEmail(
                        sendToVal,
                        null,
                        "CRM : การส่งต่อข้อเสนอแนะ/ร้องเรียน เรื่อง " + topicTitle,
                        emailContent
                    );
                    const endDate = new Date();
                    endDate.setFullYear(endDate.getFullYear() + 10);

                    const senderId = typeof userId !== 'undefined' ? userId : '';

                    const notiContent =
                        `เรียน ${sendToText}<br><br>` +
                        `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ได้ถูกส่งต่อให้ดูแลข้อเสนอแนะ/ร้องเรียนหัวข้อ ${topicTitle} ` +
                        `โดยมีเนื้อหาการร้องเรียนดังนี้ ${suggestionDetail}<br><br>` +
                        ` ` +
                        `<br><br>` +
                        `โปรดตอบกลับภายใน ${contactDateTime}<br><br><br>` +
                        `ขอขอบคุณ<br>` +
                        `${fullNameTh}`;

                    await PostNoti({
                        header: "ข้อเสนอแนะ/ร้องเรียน",
                        title: "เรื่อง : " + topicTitle,
                        message: notiContent,
                        receiver_email: sendToVal,
                        sender: senderId,
                        create_by: senderId,
                        end_date: endDate,
                        ref_id: guid,
                    });

                } catch (emailErr) {
                    console.error("เกิดข้อผิดพลาดในการส่งอีเมล:", emailErr);
                }

            }

            // โหลดข้อมูลล่าสุดก่อนปิด loading
            await searchSuggestion(guid, false);

            stopLoading(true);
            showAlert('success', 'สำเร็จ', 'ส่งต่อเรียบร้อยแล้ว');
        } catch (error) {
            console.error(error);
            stopLoading(true);
            showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการส่งต่อ: ' + error.message);
        }
    }
}

$("#post-contact-include-time, #post-contact-hour, #post-contact-minute").on("change", function () {
    syncContactTimeState();
});

syncContactTimeState();

$("#btnSaveSuggestion").click(async function () {
    await AddSuggestion();
});

$("#post-phone").on("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "");
});

$("#forwardBtn").click(async function () {
    await ForwardSuggestion();
});

$("#closeBtn").click(async function () {
    await PutSuggestionStatusUpd();
});

$("#saveReplyBtn").click(async function () {
    await UpdateSuggestion();
});