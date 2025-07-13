class ModalHandler {
    constructor(modalId, closeBtnId) {
        this.modal = document.getElementById(modalId);
        this.closeBtn = document.getElementById(closeBtnId);

        if (!this.modal) {
            console.error(`Modal with ID '${modalId}' not found.`);
            return;
        }

        this.modal.style.display = "none"; // Hide on load

        // Close modal when clicking the close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener("click", () => this.close());
        }

        // Prevent clicking inside the modal from closing it
        this.modal.querySelector(".modal-content")?.addEventListener("click", (event) => {
            event.stopPropagation();
        });

        // Close modal when clicking outside of it
        this.modal.addEventListener("click", (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        });
    }

    open() {
        if (this.modal) {
            console.log(`Opening modal: ${this.modal.id}`);
            this.modal.style.display = "flex";
        }
    }

    close() {
        if (this.modal) {
            console.log(`Closing modal: ${this.modal.id}`);
            this.modal.style.display = "none";
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // Initialize modals
    const forgotPasswordModal = new ModalHandler("forgot-password-modal", "close-forgot");
    const changePasswordModal = new ModalHandler("change-password-modal", "close-change-password");
    const incorrectPasswordModal = new ModalHandler("incorrect-password-modal", "close-incorrect");

    // Get form elements
    const loginForm = document.getElementById("login-form");
    const forgotPasswordLink = document.getElementById("forgot-password-link");
    const backToLogin = document.getElementById("back-to-login");
    const closeChangePasswordBtn = document.querySelector(".close-change-password");
    const changePasswordForm = document.getElementById('change-password-form');

    // Store email for password reset
    let resetEmail = '';

    // Handle login form submission
    loginForm?.addEventListener("submit", async function (event) {
        event.preventDefault();
    
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const rememberMe = document.querySelector('input[name="rememberMe"]')?.checked || false;
    
        if (!email || !password) {
            incorrectPasswordModal.open();
            return;
        }
    
        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password, rememberMe })
            });
    
            const data = await response.json();

            if (data.success) {
                console.log("✅ Login successful. Redirecting to:", data.redirect);
                window.location.href = data.redirect;
            } else {
                console.warn("⚠️ Login failed:", data.message);
                incorrectPasswordModal.open();
            }
        } catch (error) {
            console.error("❌ Error:", error);
            incorrectPasswordModal.open();
        }
    });

    // Handle forgot password flow
    forgotPasswordLink?.addEventListener('click', async (e) => {
        e.preventDefault();
        forgotPasswordModal.open();
    
        // ✅ Reset overlay text for the email step
        document.querySelector('.overlay-text').textContent = "Please enter your email address to reset your password";
    
        document.querySelector('.forgot-form-container').innerHTML = `
            <div class="input-group">
                <label class="static-label" for="recovery-email">DLSU Email</label>
                <input type="email" id="recovery-email" class="static-input" placeholder="example_name@dlsu.edu.ph">
            </div>
            <button id="verify-email" class="submit-btn">Next</button>
            <a href="#" id="back-to-login" class="back-link">Back to Login</a>
        `;
    
        document.getElementById('verify-email')?.addEventListener('click', verifyEmail);
    });

    // Handle forgot password link in incorrect password modal
    document.getElementById('forgot-password-link-modal')?.addEventListener('click', (e) => {
        e.preventDefault();
        incorrectPasswordModal.close();
        forgotPasswordModal.open();

        document.querySelector('.forgot-form-container').innerHTML = `
            <div class="input-group">
                <label class="static-label" for="recovery-email">DLSU Email</label>
                <input type="email" id="recovery-email" class="static-input" placeholder="example_name@dlsu.edu.ph">
            </div>
            <button id="verify-email" class="submit-btn">Next</button>
            <a href="#" id="back-to-login" class="back-link">Back to Login</a>
        `;

        document.getElementById('verify-email')?.addEventListener('click', verifyEmail);
    });

    // Email verification handler
    async function verifyEmail() {
        const email = document.getElementById('recovery-email').value;
        
        try {
            const response = await fetch('/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                resetEmail = email; // Store email for password reset
                showSecurityQuestion(data.question);
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('❌ Error:', error);
            alert('An error occurred. Please try again.');
        }
    }

    function showSecurityQuestion(question) {
        const overlayText = document.querySelector('.overlay-text');
        if (overlayText) {
            overlayText.textContent = "Answer the Security Question";
        }
    
        // Replace form content with security question UI
        document.querySelector('.forgot-form-container').innerHTML = `

            <p>${question}<br></br></p>
            <div class="input-group">
                <label class="static-label" for="security-answer">Your Answer</label>
                <input type="text" id="security-answer" class="static-input">
            </div>
            <button id="verify-answer" class="submit-btn">Verify</button>
        `;
    
        document.getElementById('verify-answer')?.addEventListener('click', verifySecurityAnswer);
    }

    // Security answer verification handler
    // Update the security answer verification handler
async function verifySecurityAnswer() {
    const answer = document.getElementById('security-answer').value;
    
    try {
        const verifyResponse = await fetch('/verify-security-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: resetEmail, 
                answer 
            })
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
            forgotPasswordModal.close();
            changePasswordModal.open();
            
            // Add event listener for password change form
            const changePasswordForm = document.getElementById('change-password-form');
            if (changePasswordForm) {
                changePasswordForm.addEventListener('submit', handlePasswordChange);
            }
        } else {
            alert('Incorrect answer. Please try again.');
        }
    } catch (error) {
        console.error('❌ Error verifying answer:', error);
        alert('Failed to verify answer. Please try again.');
    }
}

// Separate function to handle password change
async function handlePasswordChange(e) {
    e.preventDefault();
    console.log('Password change form submitted');

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!newPassword || !confirmPassword) {
        alert('Please fill in both password fields');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    try {
        const changeResponse = await fetch('/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: resetEmail, 
                newPassword 
            })
        });

        const changeData = await changeResponse.json();

        if (changeData.success) {
            alert('Password changed successfully!');
            changePasswordModal.close();
            window.location.href = '/login';
        } else {
            alert(changeData.message || 'Failed to change password');
        }
    } catch (error) {
        console.error('❌ Error changing password:', error);
        alert('Failed to change password. Please try again.');
    }
}

    // Handle back to login
    backToLogin?.addEventListener("click", (event) => {
        event.preventDefault();
        forgotPasswordModal.close();
    });

    // Handle close change password modal
    closeChangePasswordBtn?.addEventListener("click", () => {
        changePasswordModal.close();
    });
});