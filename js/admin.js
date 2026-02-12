// js/admin.js - Admin Logic
import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { checkAdminRole } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const isAdmin = await checkAdminRole(user);
            if (isAdmin) {
                loadUsers();
            } else {
                alert("ไม่มีสิทธิ์เข้าถึง");
                window.location.href = 'profile.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    });
});

async function loadUsers() {
    const userList = document.getElementById('userList');
    userList.innerHTML = '<p style="text-align: center; color: #888; margin-top: 20px;">กำลังโหลด...</p>';

    try {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            userList.innerHTML = '<p style="text-align: center; color: #888;">ไม่พบสมาชิก</p>';
            return;
        }

        let html = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const fullName = (data.firstName || "") + " " + (data.lastName || "");
            const roleClass = data.role === 'admin' ? 'role-admin' : 'role-user';
            const isSelf = auth.currentUser && auth.currentUser.uid === doc.id;
            
            html += `
                <div class="user-card">
                    <div class="user-info">
                        <div class="user-name">${fullName.trim() || 'No Name'}</div>
                        <div class="user-email">${data.email}</div>
                        <div class="user-role ${roleClass}">${data.role || 'user'}</div>
                    </div>
                    <div class="action-btn-group">
                        <button class="btn-icon btn-view" onclick="window.location.href='admin_user_drugs.html?uid=${doc.id}'" title="ดูยา">
                            <i class="fas fa-pills"></i>
                        </button>
                        
                        ${!isSelf ? `
                            ${data.role !== 'admin' ? 
                                `<button class="btn-icon btn-promote" onclick="toggleRole('${doc.id}', 'admin')" title="เสื่อนขั้น">
                                    <i class="fas fa-arrow-up"></i>
                                </button>` : 
                                `<button class="btn-icon btn-demote" onclick="toggleRole('${doc.id}', 'user')" title="ลดขั้น">
                                    <i class="fas fa-arrow-down"></i>
                                </button>`
                            }
                            <button class="btn-icon btn-delete" onclick="deleteUser('${doc.id}')" title="ลบ">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : '<span style="font-size:10px; color:#aaa;">(คุณ)</span>'}
                    </div>
                </div>
            `;
        });

        userList.innerHTML = html;

    } catch (error) {
        console.error("Error fetching users:", error);
        userList.innerHTML = `<p style="text-align: center; color: red;">โหลดข้อมูลไม่สำเร็จ: ${error.message}</p>`;
    }
}

// Global Functions for Actions

window.toggleRole = async (uid, newRole) => {
    if (!confirm(`ยืนยันการเปลียนสิทธิ์เป็น ${newRole}?`)) return;
    try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
        alert("เรียบร้อย!");
        loadUsers(); // Reload list
    } catch (e) {
        console.error("Error updating role:", e);
        alert("เกิดข้อผิดพลาด: " + e.message);
    }
};

window.deleteUser = async (uid) => {
    if (!confirm("ยืนยันการลบผู้ใช้งาน? (ไม่สามารถกู้คืนได้)")) return;
    try {
        await deleteDoc(doc(db, "users", uid));
        alert("ลบผู้ใช้งานเรียบร้อย");
        loadUsers(); // Reload list
    } catch (e) {
        console.error("Error deleting user:", e);
        alert("เกิดข้อผิดพลาด: " + e.message);
    }
};
