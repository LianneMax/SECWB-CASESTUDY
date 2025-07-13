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

    // ========== MODAL ELEMENTS ==========
    var editProfileModal = document.getElementById("editProfileModal");
    var saveChangesModal = document.getElementById("saveChangesModal");
    var deleteAccountModal = document.getElementById("deleteAccountModal");
    var accountDeletedModal = document.getElementById("accountDeletedModal");
    var changePasswordModal = document.getElementById("changePasswordModal");
    var successChangesModal = document.getElementById("successChangesModal");

    var editProfileBtn = document.getElementById("editProfileBtn");
    var deleteAccountBtn = document.getElementById("deleteAccountBtn");
    var confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    var changePasswordBtn = document.getElementById("changePasswordBtn");
    var saveChangesBtn = document.getElementById("saveChanges");

    var cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    var goBackHomeBtn = document.getElementById("goBackHomeBtn");
    var goBackProfileBtn = document.getElementById("goBackProfileBtn");

    var closeEditProfileBtn = document.querySelector("#editProfileModal .close"); // X button for profile
    var closeDeleteAccount = document.querySelector("#deleteAccountModal .close");
    var closeSuccessChangesBtn = document.querySelector("#successChangesModal .close");
    var closeChangePasswordBtn = document.querySelector("#changePasswordModal .close");
    var closeSaveChangesBtn = document.querySelector("#saveChangesModal .close-confirm");

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

    // ========== OPEN MODALS ==========
    if (editProfileBtn && editProfileModal) {
        editProfileBtn.addEventListener("click", function () {
            editProfileModal.style.display = "flex"; // Show the modal
        });
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", function () {
            showModal(deleteAccountModal);
        });
    }

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener("click", function () {
            showModal(changePasswordModal);
        });
    }

    if (saveChangesBtn) {
        saveChangesBtn.addEventListener("click", function () {
            hideModal(editProfileModal);
            showModal(successChangesModal);
        });
    }

    // ========== CLOSE PROFILE WITH UNSAVED CHANGES ==========
    if (closeEditProfileBtn) {
        closeEditProfileBtn.addEventListener("click", function () {
            showModal(saveChangesModal); // Show "Save Changes Confirmation Modal"
        });
    }

    // ========== CONFIRM SAVE CHANGES ==========
    if (confirmSaveChangesBtn) {
        confirmSaveChangesBtn.addEventListener("click", function () {
            hideModal(saveChangesModal);
            hideModal(editProfileModal);
        });
    }

    // ========== DELETE ACCOUNT CONFIRMATION ==========
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", async function () {
            try {
                const response = await fetch("/deleteaccount", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });

                if (response.ok) {
                    hideModal(deleteAccountModal);
                    showModal(accountDeletedModal);
                } else {
                    console.error("⚠️ Error deleting account.");
                }

            } catch (error) {
                window.location.href = "/profile";
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
            window.location.href = "/";
        });
    }

    if (closeChangePasswordBtn) {
        closeChangePasswordBtn.addEventListener("click", function () {
            hideModal(changePasswordModal);
        });
    }

    if (submitPasswordBtn) {
        submitPasswordBtn.addEventListener("click", function () {
            hideModal(changePasswordModal);
            showModal(editProfileModal);
        });
    }

    if (closeSuccessChangesBtn) {
        closeSuccessChangesBtn.addEventListener("click", function () {
            hideModal(successChangesModal);
        });
    }

    if (goBackProfileBtn) {
        goBackProfileBtn.addEventListener("click", function () {
            hideModal(successChangesModal);
        });
    }

    // ========== CLOSE MODALS WHEN CLICKING OUTSIDE ==========
    window.addEventListener("click", function (event) {
        if (event.target === changePasswordModal) {
            hideModal(changePasswordModal);
        }
        if (event.target === successChangesModal) {
            hideModal(successChangesModal);
        }
        if (event.target === saveChangesModal) {
            hideModal(saveChangesModal);
        }
    });

// ========== DELETE ACCOUNT CONFIRMATION (FIXED) ==========
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async function () {
        try {
            const response = await fetch("/deleteaccount", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            if (response.ok) {
                hideModal(deleteAccountModal); // Close delete confirmation modal
                showModal(accountDeletedModal); // Show "Account Successfully Deleted" modal
            } else {
                console.error("⚠️ Error deleting account.");
            }

        } catch (error) {
            console.error("⚠️ Error deleting account:", error);
        }
    });
}

// ========== REDIRECT ONLY WHEN "GO BACK TO HOME PAGE" IS CLICKED ==========
if (goBackHomeBtn) {
    goBackHomeBtn.addEventListener("click", function () {
        window.location.href = "/"; // Redirect to home only when this button is clicked
    });
}
});

document.addEventListener("DOMContentLoaded", function () {
    var saveChangesBtn = document.getElementById("saveChanges");

    if (saveChangesBtn) {
        saveChangesBtn.addEventListener("click", async function () {
            const first_name = document.getElementById("first_name").value;
            const last_name = document.getElementById("last_name").value;
            const description = document.getElementById("description").value;

            try {
                const response = await fetch("/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ first_name, last_name, description })
                });

                const data = await response.json();

                if (data.success) {
                    alert("✅ Profile updated successfully!");
                    hideModal(editProfileModal);
                } else {
                    alert("❌ Error updating profile: " + data.message);
                }
            } catch (error) {
                console.error("⚠️ Error updating profile:", error);
                alert("⚠️ An error occurred. Please try again.");
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
    const profileInput = document.getElementById("profileInput");
    const editProfileModal = document.getElementById("editProfileModal");

    if (uploadPhotoBtn && profileInput) {
        // Clicking the button opens the file picker
        uploadPhotoBtn.addEventListener("click", function () {
            profileInput.click();
        });

        // When a file is selected, submit the form automatically
        profileInput.addEventListener("change", function () {
            if (profileInput.files.length > 0) {
                profileInput.closest("form").submit(); // Auto-submit form

                // Close modal after submitting
                if (editProfileModal) {
                    editProfileModal.style.display = "none";
                }
            }
        });
    }
});


