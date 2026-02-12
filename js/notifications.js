// js/notifications.js - Handles Reminders and Notifications

const totalDays = 31;
let selectedDay = null;
let reminders = JSON.parse(localStorage.getItem('myReminders')) || {}; 
// Structure: { "1": {time: "08:00", text: "Medicine", notifiedEarly: false, notifiedOnTime: false}, ... }

document.addEventListener('DOMContentLoaded', () => {
    // Request Permission
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    // Build Calendar
    const grid = document.getElementById('calendarGrid');
    if (grid) {
        for (let i = 1; i <= totalDays; i++) {
            const dayBox = document.createElement('div');
            dayBox.className = 'day-box';
            dayBox.innerText = i;
            dayBox.dataset.day = i;
            dayBox.onclick = () => openModal(i);
            if (reminders[i]) dayBox.classList.add('active');
            grid.appendChild(dayBox);
        }
    }
    
    // Start Background Check
    setInterval(checkReminders, 10000);
});

// --- Modal Functions ---
function openModal(day) {
    selectedDay = day;
    document.getElementById('modalDateTitle').innerText = `ตั้งเตือนวันที่ ${day}`;
    document.getElementById('reminderModal').classList.add('show');
    if (reminders[day]) {
        document.getElementById('reminderText').value = reminders[day].text;
        document.getElementById('reminderTime').value = reminders[day].time;
    } else {
        document.getElementById('reminderText').value = "";
        document.getElementById('reminderTime').value = "";
    }
}

function closeModal() {
    document.getElementById('reminderModal').classList.remove('show');
}

function saveReminder() {
    const text = document.getElementById('reminderText').value;
    const time = document.getElementById('reminderTime').value;

    if (!text || !time) {
        alert("กรุณากรอกข้อความและเลือกเวลา");
        return;
    }

    // Save Data (Reset notification status)
    reminders[selectedDay] = { 
        text: text, 
        time: time,
        notifiedEarly: false, 
        notifiedOnTime: false 
    };
    
    localStorage.setItem('myReminders', JSON.stringify(reminders));
    document.querySelector(`.day-box[data-day='${selectedDay}']`).classList.add('active');
    
    closeModal();
    alert(`✅ ตั้งเตือนวันที่ ${selectedDay} เวลา ${time} เรียบร้อย!`);
    
    // Unlock Audio Context
    const audio = document.getElementById('alarmSound');
    if(audio) {
        audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
        }).catch(e => console.log("Audio unlock failed (normal if no user interaction)"));
    }
}

function deleteReminder() {
    if (reminders[selectedDay]) {
        delete reminders[selectedDay];
        localStorage.setItem('myReminders', JSON.stringify(reminders));
        document.querySelector(`.day-box[data-day='${selectedDay}']`).classList.remove('active');
        closeModal();
    }
}

// --- Background Check Logic ---
function checkReminders() {
    const now = new Date();
    const currentDay = now.getDate();
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const reminder = reminders[currentDay];

    if (reminder) {
        const [targetHour, targetMinute] = reminder.time.split(':').map(Number);
        
        const targetTotalMinutes = (targetHour * 60) + targetMinute;
        const currentTotalMinutes = (currentHour * 60) + currentMinute;
        
        // 1. Alert 10 mins early
        if (currentTotalMinutes === targetTotalMinutes - 10) {
            if (!reminder.notifiedEarly) {
                playAlarm();
                showNotification("⏳ อีก 10 นาที: " + reminder.text);
                reminder.notifiedEarly = true;
                localStorage.setItem('myReminders', JSON.stringify(reminders));
            }
        }

        // 2. Alert on time
        if (currentTotalMinutes === targetTotalMinutes) {
            if (!reminder.notifiedOnTime) {
                playAlarm();
                showNotification("⏰ ถึงเวลาแล้ว: " + reminder.text);
                reminder.notifiedOnTime = true;
                localStorage.setItem('myReminders', JSON.stringify(reminders));
            }
        }
    }
}

function playAlarm() {
    const audio = document.getElementById('alarmSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play failed: " + e));
    }
    
    // Vibrate (Android)
    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);
}

function showNotification(msg) {
    if (!("Notification" in window)) {
        alert(msg);
    } else if (Notification.permission === "granted") {
        new Notification("แจ้งเตือนกินยา", {
            body: msg,
            icon: "https://cdn-icons-png.flaticon.com/512/3076/3076136.png",
            requireInteraction: true 
        });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") showNotification(msg);
        });
    } else {
        alert(msg); 
    }
}
