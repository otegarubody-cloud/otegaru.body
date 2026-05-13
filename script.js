document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('open');
            // Toggle icon (hamburger to X)
            const isOpen = mobileNav.classList.contains('open');
            mobileMenuBtn.innerHTML = isOpen
                ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
                : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
        });
    }

    // NOTE: 後ほどGoogle Apps Scriptで発行されるWebアプリURLをここに設定します
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyA4Wc3bVcfeosHuhypkr8UokUUBZohCmjL93L50Z44jlT_XpAHJO5nOw7bJA8tVvKlCQ/exec';

    // --- Booking Flow State ---
    let selectedDate = null;
    let selectedTime = null;
    let selectedMenu = null;

    // --- Generate Dates (Calendar UI) ---
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearText = document.getElementById('calendar-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    let currentCalendarDate = new Date();
    
    // Placeholder for extra available dates (Format: "YYYY-MM-DD")
    let extraAvailableDates = []; 
    let closedDates = [];
    let calendarTimeBlocks = [];

    // --- Fetch CMS Data from GAS ---
    if (typeof GAS_URL !== 'undefined' && GAS_URL && GAS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        fetch(GAS_URL)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    // Update extra dates
                    extraAvailableDates = data.dates
                        .filter(d => d.status === '営業')
                        .map(d => d.date); // "2026-05-30" etc
                        
                    closedDates = data.dates
                        .filter(d => d.status === '休業')
                        .map(d => d.date);
                        
                    calendarTimeBlocks = data.timeBlocks || [];
                        
                    cmsMenus = data.menus;
                    allReservations = data.reservations;
                    
                    // Re-render calendar with new dates
                    if (document.getElementById('calendar-grid')) {
                        renderCalendar();
                    }
                }
            })
            .catch(err => console.error("CMS data fetch error:", err));
    }

    function renderCalendar() {
        if (!calendarGrid) return;
        
        calendarGrid.innerHTML = '';
        
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        
        monthYearText.textContent = `${year}年${month + 1}月`;
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDiv);
        }
        
        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            const dayOfWeek = dateObj.getDay();
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = i;
            
            // Format YYYY-MM-DD for checking extra dates
            const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            // Check availability
            let isAvailable = false;
            // Default: Tue (2) or Wed (3) are available
            if (dayOfWeek === 2 || dayOfWeek === 3) {
                isAvailable = true;
            }
            // Add extra dates
            if (extraAvailableDates.includes(dateStr)) {
                isAvailable = true;
            }
            
            // Past dates are disabled
            if (dateObj < today) {
                isAvailable = false;
            }
            
            // IF it is explicitly closed
            if (closedDates.includes(dateStr)) {
                isAvailable = false;
            }
            
            if (isAvailable) {
                dayDiv.classList.add('available');
                
                // If it is the currently selected date
                const dayStrJa = ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek];
                const formattedSelectStr = `${month + 1}/${i} (${dayStrJa})`;
                
                if (selectedDate === formattedSelectStr) {
                    dayDiv.classList.add('selected');
                }
                
                dayDiv.addEventListener('click', () => {
                    // Deselect all
                    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
                    dayDiv.classList.add('selected');
                    
                    selectedDate = formattedSelectStr;
                    window.selectedDateRaw = dateStr; // Store globally for API
                    
                    // Update Time Slots UI
                    updateTimeSlotUI(selectedDate, dateStr);
                    
                    // Show Step 2 smoothly
                    document.getElementById('step-2').classList.remove('hidden-step');
                    document.getElementById('step-2').classList.add('visible-step');
                    updateSummary();
                    
                    // Scroll to step 2 smoothly
                    setTimeout(() => document.getElementById('step-2').scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                });
            } else {
                dayDiv.classList.add('disabled');
            }
            
            calendarGrid.appendChild(dayDiv);
        }
    }

    if (calendarGrid) {
        renderCalendar();
        
        prevMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        });
        
        nextMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        });
    }

    // --- Show Booking Flow ---
    const ctaButton = document.getElementById('cta-button');
    const bookingFlow = document.getElementById('booking-flow');
    const bookingIntro = document.getElementById('booking-intro');

    if (ctaButton && bookingFlow) {
        ctaButton.addEventListener('click', () => {
            bookingFlow.style.display = 'block';
            bookingIntro.style.display = 'none';
        });
    }

    // --- Handle Steps ---
    const dateBtns = document.querySelectorAll('.date-btn');
    const timeBtns = document.querySelectorAll('.time-btn');
    const menuBtns = document.querySelectorAll('.menu-btn');

    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');

    const summaryDatetime = document.getElementById('summary-datetime');
    const summaryMenu = document.getElementById('summary-menu');

    function updateSummary() {
        if (summaryDatetime) {
            summaryDatetime.textContent = (selectedDate && selectedTime)
                ? `${selectedDate} ${selectedTime}`
                : '-';
        }
        if (summaryMenu) {
            summaryMenu.textContent = selectedMenu ? selectedMenu : '-';
        }
    }

    // --- Dynamic Time Slots ---
    function getBlockedSlots(dateStr, dateRaw) {
        const reservations = JSON.parse(localStorage.getItem('otegaru_reservations') || '[]');
        const confirmedOnDate = reservations.filter(r => r.date === dateStr && r.status === 'confirmed');
        const blocked = [];

        confirmedOnDate.forEach(r => {
            const time = r.time;
            blocked.push(time);

            // 60分と40分は2枠（1時間分）ブロックするルール
            if (r.menu.includes('60分') || r.menu.includes('40分')) {
                const [h, m] = time.split(':').map(Number);
                let nextH = h;
                let nextM = m + 30;
                if (nextM >= 60) {
                    nextH += 1;
                    nextM -= 60;
                }
                const nextTime = `${nextH.toString().padStart(2, '0')}:${nextM === 0 ? '00' : '30'}`;
                blocked.push(nextTime);
            }
        });
        
        // Add time blocks from Google Calendar
        if (dateRaw && calendarTimeBlocks.length > 0) {
            const blocksOnDate = calendarTimeBlocks.filter(b => b.date === dateRaw);
            blocksOnDate.forEach(b => {
                // If a block is from 13:00 to 14:00, block 13:00 and 13:30
                // Simple logic: we parse times to minutes and check overlap for each 30m slot
                const [startH, startM] = b.startTime.split(':').map(Number);
                const [endH, endM] = b.endTime.split(':').map(Number);
                const startMins = startH * 60 + startM;
                const endMins = endH * 60 + endM;
                
                // Add slots that fall within the block
                const slots = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
                slots.forEach(slot => {
                    const [sh, sm] = slot.split(':').map(Number);
                    const slotStartMins = sh * 60 + sm;
                    // A slot is blocked if it starts during a calendar block
                    if (slotStartMins >= startMins && slotStartMins < endMins) {
                        blocked.push(slot);
                    }
                });
            });
        }
        
        return blocked;
    }

    function updateTimeSlotUI(dateStr, dateRaw) {
        const blocked = getBlockedSlots(dateStr, dateRaw);
        timeBtns.forEach(btn => {
            const t = btn.dataset.time;
            if (blocked.includes(t)) {
                btn.classList.add('disabled-step');
                btn.classList.remove('selected');
                if (selectedTime === t) selectedTime = null; // Clear if currently selected
            } else {
                btn.classList.remove('disabled-step');
            }
        });
        updateSummary();
    }



    // Step 2: Select Time
    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Only allow if not hidden
            if (step2.classList.contains('hidden-step')) return;

            timeBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedTime = btn.dataset.time;

            // Show Step 3 smoothly
            document.getElementById('step-3').classList.remove('hidden-step');
            document.getElementById('step-3').classList.add('visible-step');
            updateSummary();

            setTimeout(() => step3.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        });
    });

    // Step 3: Select Menu
    menuBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (step3.classList.contains('hidden-step')) return;

            menuBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedMenu = btn.dataset.menu;

            // Show Step 4 smoothly
            document.getElementById('step-4').classList.remove('hidden-step');
            document.getElementById('step-4').classList.add('visible-step');
            updateSummary();

            setTimeout(() => step4.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        });
    });

    // --- Form Submission ---
    const finalForm = document.getElementById('final-booking-form');

    if (finalForm) {
        finalForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!selectedDate || !selectedTime || !selectedMenu) {
                alert("日時とメニューを選択してください。");
                return;
            }

            // Validation: Overlap check
            const blocked = getBlockedSlots(selectedDate, window.selectedDateRaw);
            if (blocked.includes(selectedTime)) {
                alert('選択された時間は既に予約されています。');
                return;
            }
            if ((selectedMenu.includes('60分') || selectedMenu.includes('40分'))) {
                const [h, m] = selectedTime.split(':').map(Number);
                let nextH = h;
                let nextM = m + 30;
                if (nextM >= 60) { nextH += 1; nextM -= 60; }
                const nextTime = `${nextH.toString().padStart(2, '0')}:${nextM === 0 ? '00' : '30'}`;
                if (blocked.includes(nextTime)) {
                    alert('後の予約と重なるため、その時間帯でそのメニューはお受けできません。別の時間帯をお選びください。');
                    return;
                }
            }

            const nameInput = document.getElementById('cust-name').value;
            const phoneInput = document.getElementById('cust-phone').value;
            const emailInput = document.getElementById('cust-email').value;
            const notesInput = document.getElementById('cust-notes') ? document.getElementById('cust-notes').value : "";

            // Create Reservation Object
            const newReservation = {
                id: Date.now().toString(),
                date: selectedDate,
                dateRaw: window.selectedDateRaw,
                time: selectedTime,
                menu: selectedMenu,
                name: nameInput,
                phone: phoneInput,
                email: emailInput,
                notes: notesInput,
                status: 'confirmed',
                createdAt: new Date().toISOString()
            };

            // Save to LocalStorage DB
            const existing = JSON.parse(localStorage.getItem('otegaru_reservations') || '[]');
            existing.push(newReservation);
            localStorage.setItem('otegaru_reservations', JSON.stringify(existing));

            const submitBtn = finalForm.querySelector('.btn-submit');
            submitBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> 予約を確定中...';
            submitBtn.style.opacity = '0.7';

            // Email Notification via GAS
            if (GAS_URL && GAS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
                fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(newReservation)
                }).catch(err => console.error('Email send failed:', err));
            }

            setTimeout(() => {
                window.location.href = `complete.html?id=${newReservation.id}`;
            }, 800);
        });
    }

    // Confirm Page Logic
    const confirmForm = document.getElementById('confirm-form');
    let currentFoundReservation = null;

    if (confirmForm) {
        confirmForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = document.getElementById('search-phone').value;
            const searchBtn = document.getElementById('search-btn');
            const loadingArea = document.getElementById('loading-area');
            const resultArea = document.getElementById('search-result');
            const resultTitle = document.getElementById('result-title');
            const reservationCard = document.getElementById('reservation-card');

            // Show loading
            searchBtn.disabled = true;
            loadingArea.style.display = 'block';
            resultArea.style.display = 'none';

            // Simulate API call delay
            setTimeout(() => {
                loadingArea.style.display = 'none';
                searchBtn.disabled = false;

                if (phone) {
                    // Fetch from LocalStorage
                    const reservations = JSON.parse(localStorage.getItem('otegaru_reservations') || '[]');
                    // Find the most recent reservation matching the phone
                    const matching = reservations.filter(r => r.phone === phone);
                    const res = matching.length > 0 ? matching[matching.length - 1] : null;

                    if (res) {
                        currentFoundReservation = res;

                        // Populate card
                        document.getElementById('conf-date').textContent = res.date;
                        document.getElementById('conf-time').textContent = res.time;
                        document.getElementById('conf-menu').textContent = res.menu;
                        document.getElementById('conf-name').textContent = res.name;

                        resultTitle.style.display = 'block';
                        resultArea.style.display = 'block';

                        const statusBadge = document.getElementById('status-badge');
                        const cancelBtn = document.getElementById('show-cancel-modal-btn');

                        if (res.status === 'confirmed') {
                            statusBadge.textContent = '予約確定';
                            statusBadge.style.background = 'var(--primary)';
                            reservationCard.style.opacity = '1';
                            cancelBtn.style.display = 'flex';
                            resultTitle.innerHTML = '予約一覧（1件）';
                        } else {
                            statusBadge.textContent = 'キャンセル済み';
                            statusBadge.style.background = '#6b7280'; // gray-500
                            reservationCard.style.opacity = '0.6';
                            cancelBtn.style.display = 'none';
                            resultTitle.innerHTML = '<span style="color: var(--text-muted);">キャンセル済み（1件）</span>';
                        }
                    } else {
                        alert('該当する予約が見つかりませんでした。');
                    }
                }
            }, 800);
        });

        // Cancel Modal Logic
        const showCancelModalBtn = document.getElementById('show-cancel-modal-btn');
        const cancelModal = document.getElementById('cancel-modal');
        const modalBtnBack = document.getElementById('modal-btn-back');
        const modalBtnConfirm = document.getElementById('modal-btn-confirm');
        const reservationCard = document.getElementById('reservation-card');
        const statusBadge = document.getElementById('status-badge');

        if (showCancelModalBtn && cancelModal) {
            showCancelModalBtn.addEventListener('click', () => {
                cancelModal.classList.add('show');
            });

            modalBtnBack.addEventListener('click', () => {
                cancelModal.classList.remove('show');
            });

            modalBtnConfirm.addEventListener('click', () => {
                cancelModal.classList.remove('show');

                if (currentFoundReservation) {
                    // Update LocalStorage
                    const reservations = JSON.parse(localStorage.getItem('otegaru_reservations') || '[]');
                    const idx = reservations.findIndex(r => r.id === currentFoundReservation.id);
                    if (idx !== -1) {
                        reservations[idx].status = 'cancelled';
                        localStorage.setItem('otegaru_reservations', JSON.stringify(reservations));
                        currentFoundReservation.status = 'cancelled';
                    }

                    // Simulate Cancelled State UI
                    reservationCard.style.opacity = '0.6';
                    statusBadge.textContent = 'キャンセル済み';
                    statusBadge.style.background = '#6b7280'; // gray-500
                    showCancelModalBtn.style.display = 'none';
                    document.getElementById('result-title').innerHTML = '<span style="color: var(--text-muted);">キャンセル済み（1件）</span>';

                    // --- Email Notification for Cancel via GAS ---
                    if (GAS_URL && GAS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
                        const cancelPayload = { ...currentFoundReservation, action: 'cancel' };
                        fetch(GAS_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain' },
                            body: JSON.stringify(cancelPayload)
                        }).catch(err => console.error('Cancel email send failed:', err));
                    }
                }
            });
        }
    }

});

// Global function to allow selecting menu directly from the Menu Cards at the top
window.selectMenuFromCard = function (menuName) {
    const ctaButton = document.getElementById('cta-button');
    const bookingFlow = document.getElementById('booking-flow');
    const bookingIntro = document.getElementById('booking-intro');

    // Show flow
    if (bookingFlow) bookingFlow.style.display = 'block';
    if (bookingIntro) bookingIntro.style.display = 'none';

    // Highlight the correct menu in step 3
    const menuBtns = document.querySelectorAll('.menu-btn');
    menuBtns.forEach(b => b.classList.remove('selected'));

    let targetBtn = Array.from(menuBtns).find(b => b.dataset.menu === menuName);
    if (targetBtn) {
        targetBtn.classList.add('selected');
        // We can pre-select menu, but the user still needs date/time. 
        // We will just select it visually. They must follow step 1, 2, 3 sequentially in the logic, 
        // but we can set the variable so step 3 is pre-filled when they reach it.
    }
};
