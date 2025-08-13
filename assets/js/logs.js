// logs.js - JavaScript for System Logs Page

// Set default dates (last 7 days)
function setDefaultDates() {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    document.getElementById('dateFrom').value = lastWeek.toISOString().split('T')[0];
}

// Apply filters function
function applyFilters() {
  const dateFromStr = document.getElementById('dateFrom').value;  // "YYYY-MM-DD"
  const dateToStr = document.getElementById('dateTo').value;      // "YYYY-MM-DD"
  const actionFilter = document.getElementById('actionFilter').value.toLowerCase();
  const userFilter = document.getElementById('userFilter').value.toLowerCase();

  const table = document.getElementById('logsTable');
  const tbody = table.getElementsByTagName('tbody')[0];
  const rows = tbody.getElementsByTagName('tr');

  // Convert filter dates to Date objects at midnight local time
  const dateFrom = dateFromStr ? new Date(dateFromStr) : null;
  const dateTo = dateToStr ? new Date(dateToStr) : null;

  for (let row of rows) {
    const timestampStr = row.cells[0].innerText;  // e.g. "2025-08-13T02:04:01.767+00:00"
    const timestamp = new Date(timestampStr);

    const action = row.cells[1].innerText.toLowerCase();
    const user = row.cells[2].innerText.toLowerCase();

    let showRow = true;

    if (dateFrom && timestamp < dateFrom) {
      showRow = false;
    }

    if (dateTo) {
      // Include whole 'dateTo' day by adding one day to dateTo
      const dateToInclusive = new Date(dateTo);
      dateToInclusive.setDate(dateToInclusive.getDate() + 1);
      if (timestamp >= dateToInclusive) {
        showRow = false;
      }
    }

    if (actionFilter && action !== actionFilter) {
      showRow = false;
    }

    if (userFilter && !user.includes(userFilter)) {
      showRow = false;
    }

    row.style.display = showRow ? '' : 'none';
  }
}


// Clear filters function
function clearFilters() {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('actionFilter').value = '';
    document.getElementById('userFilter').value = '';
    
    // Show all rows
    const rows = document.querySelectorAll('#logsTableBody tr');
    rows.forEach(row => {
        row.style.display = '';
    });
    
    // Remove no results message if exists
    removeNoResultsMessage();
    
    setDefaultDates();
}

// Update no results message
function updateNoResultsMessage() {
    const visibleRows = document.querySelectorAll('#logsTableBody tr[style=""], #logsTableBody tr:not([style*="none"])');
    const tableBody = document.getElementById('logsTableBody');
    
    // Remove existing no results message
    removeNoResultsMessage();
    
    if (visibleRows.length === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.id = 'noResultsRow';
        noResultsRow.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 40px; color: #6c757d; font-style: italic;">
                No logs found matching the selected filters.
            </td>
        `;
        tableBody.appendChild(noResultsRow);
    }
}

// Remove no results message
function removeNoResultsMessage() {
    const noResultsRow = document.getElementById('noResultsRow');
    if (noResultsRow) {
        noResultsRow.remove();
    }
}

// Load logs from server (you'll need to implement this)
async function loadLogs() {
    try {
        // Show loading state
        const tableBody = document.getElementById('logsTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">Loading logs...</td>
            </tr>
        `;
        
        // Replace this with actual API call
        // const response = await fetch('/api/logs');
        // const logs = await response.json();
        
        // For now, we'll use the sample data
        setTimeout(() => {
            // This would normally populate with real data
            location.reload(); // Remove this line when implementing real data
        }, 1000);
        
    } catch (error) {
        console.error('Error loading logs:', error);
        const tableBody = document.getElementById('logsTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #dc3545;">
                    Error loading logs. Please try again.
                </td>
            </tr>
        `;
    }
}

// Export logs to CSV
function exportToCSV() {
    const table = document.getElementById('logsTable');
    const rows = Array.from(table.querySelectorAll('tr'));
    
    // Filter only visible rows
    const visibleRows = rows.filter(row => {
        return row.style.display !== 'none' && 
               !row.querySelector('.loading') && 
               !row.id === 'noResultsRow';
    });
    
    let csvContent = '';
    
    visibleRows.forEach(row => {
        const cols = Array.from(row.querySelectorAll('td, th'));
        const rowData = cols.map(col => {
            // Clean up the cell content (remove HTML tags for action badges)
            let text = col.textContent || col.innerText || '';
            // Escape quotes and wrap in quotes if contains comma
            if (text.includes(',') || text.includes('"') || text.includes('\n')) {
                text = '"' + text.replace(/"/g, '""') + '"';
            }
            return text;
        });
        csvContent += rowData.join(',') + '\n';
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Profile dropdown functionality (if not in common.js)
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('profileDropdown');
    const profileBtn = document.getElementById('profileDropdownBtn');
    
    if (dropdown && profileBtn && !profileBtn.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setDefaultDates();
    
    // Add profile dropdown event listener
    const profileBtn = document.getElementById('profileDropdownBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', toggleProfileDropdown);
    }
    
    // Add export button if needed (you can add this to the HTML)
    // const exportBtn = document.getElementById('exportBtn');
    // if (exportBtn) {
    //     exportBtn.addEventListener('click', exportToCSV);
    // }
    
    // Load logs (uncomment when ready to implement real data)
    // loadLogs();
});