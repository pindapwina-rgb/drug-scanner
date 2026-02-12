// js/modal.js

// Function to create and show the modal
export function showModal(title, message, type = 'info') {
    return new Promise((resolve) => {
        // Remove existing modal if any
        const existingModal = document.querySelector('.custom-modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        // Determine Icon and Color based on Type
        let iconClass = 'fa-info-circle';
        let colorClass = 'modal-info';
        let btnClass = 'btn-save'; // Default Teal
        
        if (type === 'success') {
            iconClass = 'fa-check-circle';
            colorClass = 'modal-success';
            btnClass = 'btn-save';
        } else if (type === 'error') {
            iconClass = 'fa-times-circle';
            colorClass = 'modal-error';
            btnClass = 'btn-close';
        }

        // Create Modal HTML
        const modalHTML = `
            <div class="custom-modal-overlay">
                <div class="custom-modal-card">
                    <div class="modal-icon ${colorClass}">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="modal-title">${title}</div>
                    <div class="modal-message">${message}</div>
                    <button class="btn ${btnClass} modal-btn">ตกลง</button>
                </div>
            </div>
        `;

        // Inject into DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Animation
        const overlay = document.querySelector('.custom-modal-overlay');
        const card = document.querySelector('.custom-modal-card');
        
        // Force Reflow for transition
        void overlay.offsetWidth; 
        overlay.classList.add('active');
        card.classList.add('active');

        // Handle Close
        const closeBtn = overlay.querySelector('.modal-btn');
        const close = () => {
            overlay.classList.remove('active');
            card.classList.remove('active');
            setTimeout(() => {
                if(overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                resolve();
            }, 300); // Match CSS transition
        };

        closeBtn.addEventListener('click', close);
        // Optional: Close on backdrop click
        // overlay.addEventListener('click', (e) => {
        //     if (e.target === overlay) close();
        // });
    });
}
