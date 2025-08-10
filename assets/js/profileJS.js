document.addEventListener("DOMContentLoaded", function () {

    // ========== Reservation Table Population ==========
    const currentTableBody = document.querySelector('#currentReservationsTable tbody');
    const recentTableBody = document.querySelector('#recentReservationsTable tbody');

    if (!currentTableBody || !recentTableBody) {
        console.error("Table body elements not found in DOM.");
        return;
    }

    // Function to generate time slots in 30-minute intervals
    function generateTimeSlots(startTime, endTime) {
        let slots = [];
        let current = new Date();
        current.setHours(startTime, 0, 0, 0); // Set start time
        let end = new Date();
        end.setHours(endTime, 0, 0, 0); // Set end time

        while (current < end) {
            let next = new Date(current);
            next.setMinutes(current.getMinutes() + 30);

            let startTimeStr = formatTime(current);
            let endTimeStr = formatTime(next);
            slots.push(`${startTimeStr} - ${endTimeStr}`);

            current = next;
        }
        return slots;
    }

    function formatTime(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    }

    const currentReservations = [
        { roomNumber: 'GK01', seatNumber: 'Seat #01', date: 'August 5, 2025', timeSlot: '8:00 AM - 8:30 AM' },
        { roomNumber: 'GK02', seatNumber: 'Seat #02', date: 'August 6, 2025', timeSlot: '9:30 AM - 10:00 AM' },
        { roomNumber: 'GK03', seatNumber: 'Seat #03', date: 'August 7, 2025', timeSlot: '11:00 AM - 11:30 AM' },
        { roomNumber: 'GK04', seatNumber: 'Seat #04', date: 'August 8, 2025', timeSlot: '2:30 PM - 3:00 PM' }
    ];

    function populateTable(data, tableBody, isCurrent) {
        tableBody.innerHTML = '';

        data.forEach(reservation => {
            const row = tableBody.insertRow();
            row.insertCell(0).innerText = reservation.roomNumber;
            row.insertCell(1).innerText = reservation.seatNumber;
            row.insertCell(2).innerText = reservation.date;
            row.insertCell(3).innerText = reservation.timeSlot;

            if (isCurrent) {
                const editCell = row.insertCell(4);
                const editButton = document.createElement('button');
                editButton.className = 'edit-button';
                editButton.innerText = 'Edit';
                editButton.onclick = function () {
                    window.location.href = 'Reservation.html';
                };
                editCell.appendChild(editButton);
            } else {
                row.insertCell(4).innerText = reservation.reservedBy;
            }
        });
    }
    // Populate tables dynamically
    populateTable(currentReservations, currentTableBody, true);
    populateTable(recentReservations, recentTableBody, false);
});

// to update the current reservations table body for the profile
document.addEventListener("DOMContentLoaded", async function () {
    const currentTableBody = document.querySelector('#currentReservationsTable tbody');

    if (!currentTableBody) {
        console.error("Current reservations table not found.");
        return;
    }

    async function fetchReservations() {
        try {
            const visitedEmail = new URLSearchParams(window.location.search).get("email");
            const response = await fetch(`/my-reservations?email=${visitedEmail || ""}`);
            const reservations = await response.json();

            currentTableBody.innerHTML = ''; // Clear existing table rows

            if (reservations.length === 0) {
                const row = currentTableBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 4;
                cell.innerText = "No reservations found.";
                cell.style.textAlign = "center";
                return;
            }

            reservations.forEach(reservation => {
                const row = currentTableBody.insertRow();
                row.insertCell(0).innerText = reservation.roomNumber;
                row.insertCell(1).innerText = reservation.seatNumber;
                row.insertCell(2).innerText = reservation.date;
                row.insertCell(3).innerText = reservation.time;
            });
        } catch (error) {
            console.error("Error fetching reservations:", error);
        }
    }

    fetchReservations();
});

