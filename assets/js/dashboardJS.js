document.addEventListener("DOMContentLoaded", function () {
    console.log("📌 Dashboard script loaded successfully.");

    const currentTableBody = document.querySelector("#currentReservationsTable tbody");
    const editDateInput = document.querySelector("#edit-date");
    const editTimeDropdown = document.querySelector("#edit-time");

    if (!currentTableBody) {
        console.error("❌ Current reservations table not found.");
        return;
    }

    let reservations = []; // Store reservations data
    let currentUser = null; // Store current user data

    // Fetch current user data
    async function fetchCurrentUser() {
        try {
            const response = await fetch("/get-current-user");
            currentUser = await response.json();
            console.log("👤 Current user loaded:", currentUser);
        } catch (error) {
            console.error("⚠️ Error fetching current user:", error);
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }

    function formatTime(timeString) {
        const [hour, minute] = timeString.split(":").map(Number);
        const date = new Date();
        date.setHours(hour, minute, 0);

        let hours = date.getHours();
        let minutes = date.getMinutes();
        let ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        minutes = minutes < 10 ? "0" + minutes : minutes;

        return `${hours}:${minutes} ${ampm}`;
    }

    function generateTimeSlot(startTime) {
        const [hour, minute] = startTime.split(":").map(Number);
        const startDate = new Date();
        startDate.setHours(hour, minute, 0);

        let endDate = new Date(startDate);
        endDate.setMinutes(startDate.getMinutes() + 30);

        return `${formatTime(startTime)} - ${formatTime(`${endDate.getHours()}:${endDate.getMinutes()}`)}`;
    }

    function fetchUserReservations() {
        console.log("🔄 Fetching user reservations...");

        fetch("/my-reservations")
            .then(response => response.json())
            .then(data => {
                console.log("📥 Reservations received from server:", data);
                reservations = data; // Store the data

                currentTableBody.innerHTML = ""; // Clear existing rows
                if (data.length === 0) {
                    currentTableBody.innerHTML = `<tr><td colspan="5">No reservations found.</td></tr>`;
                    return;
                }

                const today = new Date().toISOString().split('T')[0];

                const futureReservations = data.filter(reservation => {
                    const reservationDate = new Date(reservation.date).toISOString().split('T')[0];
                    return reservationDate >= today;
                });

                if (futureReservations.length === 0) {
                    currentTableBody.innerHTML = `<tr><td colspan="5">No upcoming reservations.</td></tr>`;
                    return;
                }

                renderTable(futureReservations);
                console.log("✅ Reservations successfully displayed.");
            })
            .catch(error => {
                console.error("⚠️ Error fetching reservations:", error);
            });
    }

    function renderTable(futureReservations) {
        futureReservations.forEach((reservation, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${reservation.roomNumber}</td>
                <td>${reservation.seatNumber}</td>
                <td>${formatDate(reservation.date)}</td>
                <td>${generateTimeSlot(reservation.time)}</td>
                <td class="button-container">
                    <button class="editButton" data-reservation-id="${reservation.id}">Edit</button>
                    <button class="deleteButton" data-reservation-id="${reservation.id}">Delete</button>
                </td>
            `;
            currentTableBody.appendChild(row);
        });

        // Attach event listeners to delete buttons
        document.querySelectorAll(".deleteButton").forEach(button => {
            button.addEventListener("click", function () {
                const reservationId = this.getAttribute("data-reservation-id");
                console.log("Delete button clicked for reservation ID:", reservationId);
                if (reservationId) {
                    showDeleteConfirmation(reservationId);
                } else {
                    console.error("⚠️ Reservation ID not found.");
                }
            });
        });

        // Attach event listeners to edit buttons
        document.querySelectorAll(".editButton").forEach(button => {
            button.addEventListener("click", function () {
                const reservationId = this.getAttribute("data-reservation-id");
                console.log("Edit button clicked for reservation ID:", reservationId);
                if (reservationId) {
                    const reservation = reservations.find(res => res.id === reservationId);
                    if (reservation) {
                        showEditOverlay(reservation);
                    }
                } else {
                    console.error("⚠️ Reservation ID not found.");
                }
            });
        });
    }

    // Show the delete confirmation modal
    function showDeleteConfirmation(reservationId) {
        console.log("🗑️ Showing delete confirmation for reservation ID:", reservationId);
        
        const reservation = reservations.find(res => res.id === reservationId);
        if (!reservation) {
            console.error("❌ Reservation not found.");
            alert("Error: Reservation not found!");
            return;
        }

        // Get modal elements
        const deleteModalOverlay = document.getElementById("deleteModal");
        const roomSpan = document.getElementById("deleteRoom");
        const seatSpan = document.getElementById("deleteSeat");
        const dateSpan = document.getElementById("deleteDate");
        const timeSpan = document.getElementById("deleteTime");
        const reservedBySpan = document.getElementById("deleteReservedBy");
        const confirmDeleteBtn = document.querySelector(".confirm-button");
        const cancelDeleteBtn = document.querySelector(".deleteCancel-button");
        const closeButton = document.querySelector(".close-button");

        if (!deleteModalOverlay) {
            console.error("❌ Delete modal overlay not found!");
            alert("Error: Delete modal not found in DOM!");
            return;
        }

        // Populate modal with reservation details
        roomSpan.textContent = reservation.roomNumber;
        seatSpan.textContent = reservation.seatNumber;
        dateSpan.textContent = formatDate(reservation.date);
        timeSpan.textContent = generateTimeSlot(reservation.time);
        reservedBySpan.textContent = "You"; // For dashboard, always show "You"

        // Show the modal using CSS class instead of inline styles
        deleteModalOverlay.classList.add("active");

        console.log("✅ Delete modal should now be visible");

        // Remove old event listeners by cloning buttons
        const newConfirmBtn = confirmDeleteBtn.cloneNode(true);
        const newCancelBtn = cancelDeleteBtn.cloneNode(true);
        const newCloseBtn = closeButton.cloneNode(true);

        confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, confirmDeleteBtn);
        cancelDeleteBtn.parentNode.replaceChild(newCancelBtn, cancelDeleteBtn);
        closeButton.parentNode.replaceChild(newCloseBtn, closeButton);

        // Handle Confirm button click to delete the reservation
        newConfirmBtn.onclick = async function () {
            console.log("🗑️ Deleting reservation with ID:", reservationId);

            // Show loading state
            newConfirmBtn.textContent = "Deleting...";
            newConfirmBtn.disabled = true;

            try {
                const response = await fetch(`/reservations/${reservationId}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });

                console.log("🔄 Delete response status:", response.status);

                if (response.ok) {
                    console.log("✅ Reservation deleted successfully.");

                    // Find and remove the row from the table after deletion
                    const rowToRemove = document.querySelector(`button[data-reservation-id="${reservationId}"]`).closest('tr');
                    if (rowToRemove) {
                        rowToRemove.remove();
                    }

                    // Remove from reservations array
                    reservations = reservations.filter(res => res.id !== reservationId);

                    // Check if table is empty
                    const remainingRows = currentTableBody.querySelectorAll('tr').length;
                    if (remainingRows === 0) {
                        currentTableBody.innerHTML = `<tr><td colspan="5">No upcoming reservations.</td></tr>`;
                    }

                    closeDeleteModal();
                    alert("✅ Reservation deleted successfully!");

                } else {
                    const errorData = await response.json();
                    console.error("⚠️ Failed to delete reservation:", errorData);
                    
                    // Reset button state
                    newConfirmBtn.textContent = "Confirm";
                    newConfirmBtn.disabled = false;
                    
                    if (response.status === 403) {
                        alert("❌ You can only delete your own reservations.");
                    } else {
                        alert("Failed to delete reservation: " + (errorData.message || "Please try again."));
                    }
                }
            } catch (error) {
                console.error("⚠️ Error deleting reservation:", error);
                
                // Reset button state
                newConfirmBtn.textContent = "Confirm";
                newConfirmBtn.disabled = false;
                
                alert("An error occurred. Please try again later.");
            }
        };

        // Function to close the delete modal
        function closeDeleteModal() {
            console.log("🔒 Closing delete modal");
            deleteModalOverlay.classList.remove("active");
        }

        // Close the delete modal when clicking outside the modal content
        deleteModalOverlay.onclick = function(event) {
            if (event.target === deleteModalOverlay) {
                closeDeleteModal();
            }
        };

        // Close the delete modal when the Cancel button is clicked
        newCancelBtn.onclick = function() {
            closeDeleteModal();
        };

        // Close the delete modal when the "X" button is clicked
        newCloseBtn.onclick = function() {
            closeDeleteModal();
        };
    }

    function generateTimeOptions(editTimeDropdown, selectedTime) {
        editTimeDropdown.innerHTML = ""; // Clear previous options

        const selectedHour = selectedTime ? selectedTime.split(":")[0] : null;
        const selectedMinute = selectedTime ? selectedTime.split(":")[1] : null;

        for (let hour = 8; hour < 19; hour++) {  // Available time slots: 8 AM to 7 PM
            for (let minute of [0, 30]) {  // Increment in 30-minute intervals
                let startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                let endTime = new Date();
                endTime.setHours(hour);
                endTime.setMinutes(minute + 30);

                let timeLabel = `${startTime} - ${format24HourTime(endTime)}`; // Format as 24-hour time for dropdown

                let option = document.createElement("option");
                option.value = startTime;
                option.textContent = timeLabel;

                // Mark the current reservation time as selected
                if (startTime === selectedTime) {
                    option.selected = true;
                }

                editTimeDropdown.appendChild(option);
            }
        }
    }

    function format24HourTime(date) {
        let hours = String(date.getHours()).padStart(2, "0");
        let minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    function closeEditOverlay() {
        const editOverlay = document.querySelector(".edit-overlay");
        editOverlay.classList.remove("active");
    }

    function updateTableRow(reservationId, newDate, newTime) {
        // Find the row that contains the button with the specific reservationId
        const row = document.querySelector(`button[data-reservation-id="${reservationId}"]`).closest('tr');
        
        if (row) {
            // Format the new date and time for display in the table
            const formattedDate = formatDate(newDate);
            const formattedTime = generateTimeSlot(newTime);

            // Update the relevant cells in the table (Date and Time columns)
            row.cells[2].innerText = formattedDate;  // Date column
            row.cells[3].innerText = formattedTime;  // Time column

            console.log(`✅ Table row updated for reservation ID: ${reservationId}`);
        } else {
            console.error(`❌ Row not found for reservation ID: ${reservationId}`);
        }
    }

    function showEditOverlay(reservation) {
        console.log("🛠 Editing Reservation:", reservation);

        // Get the edit overlay and elements
        const editOverlay = document.querySelector(".edit-overlay");
        const editDateInput = document.querySelector("#edit-date");
        const editTimeDropdown = document.querySelector("#edit-time");
        const editRoom = document.querySelector("#edit-room");
        const editSeat = document.querySelector("#edit-seat");

        // Display the overlay
        editOverlay.classList.add("active");

        // Set the form inputs to the current reservation details
        editDateInput.value = reservation.date;
        editDateInput.min = new Date().toISOString().split("T")[0]; // ✅ restrict to current day and onwards

        generateTimeOptions(editTimeDropdown, reservation.time);

        // Display room and seat info
        editRoom.innerText = `Room: ${reservation.roomNumber}`;
        editSeat.innerText = `Seat: ${reservation.seatNumber}`;

        // Remove old event listener by cloning the save button
        const saveButton = document.querySelector("#saveButton");
        const newSaveButton = saveButton.cloneNode(true);
        saveButton.parentNode.replaceChild(newSaveButton, saveButton);

        // Handle save button click
        newSaveButton.onclick = async function () {
            const newDate = editDateInput.value;
            const newTime = editTimeDropdown.value;
            const room = reservation.roomNumber;
            
            const tempSeat = reservation.seatNumber;
            const [first, second] = tempSeat.split('#'); //remove string "Seat #" from the seat number
            const seat = second; //seat number

            console.log("🔄 Sending update request for ID:", reservation.id);

            if (newTime === "00:00") {
                alert("🚫 Invalid time selection.");
                return;
            }

            try {
                const updateResponse = await fetch(`/update-reservation/${reservation.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        reserved_date: newDate,
                        time: newTime,
                        room: room,
                        seat: seat,
                    })
                });

                console.log("🔄 Server Response:", updateResponse);

                if (updateResponse.ok) {
                    // Close the overlay and update the table row with the new reservation data
                    closeEditOverlay();
                    updateTableRow(reservation.id, newDate, newTime);

                    // Log a success message in the console
                    console.log(`✅ Reservation with ID ${reservation.id} updated successfully!`);
                } else {
                    const errorData = await updateResponse.json();
                    console.error("❌ Update Failed:", errorData);
                    
                    if (updateResponse.status === 403) {
                        alert("❌ You can only edit your own reservations.");
                    } else if (updateResponse.status === 409) {
                        alert("❌ Seat is already reserved at that time. Please choose a different time.");
                    } else {
                        alert("Failed to update reservation: " + (errorData.message || "Seat is not available at this time."));
                    }
                }
            } catch (error) {
                console.error("⚠️ Error updating reservation:", error);
                alert("Failed to update reservation due to a network error.");
            }
        };

        // Cancel button functionality
        const cancelButton = document.querySelector("#cancelButton");
        const newCancelButton = cancelButton.cloneNode(true);
        cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

        newCancelButton.addEventListener("click", function() {
            closeEditOverlay();
        });

        // Close the overlay when clicking outside of the overlay content
        editOverlay.onclick = function(event) {
            if (event.target === editOverlay) {
                closeEditOverlay();
            }
        };
    }

    // Initialize the dashboard
    async function initializeDashboard() {
        await fetchCurrentUser(); // Get current user first
        fetchUserReservations(); // Then fetch reservations
    }

    // Start the dashboard
    initializeDashboard();
});