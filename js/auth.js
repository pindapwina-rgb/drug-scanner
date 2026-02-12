// js/auth.js
import { auth, db } from "./firebase-config.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showModal } from "./modal.js";

// --- Register Function ---
export async function registerUser(email, password, userData) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create User Document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: email,
            role: "user", // Default role
            firstName: userData.firstName,
            lastName: userData.lastName,
            createdAt: new Date()
        });

        await showModal("สำเร็จ", "สมัครสมาชิกเรียบร้อยแล้ว", "success");
        window.location.href = "profile.html";
    } catch (error) {
        console.error("Registration Error:", error);
        await showModal("เกิดข้อผิดพลาด", error.message, "error");
    }
}

// --- Login Function ---
export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        await showModal("ยินดีต้อนรับ", "เข้าสู่ระบบสำเร็จ!", "success");
        window.location.href = "profile.html";
    } catch (error) {
        console.error("Login Error:", error);
        await showModal("เข้าสู่ระบบไม่สำเร็จ", "อีเมลหรือรหัสผ่านไม่ถูกต้อง", "error");
    }
}

// --- Logout Function ---
export async function logoutUser() {
    try {
        await signOut(auth);
        // await showModal("แจ้งเตือน", "ออกจากระบบแล้ว", "info"); // Optional: Might be too annoying
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout Error:", error);
    }
}


// --- Check Auth State ---
export function checkAuthState(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Get extra user data (role) from Firestore
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                callback(user, docSnap.data());
            } else {
                callback(user, null);
            }
        } else {
            callback(null, null);
        }
    });
}
// --- Admin Check ---
export async function checkAdminRole(user) {
    if (!user) return false;
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().role === 'admin') {
            return true;
        }
    } catch (e) {
        console.error("Role Check Error:", e);
    }
    return false;
}