document.addEventListener("DOMContentLoaded", function () {
    // Store original values when the modal opens
    let originalValues = {};
    
    // ========== MODAL ELEMENTS ==========
    var editProfileModal = document.getElementById("editProfileModal");
    var saveChangesModal = document.getElementById("saveChangesModal");
    var deleteAccountModal = document.getElementById("deleteAccountModal");
    var accountDeletedModal = document.getElementById("accountDeletedModal");
    var changePasswordModal = document.getElementById("changePasswordModal");
    var successChangesModal = document.getElementById("successChangesModal");
    var noChangesModal = document.getElementById("noChangesModal");

    var editProfileBtn = document.getElementById("editProfileBtn");
    var deleteAccountBtn = document.getElementById("deleteAccountBtn");
    var confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    var changePasswordBtn = document.getElementById("changePasswordBtn");
    var saveChangesBtn = document.getElementById("saveChanges");

    var cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    var goBackHomeBtn = document.getElementById("goBackHomeBtn");
    var goBackProfileBtn = document.getElementById("goBackProfileBtn");
    var okBtn = document.getElementById("okBtn");

    var closeEditProfileBtn = document.querySelector("#editProfileModal .close"); // X button for profile

    var closeEditProfileBtn = document.querySelector("#editProfileModal .close");
    var closeDeleteAccount = document.querySelector("#deleteAccountModal .close");
    var closeSuccessChangesBtn = document.querySelector("#successChangesModal .close");
    var closeChangePasswordBtn = document.querySelector("#changePasswordModal .close");
    var closeSaveChangesBtn = document.querySelector("#saveChangesModal .close-confirm");
    var closeNoChangesBtn = document.querySelector("#noChangesModal .close-no-changes");

    var cancelSaveChangesBtn = document.getElementById("cancelBtn");
    var confirmSaveChangesBtn = document.getElementById("leaveBtn");

    var submitPasswordBtn = document.querySelector(".change-submit-btn");

    // ========== SHOW & HIDE FUNCTIONS ==========
    function showModal(modal) {
        if (modal) modal.style.display = "flex";
    }

    function hideModal(modal) {
        if (modal) modal.style.display = "none";
    }

    // ========== STORE ORIGINAL VALUES ==========
    function storeOriginalValues() {
        const firstNameInput = document.querySelector('input[name="first_name"]');
        const lastNameInput = document.querySelector('input[name="last_name"]');
        const descriptionInput = document.querySelector('textarea[name="description"]');
        
        originalValues = {
            first_name: firstNameInput ? (firstNameInput.placeholder || '').trim() : '',
            last_name: lastNameInput ? (lastNameInput.placeholder || '').trim() : '',
            description: descriptionInput ? (descriptionInput.placeholder || '').trim() : ''
        };
        
        console.log("Original values stored:", originalValues);
    }

    // ========== CHECK FOR CHANGES ==========
    function hasChanges() {
        const firstNameInput = document.querySelector('input[name="first_name"]');
        const lastNameInput = document.querySelector('input[name="last_name"]');
        const descriptionInput = document.querySelector('textarea[name="description"]');
        
        const currentValues = {
            first_name: firstNameInput ? firstNameInput.value.trim() : '',
            last_name: lastNameInput ? lastNameInput.value.trim() : '',
            description: descriptionInput ? descriptionInput.value.trim() : ''
        };

        console.log("Current values:", currentValues);
        console.log("Original values:", originalValues);

        // A change is detected if:
        // 1. The input has a non-empty value AND
        // 2. That value is different from the original placeholder value
        const hasFirstNameChange = currentValues.first_name !== '' && 
                                currentValues.first_name !== originalValues.first_name;
        const hasLastNameChange = currentValues.last_name !== '' && 
                                currentValues.last_name !== originalValues.last_name;
        const hasDescriptionChange = currentValues.description !== '' && 
                                    currentValues.description !== originalValues.description;

        const changes = {
            firstNameChanged: hasFirstNameChange,
            lastNameChanged: hasLastNameChange,
            descriptionChanged: hasDescriptionChange
        };

        console.log("Changes detected:", changes);

        const hasAnyChanges = hasFirstNameChange || hasLastNameChange || hasDescriptionChange;
        console.log("Has any changes:", hasAnyChanges);

        return hasAnyChanges;
    }

    // ========== CLEAR FORM INPUTS ==========
    function clearFormInputs() {
        const firstNameInput = document.querySelector('input[name="first_name"]');
        const lastNameInput = document.querySelector('input[name="last_name"]');
        const descriptionInput = document.querySelector('textarea[name="description"]');
        
        if (firstNameInput) firstNameInput.value = '';
        if (lastNameInput) lastNameInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
    }

    // ========== CLEAR PASSWORD FORM INPUTS ==========
    function clearPasswordInputs() {
        const currentPasswordInput = document.getElementById("current-password");
        const newPasswordInput = document.getElementById("new-password");
        const confirmPasswordInput = document.getElementById("confirm-password");
        
        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
    }

    // ========== UPDATE DISPLAYED VALUES ==========
    function updateDisplayedValues(firstName, lastName, description) {
        // Update the profile name display in header
        const profileNameElement = document.querySelector('.profile-name');
        if (profileNameElement && (firstName || lastName)) {
            const currentNameParts = profileNameElement.textContent.trim().split(' ');
            const newFirstName = firstName || currentNameParts[0] || '';
            const newLastName = lastName || currentNameParts.slice(1).join(' ') || '';
            profileNameElement.textContent = `${newFirstName} ${newLastName}`.trim();
        }

        // Update the modal profile name
        const modalProfileName = document.querySelector('.profile-text h3');
        if (modalProfileName && (firstName || lastName)) {
            const currentNameParts = modalProfileName.textContent.trim().split(' ');
            const newFirstName = firstName || currentNameParts[0] || '';
            const newLastName = lastName || currentNameParts.slice(1).join(' ') || '';
            modalProfileName.textContent = `${newFirstName} ${newLastName}`.trim();
        }

        // Update the description display
        const subsections = document.querySelectorAll('.subsection-container');
        subsections.forEach(section => {
            const title = section.querySelector('.subsection-title');
            if (title && title.textContent.trim() === 'Description') {
                const content = section.querySelector('.subsection-content');
                if (content && description) {
                    content.textContent = description;
                }
            }
        });

        // Update placeholders for future edits
        const firstNameInput = document.querySelector('input[name="first_name"]');
        const lastNameInput = document.querySelector('input[name="last_name"]');
        const descriptionInput = document.querySelector('textarea[name="description"]');
        
        if (firstName && firstNameInput) firstNameInput.placeholder = firstName;
        if (lastName && lastNameInput) lastNameInput.placeholder = lastName;
        if (description && descriptionInput) descriptionInput.placeholder = description;
    }

    // ========== OPEN MODALS ==========
    if (editProfileBtn && editProfileModal) {
        editProfileBtn.addEventListener("click", function () {
            editProfileModal.style.display = "flex";
            storeOriginalValues(); // Store original values when modal opens
            clearFormInputs(); // Clear any previous input values
        });
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", function () {
            showModal(deleteAccountModal);
        });
    }

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener("click", function () {
            clearPasswordInputs(); // Clear password inputs when opening modal
            showModal(changePasswordModal);
        });
    }

    // ========== ENHANCED SAVE CHANGES ==========
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener("click", async function (event) {
            event.preventDefault(); // Prevent default form submission
            
            console.log("Save changes button clicked");
            
            // Check if there are any changes
            if (!hasChanges()) {
                console.log("No changes detected, showing no changes modal");
                showModal(noChangesModal);
                return;
            }

            console.log("Changes detected, proceeding with save");

            const firstNameInput = document.querySelector('input[name="first_name"]');
            const lastNameInput = document.querySelector('input[name="last_name"]');
            const descriptionInput = document.querySelector('textarea[name="description"]');

            const first_name = firstNameInput ? firstNameInput.value.trim() : '';
            const last_name = lastNameInput ? lastNameInput.value.trim() : '';
            const description = descriptionInput ? descriptionInput.value.trim() : '';

            try {
                const response = await fetch("/submit-profile-details", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ first_name, last_name, description })
                });

                const data = await response.json();

                if (data.success) {
                    console.log("Profile updated successfully");
                    hideModal(editProfileModal);
                    showModal(successChangesModal);
                    
                    // Update the displayed values on the page
                    updateDisplayedValues(first_name, last_name, description);
                    
                    // Clear form inputs after successful save
                    clearFormInputs();
                } else {
                    console.error("Error updating profile:", data.message);
                    alert("Error updating profile: " + (data.message || "Unknown error."));
                }
            } catch (error) {
                console.error("Error updating profile:", error);
                alert("An error occurred. Please try again.");
            }
        });
    }

    // ========== ENHANCED CHANGE PASSWORD HANDLER ==========
    if (submitPasswordBtn) {
        submitPasswordBtn.addEventListener("click", async function (event) {
            event.preventDefault(); // Prevent default form submission
            
            const currentPasswordInput = document.getElementById("current-password");
            const newPasswordInput = document.getElementById("new-password");
            const confirmPasswordInput = document.getElementById("confirm-password");
            
            const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
            const newPassword = newPasswordInput ? newPasswordInput.value : '';
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
            
            // Basic validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                alert("Please fill in all password fields.");
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert("New password and confirmation password do not match.");
                return;
            }
            
            if (newPassword.length < 6) {
                alert("New password must be at least 6 characters long.");
                return;
            }

            try {
                const response = await fetch("/changepassword", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                        confirmPassword
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    console.log("Password changed successfully");
                    
                    // Hide change password modal
                    hideModal(changePasswordModal);
                    
                    // Clear password inputs
                    clearPasswordInputs();
                    
                    // Show account deleted modal (reusing for success message)
                    // Update the modal content for password change success
                    const accountDeletedModalTitle = accountDeletedModal.querySelector('h2');
                    const accountDeletedModalMessage = accountDeletedModal.querySelector('p');
                    const goBackHomeButton = accountDeletedModal.querySelector('#goBackHomeBtn');
                    
                    if (accountDeletedModalTitle) {
                        accountDeletedModalTitle.textContent = "Password Changed Successfully";
                    }
                    if (accountDeletedModalMessage) {
                        accountDeletedModalMessage.innerHTML = 'Your password has been updated successfully!<br>You will be redirected to the home page.';
                    }
                    if (goBackHomeButton) {
                        goBackHomeButton.textContent = "Go to Home Page";
                    }
                    
                    showModal(accountDeletedModal);
                    
                } else {
                    console.error("Password change failed:", data.message);
                    
                    // Check if it's an authentication error that should log out the user
                    if (response.status === 401 || data.message?.toLowerCase().includes('invalid') || 
                        data.message?.toLowerCase().includes('incorrect') || data.message?.toLowerCase().includes('wrong')) {
                        
                        alert("Invalid current password. For security reasons, you will be logged out.");
                        
                        // Clear password inputs
                        clearPasswordInputs();
                        
                        // Hide the modal
                        hideModal(changePasswordModal);
                        
                        // Redirect to logout or home page after a brief delay
                        setTimeout(() => {
                            window.location.href = "/logout";
                        }, 2000);
                        
                    } else {
                        alert("Error changing password: " + (data.message || "Please try again."));
                    }
                }
            } catch (error) {
                console.error("Error changing password:", error);
                alert("A network error occurred. Please check your connection and try again.");
            }
        });
    }

    // ========== NO CHANGES MODAL HANDLERS ==========
    if (okBtn) {
        okBtn.addEventListener("click", function () {
            hideModal(noChangesModal);
        });
    }

    if (closeNoChangesBtn) {
        closeNoChangesBtn.addEventListener("click", function () {
            hideModal(noChangesModal);
        });
    }

    // ========== CLOSE PROFILE WITH UNSAVED CHANGES ==========
    if (closeEditProfileBtn) {
        closeEditProfileBtn.addEventListener("click", function () {
            if (hasChanges()) {
                showModal(saveChangesModal);
            } else {
                hideModal(editProfileModal);
                clearFormInputs();
            }
        });
    }

    // ========== CONFIRM SAVE CHANGES ==========
    if (confirmSaveChangesBtn) {
        confirmSaveChangesBtn.addEventListener("click", function () {
            hideModal(saveChangesModal);
            hideModal(editProfileModal);
            clearFormInputs();
        });
    }

    // ========== DELETE ACCOUNT CONFIRMATION ==========
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", async function (event) {
            event.preventDefault(); // Prevent default form submission
            
            const currentPasswordInput = document.getElementById("delete-current-password");
            const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
            
            // Basic validation
            if (!currentPassword) {
                alert("Please enter your current password to delete your account.");
                return;
            }
            
            try {
                const response = await fetch("/deleteaccount", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ currentPassword })
                });

                // Check if we got a response
                if (!response.ok) {
                    // Handle HTTP error status codes
                    let errorMessage = "Unknown error occurred";
                    
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (jsonError) {
                        // If we can't parse JSON, use status text
                        errorMessage = response.statusText || `HTTP ${response.status}`;
                    }
                    
                    // Check if it's an authentication error (wrong password)
                    if (response.status === 401 || response.status === 403 || 
                        errorMessage.toLowerCase().includes('invalid') || 
                        errorMessage.toLowerCase().includes('incorrect') || 
                        errorMessage.toLowerCase().includes('wrong') ||
                        errorMessage.toLowerCase().includes('password')) {
                        
                        console.log("Authentication failed - wrong password");
                        
                        // Clear the password input
                        if (currentPasswordInput) currentPasswordInput.value = '';
                        
                        // Hide the modal first
                        hideModal(deleteAccountModal);
                        
                        // Show alert with specific message and then logout
                        alert("Password is wrong. Log in again to retry.");
                        
                        // Immediate redirect to logout which should go to index
                        window.location.href = "/logout";
                        return;
                    } else {
                        // For other HTTP errors, show the error message
                        alert("Error deleting account: " + errorMessage);
                        if (currentPasswordInput) currentPasswordInput.value = '';
                        return;
                    }
                }

                // If we get here, response was OK, try to parse JSON
                const data = await response.json();

                // Check if the server response indicates success based on the message content
                const isSuccess = data.message && data.message.toLowerCase().includes('deleted successfully');

                if (isSuccess) {
                    console.log("Account deleted successfully");
                    
                    // Clear the password input
                    if (currentPasswordInput) currentPasswordInput.value = '';
                    
                    // Hide delete account modal
                    hideModal(deleteAccountModal);
                    
                    // Ensure the success modal has the correct content
                    const accountDeletedModalTitle = accountDeletedModal.querySelector('h2');
                    const accountDeletedModalMessage = accountDeletedModal.querySelector('p');
                    const goBackHomeButton = accountDeletedModal.querySelector('#goBackHomeBtn');
                    
                    if (accountDeletedModalTitle) {
                        accountDeletedModalTitle.textContent = "Account Successfully Deleted";
                    }
                    if (accountDeletedModalMessage) {
                        accountDeletedModalMessage.innerHTML = 'Thank you for using <span style="color: #377684; font-weight: bold;">Labyrinth</span>!';
                    }
                    if (goBackHomeButton) {
                        goBackHomeButton.textContent = "Go Back to Home Page";
                    }
                    
                    // Show success modal
                    showModal(accountDeletedModal);
                    
                } else {
                    // Server returned OK but indicates failure in the message
                    console.error("Account deletion failed:", data.message);
                    alert("Error deleting account: " + (data.message || "Please try again."));
                    if (currentPasswordInput) currentPasswordInput.value = '';
                }

            } catch (error) {
                console.error("Network error deleting account:", error);
                
                // This is a true network error (connection failed, etc.)
                alert("A network error occurred. Please check your connection and try again.");
                
                // Clear the password field for security
                if (currentPasswordInput) currentPasswordInput.value = '';
            }
        });
    }

    // ========== CLOSE MODALS ==========
    if (closeDeleteAccount) {
        closeDeleteAccount.addEventListener("click", function () {
            hideModal(deleteAccountModal);
        });
    }

    if (closeSaveChangesBtn) {
        closeSaveChangesBtn.addEventListener("click", function () {
            hideModal(saveChangesModal);
        });
    }

    if (cancelSaveChangesBtn) {
        cancelSaveChangesBtn.addEventListener("click", function () {
            hideModal(saveChangesModal);
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener("click", function () {
            hideModal(deleteAccountModal);
        });
    }

    if (goBackHomeBtn) {
        goBackHomeBtn.addEventListener("click", function () {
            // Check if this is being used for account deletion success
            const modalTitle = accountDeletedModal.querySelector('h2');
            if (modalTitle && modalTitle.textContent === "Account Successfully Deleted") {
                // Account was deleted, so logout the user
                window.location.href = "/logout";
            } else {
                // For other cases (like password change), just go home
                window.location.href = "/";
            }
        });
    }

    if (closeChangePasswordBtn) {
        closeChangePasswordBtn.addEventListener("click", function () {
            clearPasswordInputs(); // Clear inputs when closing
            hideModal(changePasswordModal);
        });
    }

    if (closeSuccessChangesBtn) {
        closeSuccessChangesBtn.addEventListener("click", function () {
            hideModal(successChangesModal);
            // Optionally reload the page to show updated data
            window.location.reload();
        });
    }

    if (goBackProfileBtn) {
        goBackProfileBtn.addEventListener("click", function () {
            hideModal(successChangesModal);
            // Optionally reload the page to show updated data
            window.location.reload();
        });
    }

    // ========== CLOSE MODALS WHEN CLICKING OUTSIDE ==========
    window.addEventListener("click", function (event) {
        if (event.target === changePasswordModal) {
            clearPasswordInputs(); // Clear inputs when clicking outside
            hideModal(changePasswordModal);
        }
        if (event.target === successChangesModal) {
            hideModal(successChangesModal);
        }
        if (event.target === saveChangesModal) {
            hideModal(saveChangesModal);
        }
        if (event.target === noChangesModal) {
            hideModal(noChangesModal);
        }
        if (event.target === editProfileModal) {
            if (hasChanges()) {
                showModal(saveChangesModal);
            } else {
                hideModal(editProfileModal);
                clearFormInputs();
            }
        }
    });
});

// ========== UPLOAD PHOTO FUNCTIONALITY ==========
document.addEventListener("DOMContentLoaded", function () {
    const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
    const profileInput = document.getElementById("profileInput");
    const editProfileModal = document.getElementById("editProfileModal");

    if (uploadPhotoBtn && profileInput) {
        uploadPhotoBtn.addEventListener("click", function () {
            profileInput.click();
        });

        profileInput.addEventListener("change", function () {
            if (profileInput.files.length > 0) {
                profileInput.closest("form").submit();

                if (editProfileModal) {
                    editProfileModal.style.display = "none";
                }
            }
        });
    }
});