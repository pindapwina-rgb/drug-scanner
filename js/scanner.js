// js/scanner.js - Handles Camera, OCR, and TTS
import { showModal } from "./modal.js";

window.showTips = function() {
    document.getElementById('tipsModal').classList.add('active');
}
window.closeTips = function() {
    document.getElementById('tipsModal').classList.remove('active');
}

let video, canvas, synth;
let stream = null;
let voices = [];

document.addEventListener('DOMContentLoaded', () => {
    video = document.getElementById('camera-feed');
    canvas = document.getElementById('capture-canvas');
    synth = window.speechSynthesis;

    // Load voices immediately
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Global Audio Unlock for iOS/Android
    document.body.addEventListener('touchstart', function() {
        if (synth && !synth.speaking) {
            const u = new SpeechSynthesisUtterance("");
            synth.speak(u);
        }
    }, { once: true });
});

// --- 1. Load Voices ---
function loadVoices() {
    voices = synth.getVoices();
    console.log("Loaded voices:", voices.length);
}

// --- 2. Permission Handling ---
window.grantPermission = function() { // Expose to global scope for HTML button
    // Unlock Audio Context on first interaction
    synth.cancel();
    synth.speak(new SpeechSynthesisUtterance(""));
    
    document.getElementById('startScreen').style.display = 'none';
    startCamera();
}

// --- 3. Camera Handling ---
async function startCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    try {
        // Try to get back camera (environment)
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 3840 }, height: { ideal: 2160 } }
        });
        handleStream(stream);
    } catch (err) {
        try {
            // Fallback to any camera
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            handleStream(stream);
        } catch (err2) { 
            await showModal("ผิดพลาด", "ไม่สามารถเปิดกล้องได้: " + err2.message, "error");
            document.getElementById('startScreen').style.display = 'flex';
        }
    }
}

function handleStream(streamData) {
    stream = streamData;
    video.srcObject = stream;
    video.onloadedmetadata = () => {
        video.play().catch(e => console.error("Video play failed", e));
    };
}

// --- 4. Snapshot & OCR ---
window.takeSnapshot = function() { // Expose to global
    if (!video.srcObject) return;
    
    // Unlock audio again just in case
    synth.cancel();
    synth.speak(new SpeechSynthesisUtterance(""));

    video.pause();
    document.getElementById('loadingScreen').classList.add('active');

    // Capture Image
    const rectWidth = video.videoWidth * 0.8;
    const rectHeight = video.videoHeight * 0.4; 
    const startX = (video.videoWidth - rectWidth) / 2;
    const startY = (video.videoHeight - rectHeight) / 2;

    canvas.width = rectWidth;
    canvas.height = rectHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, startX, startY, rectWidth, rectHeight, 0, 0, rectWidth, rectHeight);

    // Pre-process Image (Grayscale & Contrast)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // Increase contrast
        const contrast = 1.2; // Factor
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const color = factor * (avg - 128) + 128;
        
        data[i] = data[i + 1] = data[i + 2] = color;
    }
    ctx.putImageData(imageData, 0, 0);

    // OCR with Tesseract
    canvas.toBlob((blob) => {
        Tesseract.recognize(blob, 'tha+eng', {
            tessedit_char_whitelist: '0123456789กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลวศษสหฬอฮฯะัาำิีึืฺุูเแโใไๅๆ็่้๊๋์abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,:/()%+- ',
            tessedit_pageseg_mode: '3' // 3 = Auto, 6 = Block
        }).then(({ data: { text } }) => {
            document.getElementById('loadingScreen').classList.remove('active');
            parseDrugText(text);
        }).catch(async err => {
            document.getElementById('loadingScreen').classList.remove('active');
            await showModal("ผิดพลาด", "เกิดข้อผิดพลาดในการอ่าน: " + err, "error");
            video.play();
        });
    });
}

// --- 5. Data Parsing ---
function cleanGibberish(text) {
    // Keep lines that look meaningful
    return text.replace(/[^ก-๙a-zA-Z0-9\s\.\,\(\)\/\-\%]/g, ' ');
}

