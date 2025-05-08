import { auth, onAuthStateChanged, signOut } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
  // Toast Notification System
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);

  function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Confirmation Dialog System
  function showConfirmation(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      
      const dialog = document.createElement('div');
      dialog.className = 'confirmation-dialog';
      
      const messageEl = document.createElement('p');
      messageEl.textContent = message;
      
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'dialog-buttons';
      
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Confirm';
      confirmBtn.className = 'confirm-btn';
      confirmBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(true);
      });
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'cancel-btn';
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(false);
      });
      
      buttonContainer.appendChild(confirmBtn);
      buttonContainer.appendChild(cancelBtn);
      dialog.appendChild(messageEl);
      dialog.appendChild(buttonContainer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }

  // DOM Elements
  const fileInput = document.getElementById('excel-file');
  const table = document.getElementById('data-table');
  const form = document.getElementById('upload-form');
  const generateBtn = document.getElementById('generate-timetable-btn');
  const outputSection = document.getElementById('output-section');
  const timetablesContainer = document.getElementById('timetables-container');
  const logoutBtn = document.getElementById('logout-btn');
  const adminLink = document.getElementById('admin-link');

  // Variables
  let semester = '';
  let year = '';
  let currentTimetables = [];

  // Event Listeners
  logoutBtn.addEventListener('click', async () => {
    const confirmLogout = await showConfirmation('Are you sure you want to logout?');
    if (confirmLogout) {
      try {
        await signOut(auth);
        window.location.href = 'login.html';
      } catch (error) {
        showToast(`Logout failed: ${error.message}`);
      }
    }
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const file = fileInput.files[0];
    
    if (!file) {
      showToast('Please upload a file!');
      return;
    }
    
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showToast('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }
    
    try {
      await handleFile(file);
      showToast('File uploaded successfully!', 'success');
    } catch (error) {
      showToast(`Error processing file: ${error.message}`);
      console.error(error);
    }
  });

  generateBtn.addEventListener('click', async function() {
    if (!validateEditedTable()) {
      return;
    }

    const subjects = readTableData();
    const validationErrors = validateSubjects(subjects);
    
    if (validationErrors.length > 0) {
      showToast(validationErrors.join(', '));
      return;
    }

    const numTimetables = parseInt(document.getElementById('num-timetables').value);
    const workingDays = parseInt(document.getElementById('working-days').value);
    const workingHours = parseInt(document.getElementById('working-hours').value);

    if (isNaN(numTimetables) {
      showToast('Please enter a valid number of timetables');
      return;
    }

    if (!validateWorkingDays(workingDays) || !validateWorkingHours(workingHours)) {
      return;
    }

    if (!checkSlotAvailability(subjects, workingDays, workingHours)) {
      return;
    }

    const confirmGenerate = await showConfirmation(
      `Generate ${numTimetables} timetable(s) with ${workingDays} days and ${workingHours} hours per day?`
    );
    
    if (confirmGenerate) {
      try {
        generateTimetables(subjects, numTimetables, workingDays, workingHours);
        showToast('Timetables generated successfully!', 'success');
      } catch (error) {
        showToast(`Error generating timetables: ${error.message}`);
        console.error(error);
      }
    }
  });

  // File Handling
  async function handleFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          if (workbook.SheetNames.length === 0) {
            reject(new Error('No sheets found in the Excel file'));
            return;
          }
          
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (json.length < 3) {
            reject(new Error('Excel file must contain at least 3 rows (headers and data)'));
            return;
          }
          
          generateEditableTable(json);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  function generateEditableTable(data) {
    table.innerHTML = '';
    
    if (!data || !Array.isArray(data)) {
      showToast('Invalid data format for table generation');
      return;
    }
    
    data.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      
      if (!Array.isArray(row)) {
        showToast(`Row ${rowIndex + 1} is not in expected format`);
        return;
      }
      
      row.forEach((cell, cellIndex) => {
        const td = document.createElement('td');
        td.contentEditable = true;
        td.innerText = cell !== undefined && cell !== null ? cell.toString() : '';
        
        // Add validation attributes for specific columns
        if (rowIndex >= 2 && cellIndex === 1) { // Hours column
          td.setAttribute('data-validate', 'number');
          td.setAttribute('data-min', '1');
          td.setAttribute('data-max', '8');
        }
        
        tr.appendChild(td);
      });
      
      table.appendChild(tr);
    });
    
    document.getElementById('excel-preview').style.display = 'block';
  }

  // Validation Functions
  function validateEditedTable() {
    const rows = Array.from(table.rows);
    
    if (rows.length < 3) {
      showToast('Please provide at least one subject in the table!');
      return false;
    }
    
    // Validate hours column
    let isValid = true;
    for (let i = 2; i < rows.length; i++) {
      const hoursCell = rows[i].cells[1];
      if (hoursCell) {
        const hours = parseInt(hoursCell.innerText);
        if (isNaN(hours) || hours < 1 || hours > 8) {
          hoursCell.classList.add('invalid-input');
          showToast(`Row ${i + 1}: Hours must be between 1 and 8`);
          isValid = false;
        } else {
          hoursCell.classList.remove('invalid-input');
        }
      }
    }
    
    return isValid;
  }

  function validateSubjects(subjects) {
    const errors = [];
    
    if (subjects.length === 0) {
      errors.push('At least one subject required');
    }
    
    // Check for duplicate subject names
    const names = subjects.map(s => s.name);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      errors.push('Duplicate subject names found');
    }
    
    // Check for invalid hours
    const invalidHours = subjects.filter(s => s.hours < 1 || s.hours > 8);
    if (invalidHours.length > 0) {
      errors.push('Subject hours must be between 1 and 8');
    }
    
    return errors;
  }

  function validateWorkingHours(workingHours) {
    if (isNaN(workingHours) || workingHours < 1 || workingHours > 9) {
      showToast('Working hours must be between 1 and 9!');
      return false;
    }
    return true;
  }

  function validateWorkingDays(workingDays) {
    if (isNaN(workingDays) || workingDays < 1 || workingDays > 7) {
      showToast('Working days must be between 1 and 7!');
      return false;
    }
    return true;
  }

  function checkSlotAvailability(subjects, workingDays, workingHours) {
    const totalSlots = calculateTotalSlots(subjects);
    const availableSlots = workingDays * workingHours;
    
    if (totalSlots > availableSlots) {
      showToast(`Total classes (${totalSlots}) exceed available slots (${availableSlots})`);
      return false;
    }
    
    return true;
  }

  function calculateTotalSlots(subjects) {
    return subjects.reduce((total, subject) => {
      if (subject.hours && !isNaN(subject.hours)) {
        return total + subject.hours;
      }
      return total;
    }, 0);
  }

  // Data Processing
  function readTableData() {
    const subjects = [];
    const rows = Array.from(table.rows);
    
    if (rows.length < 1) {
      showToast('No data available in table');
      return subjects;
    }
    
    year = rows[0]?.cells[1]?.innerText.trim() || '';
    semester = rows[1]?.cells[1]?.innerText.trim() || '';
    
    for (let i = 2; i < rows.length; i++) {
      const cells = rows[i].cells;
      if (cells.length >= 3) {
        const subject = cells[0]?.innerText.trim();
        const hours = parseInt(cells[1]?.innerText.trim());
        const type = (cells[2]?.innerText.trim().toLowerCase() === 'lab') ? 'lab' : 'theory';
        
        if (subject && !isNaN(hours)) {
          subjects.push({ name: subject, hours: hours, type: type });
        }
      }
    }
    
    return subjects;
  }

  // Timetable Generation
  function generateTimetables(subjects, numTimetables, workingDays, workingHours) {
    if (!subjects || subjects.length === 0) {
      throw new Error('No subjects provided for timetable generation');
    }
    
    if (numTimetables < 1) {
      throw new Error('Number of timetables must be at least 1');
    }
    
    outputSection.style.display = 'block';
    timetablesContainer.innerHTML = '';
    currentTimetables = [];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      .slice(0, workingDays);
    const timeSlots = generateTimeSlots(workingHours);

    for (let t = 0; t < numTimetables; t++) {
      try {
        const timetableData = {
          id: `timetable-${Date.now()}-${t}`,
          name: `${year} - Semester ${semester}`,
          days: days,
          timeSlots: timeSlots,
          displaySlots: [...timeSlots],
          subjects: JSON.parse(JSON.stringify(subjects)),
          schedule: generateImprovedSchedule(subjects, days, timeSlots)
        };

        currentTimetables.push(timetableData);
        renderTimetable(timetableData);
      } catch (error) {
        console.error(`Error generating timetable ${t + 1}:`, error);
        showToast(`Error generating timetable ${t + 1}: ${error.message}`);
      }
    }
  }

  function generateTimeSlots(workingHours) {
    if (workingHours < 1 || workingHours > 9) {
      throw new Error('Invalid number of working hours');
    }
    
    const slots = [];
    let startHour = 9;
    
    for (let i = 0; i < workingHours; i++) {
      const endHour = startHour + 1;
      slots.push(`${startHour}:00-${endHour}:00`);
      startHour = endHour;
      
      if (startHour >= 18) { // Prevent going past 6 PM
        break;
      }
    }
    
    return slots;
  }

  // Scheduling Algorithms
  function generateImprovedSchedule(subjects, days, timeSlots) {
    if (!subjects || !days || !timeSlots) {
      throw new Error('Invalid input for schedule generation');
    }
    
    const schedule = {};
    const labSubjects = subjects.filter(sub => sub.type === 'lab');
    const theorySubjects = subjects.filter(sub => sub.type === 'theory');
    
    // Initialize schedule structure
    days.forEach(day => {
      schedule[day] = {};
      timeSlots.forEach(slot => {
        schedule[day][slot] = null;
      });
    });

    // Schedule lab subjects first (they need consecutive slots)
    labSubjects.forEach(lab => {
      let scheduledHours = 0;
      const maxAttempts = 100; // Prevent infinite loops
      let attempts = 0;
      
      while (scheduledHours < lab.hours && attempts < maxAttempts) {
        attempts++;
        const day = days[Math.floor(Math.random() * days.length)];
        const availableSlots = timeSlots.filter(slot => !schedule[day][slot]);
        
        const consecutiveSlots = findConsecutiveSlots(availableSlots, lab.hours - scheduledHours);
        if (consecutiveSlots.length > 0) {
          consecutiveSlots.forEach(slot => {
            schedule[day][slot] = lab.name;
            scheduledHours++;
          });
        } else if (availableSlots.length > 0) {
          schedule[day][availableSlots[0]] = lab.name;
          scheduledHours++;
        }
      }
      
      if (attempts >= maxAttempts && scheduledHours < lab.hours) {
        showToast(`Warning: Could not find enough slots for lab ${lab.name}`);
      }
    });

    // Schedule theory subjects
    theorySubjects.forEach(subject => {
      let scheduledHours = 0;
      const maxAttempts = 100;
      let attempts = 0;
      
      while (scheduledHours < subject.hours && attempts < maxAttempts) {
        attempts++;
        const day = days[Math.floor(Math.random() * days.length)];
        const availableSlots = timeSlots.filter(slot => !schedule[day][slot]);
        
        if (availableSlots.length > 0) {
          schedule[day][availableSlots[0]] = subject.name;
          scheduledHours++;
        }
      }
      
      if (attempts >= maxAttempts && scheduledHours < subject.hours) {
        showToast(`Warning: Could not find enough slots for theory ${subject.name}`);
      }
    });

    return schedule;
  }

  function findConsecutiveSlots(slots, required) {
    if (!slots || slots.length < required || required < 1) {
      return [];
    }
    
    for (let i = 0; i <= slots.length - required; i++) {
      let consecutive = true;
      
      for (let j = 1; j < required; j++) {
        const currentHour = parseInt(slots[i+j-1].split(':')[0]);
        const nextHour = parseInt(slots[i+j].split(':')[0]);
        
        if (nextHour !== currentHour + 1) {
          consecutive = false;
          break;
        }
      }
      
      if (consecutive) {
        return slots.slice(i, i + required);
      }
    }
    
    return [];
  }

  // Rendering Functions
  function renderTimetable(timetable) {
    if (!timetable) {
      showToast('Invalid timetable data for rendering');
      return;
    }
    
    const timetableDiv = document.createElement('div');
    timetableDiv.className = 'section-card timetable-card';
    timetableDiv.dataset.id = timetable.id;

    // Header with title and edit button
    const headerDiv = document.createElement('div');
    headerDiv.className = 'timetable-header';
    
    const heading = document.createElement('h3');
    heading.textContent = timetable.name || 'Unnamed Timetable';
    headerDiv.appendChild(heading);
    
    const editTimingsBtn = document.createElement('button');
    editTimingsBtn.textContent = 'Edit Timings';
    editTimingsBtn.className = 'control-btn timing-btn';
    editTimingsBtn.addEventListener('click', () => enableTimingsEditing(timetableDiv, timetable.id));
    headerDiv.appendChild(editTimingsBtn);
    
    timetableDiv.appendChild(headerDiv);

    // Create the timetable table
    const tableEl = document.createElement('table');
    tableEl.className = 'timetable-table';
    
    // Header row with time slots
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // Empty corner cell
    
    timetable.displaySlots.forEach(slot => {
      const th = document.createElement('th');
      th.textContent = slot || 'Unspecified';
      headerRow.appendChild(th);
    });
    
    tableEl.appendChild(headerRow);

    // Create rows for each day
    timetable.days.forEach(day => {
      const row = document.createElement('tr');
      const dayCell = document.createElement('th');
      dayCell.textContent = day || 'Unnamed Day';
      row.appendChild(dayCell);

      timetable.timeSlots.forEach(slot => {
        const td = document.createElement('td');
        const subject = timetable.schedule[day] ? timetable.schedule[day][slot] : null;
        
        if (subject) {
          td.textContent = subject;
          const isLab = timetable.subjects.find(s => s.name === subject)?.type === 'lab';
          td.className = isLab ? 'lab-class' : 'theory-class';
        } else {
          td.textContent = '-';
        }
        
        row.appendChild(td);
      });

      tableEl.appendChild(row);
    });

    timetableDiv.appendChild(tableEl);

    // Action buttons at the bottom
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit Classes';
    editBtn.className = 'control-btn';
    editBtn.addEventListener('click', () => enableTimetableEditing(timetableDiv, timetable.id));
    buttonGroup.appendChild(editBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download PDF';
    downloadBtn.className = 'control-btn download-btn';
    downloadBtn.addEventListener('click', () => {
      showToast('Preparing PDF download...', 'info');
      setTimeout(() => downloadTimetable(timetableDiv), 500);
    });
    buttonGroup.appendChild(downloadBtn);

    timetableDiv.appendChild(buttonGroup);
    timetablesContainer.appendChild(timetableDiv);
  }

  async function enableTimingsEditing(timetableDiv, timetableId) {
    const timetable = currentTimetables.find(t => t.id === timetableId);
    if (!timetable) {
      showToast('Timetable not found for editing');
      return;
    }

    const confirmEdit = await showConfirmation('Edit timetable timings?');
    if (!confirmEdit) return;

    const headerRow = timetableDiv.querySelector('tr');
    if (!headerRow) {
      showToast('Could not find timetable header row');
      return;
    }

    const timeCells = Array.from(headerRow.querySelectorAll('th')).slice(1);
    
    timeCells.forEach((th, index) => {
      th.contentEditable = true;
      th.classList.add('editing-timing');
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Timings';
    saveBtn.className = 'control-btn save-timing-btn';
    
    saveBtn.addEventListener('click', async () => {
      const newTimings = timeCells.map(th => th.textContent.trim());
      
      // Validate new timings
      const timeRegex = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
      const invalidTimings = newTimings.filter(t => !timeRegex.test(t));
      
      if (invalidTimings.length > 0) {
        showToast('Invalid time format. Use HH:MM-HH:MM');
        return;
      }

      const confirmSave = await showConfirmation('Save these timing changes?');
      if (confirmSave) {
        timeCells.forEach((th, index) => {
          timetable.displaySlots[index] = newTimings[index];
          th.contentEditable = false;
          th.classList.remove('editing-timing');
        });
        
        saveBtn.remove();
        showToast('Timings updated successfully!', 'success');
      }
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'control-btn cancel-btn';
    cancelBtn.addEventListener('click', () => {
      timeCells.forEach(th => {
        th.contentEditable = false;
        th.classList.remove('editing-timing');
      });
      saveBtn.remove();
      cancelBtn.remove();
    });

    const btnContainer = document.createElement('div');
    btnContainer.className = 'edit-buttons';
    btnContainer.appendChild(saveBtn);
    btnContainer.appendChild(cancelBtn);
    
    timetableDiv.querySelector('.timetable-header').appendChild(btnContainer);
  }

  async function enableTimetableEditing(timetableDiv, timetableId) {
    const timetable = currentTimetables.find(t => t.id === timetableId);
    if (!timetable) {
      showToast('Timetable not found for editing');
      return;
    }

    const confirmEdit = await showConfirmation('Edit timetable classes?');
    if (!confirmEdit) return;

    const cells = timetableDiv.querySelectorAll('td');
    cells.forEach(cell => {
      if (cell.textContent !== '-') {
        cell.contentEditable = true;
        cell.classList.add('editing-class');
      }
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Classes';
    saveBtn.className = 'control-btn save-class-btn';
    
    saveBtn.addEventListener('click', async () => {
      const confirmSave = await showConfirmation('Save these class changes?');
      if (confirmSave) {
        cells.forEach(cell => {
          if (cell.textContent !== '-') {
            cell.contentEditable = false;
            cell.classList.remove('editing-class');
            
            const day = cell.parentElement.firstChild.textContent;
            const slotIndex = cell.cellIndex - 1;
            const timeSlot = timetable.timeSlots[slotIndex];
            
            if (day && timeSlot) {
              timetable.schedule[day][timeSlot] = cell.textContent;
            }
          }
        });
        
        saveBtn.remove();
        cancelBtn.remove();
        showToast('Class assignments updated successfully!', 'success');
      }
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'control-btn cancel-btn';
    cancelBtn.addEventListener('click', () => {
      cells.forEach(cell => {
        cell.contentEditable = false;
        cell.classList.remove('editing-class');
      });
      saveBtn.remove();
      cancelBtn.remove();
    });

    const btnContainer = document.createElement('div');
    btnContainer.className = 'edit-buttons';
    btnContainer.appendChild(saveBtn);
    btnContainer.appendChild(cancelBtn);
    
    timetableDiv.querySelector('.button-group').appendChild(btnContainer);
  }

  function downloadTimetable(element) {
    if (!element) {
      showToast('No timetable selected for download');
      return;
    }

    try {
      const buttons = element.querySelectorAll('button');
      buttons.forEach(btn => btn.style.display = 'none');

      // Show generating message
      const generatingMsg = document.createElement('div');
      generatingMsg.className = 'generating-pdf';
      generatingMsg.textContent = 'Generating PDF...';
      element.appendChild(generatingMsg);

      html2canvas(element).then(canvas => {
        element.removeChild(generatingMsg);
        buttons.forEach(btn => btn.style.display = 'inline-block');
        
        const pdf = new jspdf.jsPDF({
          orientation: 'landscape',
          unit: 'mm'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 280; // A4 width in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`${element.querySelector('h3').textContent || 'timetable'}.pdf`);
        showToast('PDF downloaded successfully!', 'success');
      }).catch(error => {
        buttons.forEach(btn => btn.style.display = 'inline-block');
        element.removeChild(generatingMsg);
        showToast(`PDF generation failed: ${error.message}`);
        console.error(error);
      });
    } catch (error) {
      showToast(`Download failed: ${error.message}`);
      console.error(error);
    }
  }

  // Authentication
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    } else {
      const adminEmails = [
        "23h51a0593@cmrcet.ac.in",
        "23h51a0519@cmrcet.ac.in", 
        "23h51a05cx@cmrcet.ac.in",
        "23h51a05j8@cmrcet.ac.in",
        "23h51a05w1@cmrcet.ac.in",
        "23h51a05y3@cmrcet.ac.in"
      ];
      
      if (adminLink && adminEmails.includes(user.email)) {
        adminLink.style.display = 'block';
      }
      
      showToast(`Welcome, ${user.email}`, 'success');
    }
  });
