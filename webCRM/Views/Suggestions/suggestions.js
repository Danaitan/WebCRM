$(document).ready(function () {
    var table = $('#suggestionsTable').DataTable({
        searching: true,
        dom: "lrtip",
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
    $('#customSearchInput').on('keyup', function () {
        table.search(this.value).draw();
    });

    // กรองตามหัวข้อ
    $('#filterTopic').on('change', function () {
        // ค้นหาในคอลัมน์ที่ 0 (หัวข้อ)
        table.column(0).search(this.value).draw();
    });

    // กรองตามสถานะ
    $('#filterStatus').on('change', function () {
        // ค้นหาในคอลัมน์ที่ 3 (สถานะ)
        table.column(3).search(this.value).draw();
    });
});

function showDetails(row) {
    const $row = $(row);
    $('#detail-phone').text($row.data('phone'));
    $('#detail-contact-back').text($row.data('contact'));
    $('#detail-email').text($row.data('email'));
    $('#detail-line').text($row.data('line'));
    $('#detail-idno').text($row.data('idno'));
    $('#detail-status').text($row.data('status'));
    $('#detail-address').text($row.data('address'));
    $('#detail-date').text($row.data('date'));
    $('#detail-recorded-by').text($row.data('recordedby'));
    $('#detail-reply').text($row.data('reply'));

    $('#detail-nameprovider').text($row.data('nameprovider'));

    $('#detail-guid').text($row.data('guid'));
    $('#detail-updBy').text($row.data('updby'));
}

async function UpdateSuggestion()
{
    var guid = $("#detail-guid").text();
    var reply = $("#reply-input").val();
    var updBy = typeof currentUserEmail !== 'undefined' ? currentUserEmail : '';
    
    if (!guid || guid.trim() === "-" || guid.trim() === "") {
        showAlert('warning', 'แจ้งเตือน', 'กรุณาเลือกรายการที่ต้องการบันทึกข้อความตอบกลับ');
        return;
    }

    try {
        var result = await AlertComponent.confirmSave(`ต้องการบันทึกข้อความตอบกลับหรือไม่`);     
        
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
            showAlert('success', 'บันทึกสำเร็จ', 'บันทึกข้อความตอบกลับเรียบร้อยแล้ว', function() {
                window.location.reload();
            });
        }

    } catch (error) {
        console.error(error);
        hideLoading();
        showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }
}

async function AddSuggestion()
{
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
        timeSugges: $("#post-contact-time").val()
            ? $("#post-contact-time").val().toString() + ":00"
            : null,
        chanelProvider: $("#post-additional-contact").val()?.toString(),
        suggestion: $("#post-reply").val()?.toString(),
        cc: $("#post-cc").val()
            ? $("#post-cc").val().join(",")
            : null
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

        var result = await AlertComponent.confirmSave(`ต้องการบันทึกข้อความตอบกลับหรือไม่`);     
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
            $("#post-title").val("เลือกหัวข้อ");
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
            
            // Close Modal if using bootstrap
            var modalEl = document.getElementById('complaintModal');
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) {
                modal.hide();
            }
            
            showAlert('success', 'บันทึกสำเร็จ', 'บันทึกข้อเสนอแนะ / ร้องเรียนเรียบร้อยแล้ว', function() {
                window.location.reload();
            });

        }

    } catch (error) {
        console.error(error);
        hideLoading();
        showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }
}

$(document).ready(function() {
    function updateCcDisplay() {
        var selected = [];
        $('#post-cc').empty();
        $('.cc-checkbox:checked').each(function() {
            var val = $(this).val();
            selected.push(val);
            $('#post-cc').append('<option value="' + val + '" selected>' + val + '</option>');
        });
        
        var display = $('#cc-tags-container');
        display.find('.badge').remove();
        
        if (selected.length === 0) {
            $('#cc-placeholder').show();
        } else {
            $('#cc-placeholder').hide();
            selected.forEach(function(item) {
                var badge = $('<span class="badge bg-primary text-white d-flex align-items-center gap-1"></span>').text(item);
                var closeBtn = $('<i class="bi bi-x" style="cursor: pointer; font-size: 1.1em;"></i>');
                closeBtn.on('click', function(e) {
                    e.stopPropagation();
                    $('.cc-checkbox[value="' + item + '"]').prop('checked', false);
                    updateCcDisplay();
                });
                badge.append(closeBtn);
                display.prepend(badge);
            });
        }
    }
    
    $('.cc-checkbox').on('change', function() {
        updateCcDisplay();
    });
});
