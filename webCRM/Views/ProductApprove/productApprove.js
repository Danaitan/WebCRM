(function () {

    // ─── Colour palette cycling for campaign cards ──────────────────────────
    var iconColors = ['blue', 'green', 'yellow', 'purple', 'red'];

    // Map status → badge CSS class
    function statusClass(status) {
        var map = {
            'กำลังพิจารณา':    'status-blue',
            'รอข้อมูลเพิ่มเติม': 'status-yellow',
            'รออนุมัติ':        'status-purple',
            'อนุมัติแล้ว':      'status-green',
            'ไม่อนุมัติ':       'status-red',
            'ปกติ':             'status-blue'
        };
        return map[status] || 'status-blue';
    }

    // format date from YYYY-MM-DD to DD/MM/YYYY
    function formatDate(dateStr) {
        if (!dateStr) return '';
        var parts = dateStr.split('-');
        if (parts.length === 3) {
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        return dateStr;
    }

    // ─── Render cards from data array ──────────────────────────────────────
    function renderCampaignCards(items) {
        var list = document.getElementById('campaignList');
        list.innerHTML = '';

        if (!items || items.length === 0) {
            list.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--text-muted,#999)">ไม่พบข้อมูลแคมเปญ</div>';
            document.getElementById('campaignCount').textContent = '0';
            document.getElementById('campaignPaginationText').textContent = '0 รายการ';
            return;
        }

        items.forEach(function (item, idx) {
            var color   = iconColors[idx % iconColors.length];
            var sCls    = statusClass(item.status);
            var startFmt = formatDate(item.startDate);
            var endFmt   = formatDate(item.endDate);

            var card = document.createElement('div');
            card.className = 'pa-card' + (idx === 0 ? ' active' : '');
            card.dataset.id     = item.code;
            card.dataset.name   = item.name;
            card.dataset.start  = item.startDate;
            card.dataset.end    = item.endDate;
            card.dataset.status = item.status;
            card.dataset.note   = item.remark;

            card.innerHTML =
                '<div class="pa-card-icon ' + color + '"><i class="bi bi-megaphone"></i></div>' +
                '<div class="pa-card-content">' +
                    '<div class="pa-card-title-row">' +
                        '<div class="pa-card-id">' + item.code + '</div>' +
                        '<div class="pa-status-badge ' + sCls + '">' + item.status + '</div>' +
                    '</div>' +
                    '<div class="pa-card-name">' + item.name + '</div>' +
                    '<div class="pa-card-date">วันที่เริ่ม: ' + (startFmt || '-') + ' &bull; วันที่สิ้นสุด: ' + (endFmt || '-') + '</div>' +
                '</div>';

            list.appendChild(card);
        });

        document.getElementById('campaignCount').textContent = items.length;
        document.getElementById('campaignPaginationText').textContent =
            '1 - ' + items.length + ' จาก ' + items.length + ' รายการ';

        // Auto-select first card and populate detail panel
        var firstCard = list.querySelector('.pa-card');
        if (firstCard) updateDetailPanel(firstCard);
    }

    // ─── Update detail panel from a card element ────────────────────────────
    function updateDetailPanel(card) {
        var id     = card.dataset.id     || '';
        var name   = card.dataset.name   || '';
        var start  = card.dataset.start  || '';
        var end    = card.dataset.end    || '';
        var status = card.dataset.status || '';
        var note   = card.dataset.note   || '-';

        var detailId = document.getElementById('detailId');
        if (detailId) detailId.value = id;

        var detailName = document.getElementById('detailName');
        if (detailName) detailName.value = name;

        var detailStart = document.getElementById('detailStart');
        if (detailStart) detailStart.value = formatDate(start);

        var detailEnd = document.getElementById('detailEnd');
        if (detailEnd) detailEnd.value = formatDate(end);

        var detailNote = document.getElementById('detailNote');
        if (detailNote) detailNote.value = note;

        var detailStatus = document.getElementById('detailStatus');
        if (detailStatus) {
            detailStatus.textContent = status;
            detailStatus.className = 'pa-status-box';
        }
    }

    // ─── Card click → detail panel ──────────────────────────────────────────
    var campaignList = document.getElementById('campaignList');
    if (campaignList) {
        campaignList.addEventListener('click', function (e) {
            var card = e.target.closest('.pa-card');
            if (!card) return;

            document.querySelectorAll('.pa-card').forEach(function (c) {
                c.classList.remove('active');
            });
            card.classList.add('active');
            updateDetailPanel(card);
        });
    }

    var campaignSearchInput = document.getElementById('campaignSearch');
    var prospectSearchInput = document.getElementById('prospectSearch');

    // Campaign search: real-time
    campaignSearchInput.addEventListener('input', filterCampaigns);

    // Prospect search: real-time
    prospectSearchInput.addEventListener('input', filterProspectTable);

    // Date & status affect campaign cards
    ['filterStartDate', 'filterEndDate', 'filterStatus'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', applyAllFilters);
    });

    // Branch (select) & By (text input) affect prospect table
    document.getElementById('filterBranch').addEventListener('change', filterProspectTable);
    document.getElementById('filterBy').addEventListener('input', filterProspectTable);

    // Clear button
    document.getElementById('btnClearFilter').addEventListener('click', clearAllFilters);

    // ─── Filter functions ───────────────────────────────────────────────────
    function filterCampaigns() {
        var query     = campaignSearchInput.value.trim().toLowerCase();
        var startDate = document.getElementById('filterStartDate').value;
        var endDate   = document.getElementById('filterEndDate').value;
        var status    = document.getElementById('filterStatus').value;

        var cards   = document.querySelectorAll('#campaignList .pa-card');
        var visible = 0;

        cards.forEach(function (card) {
            var id         = (card.dataset.id   || '').toLowerCase();
            var name       = (card.dataset.name || '').toLowerCase();
            var cardStart  = card.dataset.start  || '';
            var cardEnd    = card.dataset.end    || '';
            var cardStatus = card.dataset.status || '';

            var matchText   = !query     || id.includes(query) || name.includes(query);
            var matchStart  = !startDate || cardStart >= startDate;
            var matchEnd    = !endDate   || cardEnd   <= endDate;
            var matchStatus = !status    || cardStatus === status;

            var show = matchText && matchStart && matchEnd && matchStatus;
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        document.getElementById('campaignCount').textContent = visible;
        document.getElementById('campaignPaginationText').textContent =
            visible > 0 ? '1 - ' + visible + ' จาก ' + visible + ' รายการ' : '0 รายการ';
    }

    function filterProspectTable() {
        var query  = prospectSearchInput.value.trim().toLowerCase();
        var branch = document.getElementById('filterBranch').value;
        var byUser = document.getElementById('filterBy').value;

        var rows    = document.querySelectorAll('#prospectTableBody tr');
        var visible = 0;

        rows.forEach(function (row) {
            var rowBranch   = row.dataset.branch   || '';
            var rowName     = row.dataset.name     || '';
            var rowContract = row.dataset.contract || '';
            var rowBy       = row.dataset.by       || '';

            var matchText   = !query ||
                rowBranch.toLowerCase().includes(query)   ||
                rowName.toLowerCase().includes(query)     ||
                rowContract.toLowerCase().includes(query);
            var matchBranch = !branch || rowBranch === branch;
            var matchBy     = !byUser || rowBy.toLowerCase().includes(byUser.toLowerCase());

            var show = matchText && matchBranch && matchBy;
            row.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        var seq = 1;
        rows.forEach(function (row) {
            if (row.style.display !== 'none') {
                row.cells[0].textContent = seq++;
            }
        });

        var total = rows.length;
        document.getElementById('prospectPaginationText').textContent =
            visible > 0
                ? 'แสดง 1 - ' + visible + ' จาก ' + total + ' รายการ'
                : 'แสดง 0 จาก ' + total + ' รายการ';
    }

    function applyAllFilters() {
        filterCampaigns();
        filterProspectTable();
    }

    function clearAllFilters() {
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value   = '';
        document.getElementById('filterStatus').value    = '';
        document.getElementById('filterBranch').value    = '';
        document.getElementById('filterBy').value        = '';
        campaignSearchInput.value = '';
        prospectSearchInput.value = '';
        applyAllFilters();
    }

    // ─── Fetch campaign list from API ───────────────────────────────────────
    async function getCampainList() {
        try {
            Swal.fire({
                title: 'กำลังโหลดข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            const response = await fetch(`/Campain/GetCampainList`);
            const data = await response.json();
            const mapped = data.map(item => ({
                code:      item.product_code   || '',
                name:      item.product_name   || '',
                status:    item.product_status || 'ปกติ',
                startDate: item.product_start  ? item.product_start.substring(0, 10) : '',
                endDate:   item.product_end    ? item.product_end.substring(0, 10)   : '',
                remark:    item.product_remark || '',
                createdBy: item.createrd_by    || item.created_by || '',
                created:   item.created        ? item.created.substring(0, 10)       : ''
            }));
            return mapped;
        } catch (error) {
            console.error(error);
            Swal.close();
            return [];
        }
    }

    // ─── Initialise on page load ────────────────────────────────────────────
    (async function init() {
        var items = await getCampainList();
        Swal.close();
        renderCampaignCards(items);
    })();

})();