window.parseDrugText = function(rawText) {
    const cleanedText = cleanGibberish(rawText);
    document.getElementById('rawText').value = rawText + "\n\n--- Cleaned ---\n" + cleanedText;

    const fullText = cleanedText.replace(/\s+/g, ' '); 
    const lowerText = fullText.toLowerCase();
    
    let name = "";
    let dose = "-"; 
    let meals = "";

    // 1. Name Strategy
    // Try to find common drug names first
    if (lowerText.includes("paracetamol") || lowerText.includes("พาราเซตามอล")) name = "Paracetamol (พาราเซตามอล)";
    else if (lowerText.includes("amoxy") || lowerText.includes("amoxicillin")) name = "Amoxicillin (ยาฆ่าเชื้อ)";
    else if (lowerText.includes("loratadine")) name = "Loratadine (ยาแก้แพ้)";
    else {
        // Fallback: Longest English word or first Thai phrase
        const lines = rawText.split('\n');
        // Find line with most CAPS (often Drug Name)
        const capLine = lines.find(l => /[A-Z]{4,}/.test(l));
        if (capLine) name = capLine.trim();
        else {
             // Fallback to previous logic
            const potentialName = lines.find(l => l.length > 5 && !l.match(/^[0-9\s\.\:]+$/)); 
            name = potentialName ? potentialName.trim() : "";
        }
    }

    // 2. Dose Strategy
    // Look for "1 เม็ด", "2 catpsules", etc.
    const doseMatch = fullText.match(/(ทาน|กิน|รับประทาน|ครั้งละ)\s*(\d+|[๐-๙]+|[halfครึ่ง]+)\s*(เม็ด|แคปซูล|capsule|tablet)/i);
    if (doseMatch) {
         dose = doseMatch[2];
         if(dose === 'half' || dose === 'ครึ่ง') dose = "0.5";
    }

    // 3. Meals Strategy
    let mealParts = [];
    if (fullText.match(/(หลังอาหาร|หลัง)/)) mealParts.push("หลังอาหาร");
    if (fullText.match(/(ก่อนอาหาร|ก่อน)/)) mealParts.push("ก่อนอาหาร");
    if (fullText.match(/(เช้า)/)) mealParts.push("เช้า");
    if (fullText.match(/(กลางวัน|เที่ยง)/)) mealParts.push("กลางวัน");
    if (fullText.match(/(เย็น)/)) mealParts.push("เย็น");
    if (fullText.match(/(ก่อนนอน)/)) mealParts.push("ก่อนนอน");
    
    meals = mealParts.length > 0 ? mealParts.join(" ") : "-";

    // Update UI
    document.getElementById('editDrugName').value = name;
    document.getElementById('editDose').value = dose;
    document.getElementById('editMeals').value = meals;

    document.getElementById('resultModal').classList.add('active');
    
    // Speak Result
    speakParsedResult();
}

window.closeModal = function() {
    document.getElementById('resultModal').classList.remove('active');
    synth.cancel();
    video.play();
}

window.saveData = async function() {
    const drugName = document.getElementById('editDrugName').value;
    const dose = document.getElementById('editDose').value;
    const meals = document.getElementById('editMeals').value;

    if (!drugName) { 
        await showModal("แจ้งเตือน", "กรุณาระบุชื่อยา", "info"); 
        return; 
    }

    let description = "";
    if (dose && dose !== "-") description += `ทานครั้งละ ${dose} เม็ด `;
    if (meals && meals !== "-") description += meals;

    const medData = {
        name: drugName,
        desc: description,
        date: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})
    };

    const existingData = JSON.parse(localStorage.getItem('mySavedDrugs')) || [];
    existingData.push(medData);
    localStorage.setItem('mySavedDrugs', JSON.stringify(existingData));

    await showModal("สำเร็จ", "บันทึกข้อมูลลงประวัติสุขภาพเรียบร้อย!", "success");
    window.location.href = "profile.html";
}

// --- 6. Smart TTS ---
window.speakParsedResult = function() {
    synth.cancel();
    loadVoices();

    let name = document.getElementById('editDrugName').value;
    let dose = document.getElementById('editDose').value;
    let meals = document.getElementById('editMeals').value;

    let speechText = `ชื่อยา... ${name} . `;
    if (dose !== "-" && dose !== "") speechText += `รับประทาน... ครั้งละ ${dose} เม็ด . `;
    if (meals !== "-" && meals !== "") speechText += `${meals} .`; 

    const utterance = new SpeechSynthesisUtterance(speechText);
    const isThai = /[ก-๙]/.test(name);
    
    if (isThai) {
        const thaiVoice = voices.find(v => v.lang.includes('th'));
        if (thaiVoice) utterance.voice = thaiVoice;
        utterance.lang = 'th-TH';
    } else {
        const engVoice = voices.find(v => v.lang.includes('en'));
        if (engVoice) utterance.voice = engVoice;
        utterance.lang = 'en-US';
    }

    utterance.rate = 0.9; 
    utterance.volume = 1.0;
    
    synth.speak(utterance);
}
