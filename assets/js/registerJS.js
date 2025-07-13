class ModalHandler {
    constructor(modalId, closeBtnId = null) {
        this.modal = document.getElementById(modalId);
        this.closeBtn = closeBtnId ? document.getElementById(closeBtnId) : null;

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
        this.modal.querySelector(".modal-content").addEventListener("click", (event) => {
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

// Initialize success modal
const successModal = new ModalHandler("successModal");

// Ensure elements exist before adding event listeners
document.addEventListener("DOMContentLoaded", function () {
    const createAccountButton = document.querySelector(".create-button");
    const getStartedButton = document.getElementById("getStartedButton");
    const registrationForm = document.getElementById("registrationForm");

    // Handle form submission
    // Update the form submission handler in registerJS.js
    if (createAccountButton) {
        createAccountButton.addEventListener("click", async function (event) {
            event.preventDefault();

            const formData = new FormData(registrationForm);
            const data = {
                first_name: formData.get("first_name")?.trim(),
                last_name: formData.get("last_name")?.trim(),
                email: formData.get("email")?.trim(),
                password: formData.get("password")?.trim(),
                account_type: "Student",
                security_question: formData.get("security_question")?.trim(),
                security_answer: formData.get("security_answer")?.trim()
            };

            const hasMissingFields = Object.values(data).some(value => !value);
            if (hasMissingFields) {
                alert("⚠️ Missing input. Please fill in all required fields.");
                return;
            }

            // Check if email contains @dlsu.edu.ph
            if (!data.email.endsWith("@dlsu.edu.ph")) {
                alert("⚠️ Email must be a valid DLSU email ending with @dlsu.edu.ph.");
                return;
            }

            try {
                const response = await fetch("/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    successModal.open();
                } else {
                    const msg = result.message?.toLowerCase() || "";

                    if (msg.includes("already exists") || msg.includes("duplicate")) {
                        alert("⚠️ This account already exists. Please try logging in.");
                    } else if (msg.includes("missing input")) {
                        alert("⚠️ Please complete all required fields.");
                    } else {
                        alert(result.message || "⚠️ An unexpected error occurred. Please try again.");
                    }
                }
            } catch (error) {
                console.error("❌ Registration error:", error);
                alert("An internal server error occurred. Please try again later.");
            }
        });
    }
    

    // "Get Started" closes the modal and redirects to /login
    if (getStartedButton) {
        getStartedButton.addEventListener("click", function () {
            successModal.close(); // Close the modal first
            window.location.href = "/login"; // Then redirect
        });
    }
});