// js/scanner.js - Handles Camera, OCR, and TTS

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
function grantPermission() {
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
            alert("ไม่สามารถเปิดกล้องได้: " + err2.message); 
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
function takeSnapshot() {
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

    // Pre-process Image (Binarization)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const color = avg > 100 ? 255 : 0; // Simple Threshold
        data[i] = data[i + 1] = data[i + 2] = color;
    }
    ctx.putImageData(imageData, 0, 0);

    // OCR with Tesseract
    canvas.toBlob((blob) => {
        Tesseract.recognize(blob, 'tha+eng', {
            tessedit_char_whitelist: '0123456789กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลวศษสหฬอฮฯะัาำิีึืฺุูเแโใไๅๆ็่้๊๋์abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,:/()%+- ',
            tessedit_pageseg_mode: '6'
        }).then(({ data: { text } }) => {
            document.getElementById('loadingScreen').classList.remove('active');
            parseDrugText(text);
        }).catch(err => {
            document.getElementById('loadingScreen').classList.remove('active');
            alert("เกิดข้อผิดพลาดในการอ่าน: " + err);
            video.play();
        });
    });
}

// --- 5. Data Parsing ---
function cleanGibberish(text) {
    const lines = text.split('\n').filter(line => {
        const cleanLine = line.trim();
        return cleanLine.length > 2;
    });
    return lines.join('\n').replace(/[^ก-๙a-zA-Z0-9\s\.\,\(\)\/\-\%]/g, ' ');
}

function parseDrugText(rawText) {
    const cleanedText = cleanGibberish(rawText);
    document.getElementById('rawText').value = cleanedText;

    const fullText = cleanedText.replace(/\s+/g, ' '); 
    
    let name = "";
    let dose = "-"; 
    let meals = "";

    // 1. Name Strategy
    if (!name) {
        const lines = cleanedText.split('\n');
        const potentialName = lines.find(l => l.length > 4 && !l.match(/^[0-9\s\.]+$/)); 
        name = potentialName ? potentialName.trim() : "ไม่พบชื่อยา";
    }

    // 2. Dose Strategy
    const doseMatch = fullText.match(/(รับประทาน|กิน|ทาน|ครั้งละ)\s*(\d+)\s*(เม็ด|แคปซูล)/);
    if (doseMatch) dose = doseMatch[2];

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

function closeModal() {
    document.getElementById('resultModal').classList.remove('active');
    synth.cancel();
    video.play();
}

function saveData() {
    const drugName = document.getElementById('editDrugName').value;
    const dose = document.getElementById('editDose').value;
    const meals = document.getElementById('editMeals').value;

    if (!drugName) { alert("กรุณาระบุชื่อยา"); return; }

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

    alert("✅ บันทึกข้อมูลลงประวัติสุขภาพเรียบร้อย!");
    window.location.href = "profile.html";
}

// --- 6. Smart TTS ---
function speakParsedResult() {
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
