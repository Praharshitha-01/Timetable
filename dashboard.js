import { auth, onAuthStateChanged, signOut } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
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
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = 'login.html';
    });
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) {
      alert('Please upload a file!');
      return;
    }
    handleFile(file);
  });

  generateBtn.addEventListener('click', function() {
    if (!validateEditedTable()) {
      alert('Please correct table errors before generating.');
      return;
    }

    const subjects = readTableData();
    const numTimetables = parseInt(document.getElementById('num-timetables').value);
    const workingDays = parseInt(document.getElementById('working-days').value);
    const workingHours = parseInt(document.getElementById('working-hours').value);

    if (!validateWorkingDays(workingDays) || !validateWorkingHours(workingHours)) {
      return;
    }

    if (!checkSlotAvailability(subjects, workingDays, workingHours)) {
      return;
    }

    generateTimetables(subjects, numTimetables, workingDays, workingHours);
  });

  // File Handling
  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      generateEditableTable(json);
    };
    reader.readAsArrayBuffer(file);
  }

  function generateEditableTable(data) {
    table.innerHTML = '';
    data.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.contentEditable = true;
        td.innerText = cell;
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
      alert('Please provide at least one subject in the table!');
      return false;
    }
    return true;
  }

  function validateWorkingHours(workingHours) {
    if (workingHours < 1 || workingHours > 9) {
      alert('Working hours must be between 1 and 9!');
      return false;
    }
    return true;
  }

  function validateWorkingDays(workingDays) {
    if (workingDays < 1 || workingDays > 7) {
      alert('Working days must be between 1 and 7!');
      return false;
    }
    return true;
  }

  function checkSlotAvailability(subjects, workingDays, workingHours) {
    const totalSlots = calculateTotalSlots(subjects);
    const availableSlots = workingDays * workingHours;
    
    if (totalSlots > availableSlots) {
      alert(`Error: Total classes (${totalSlots}) exceed available slots (${availableSlots})`);
      return false;
    }
    return true;
  }

  function calculateTotalSlots(subjects) {
    return subjects.reduce((total, subject) => total + subject.hours, 0);
  }

  // Data Processing
  function readTableData() {
    const subjects = [];
    const rows = Array.from(table.rows);
    
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
    outputSection.style.display = 'block';
    timetablesContainer.innerHTML = '';
    currentTimetables = [];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      .slice(0, workingDays);
    const timeSlots = generateTimeSlots(workingHours);

    for (let t = 0; t < numTimetables; t++) {
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
    }
  }

  function generateTimeSlots(workingHours) {
    const slots = [];
    let startHour = 9;
    
    for (let i = 0; i < workingHours; i++) {
      const endHour = startHour + 1;
      slots.push(`${startHour}:00-${endHour}:00`);
      startHour = endHour;
    }
    
    return slots;
  }

  // Scheduling Algorithms
  function generateImprovedSchedule(subjects, days, timeSlots) {
    const schedule = {};
    const labSubjects = subjects.filter(sub => sub.type === 'lab');
    const theorySubjects = subjects.filter(sub => sub.type === 'theory');
    
    days.forEach(day => {
      schedule[day] = {};
      timeSlots.forEach(slot => {
        schedule[day][slot] = null;
      });
    });

    labSubjects.forEach(lab => {
      let scheduledHours = 0;
      while (scheduledHours < lab.hours) {
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
    });

    theorySubjects.forEach(subject => {
      let scheduledHours = 0;
      while (scheduledHours < subject.hours) {
        const day = days[Math.floor(Math.random() * days.length)];
        const availableSlots = timeSlots.filter(slot => !schedule[day][slot]);
        
        if (availableSlots.length > 0) {
          schedule[day][availableSlots[0]] = subject.name;
          scheduledHours++;
        }
      }
    });

    return schedule;
  }

  function findConsecutiveSlots(slots, required) {
    if (slots.length < required) return [];
    
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
    const timetableDiv = document.createElement('div');
    timetableDiv.className = 'section-card timetable-card';
    timetableDiv.dataset.id = timetable.id;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'timetable-header';
    
    const heading = document.createElement('h3');
    heading.textContent = timetable.name;
    headerDiv.appendChild(heading);
    
    const editTimingsBtn = document.createElement('button');
    editTimingsBtn.textContent = 'Edit Timings';
    editTimingsBtn.className = 'control-btn timing-btn';
    editTimingsBtn.addEventListener('click', () => enableTimingsEditing(timetableDiv, timetable.id));
    headerDiv.appendChild(editTimingsBtn);
    
    timetableDiv.appendChild(headerDiv);

    const tableEl = document.createElement('table');
    tableEl.className = 'timetable-table';
    
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th'));
    
    timetable.displaySlots.forEach(slot => {
      const th = document.createElement('th');
      th.textContent = slot;
      headerRow.appendChild(th);
    });
    
    tableEl.appendChild(headerRow);

    timetable.days.forEach(day => {
      const row = document.createElement('tr');
      const dayCell = document.createElement('th');
      dayCell.textContent = day;
      row.appendChild(dayCell);

      timetable.timeSlots.forEach(slot => {
        const td = document.createElement('td');
        const subject = timetable.schedule[day][slot];
        
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
    downloadBtn.addEventListener('click', () => downloadTimetable(timetableDiv));
    buttonGroup.appendChild(downloadBtn);

    timetableDiv.appendChild(buttonGroup);
    timetablesContainer.appendChild(timetableDiv);
  }

  function enableTimingsEditing(timetableDiv, timetableId) {
    const timetable = currentTimetables.find(t => t.id === timetableId);
    if (!timetable) return;

    const headerRow = timetableDiv.querySelector('tr');
    const timeCells = Array.from(headerRow.querySelectorAll('th')).slice(1);
    
    timeCells.forEach((th, index) => {
        th.contentEditable = true;
        th.classList.add('editing-timing');
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Timings';
    saveBtn.className = 'control-btn save-timing-btn';
    saveBtn.addEventListener('click', () => {
        timeCells.forEach((th, index) => {
            timetable.displaySlots[index] = th.textContent;
            th.contentEditable = false;
            th.classList.remove('editing-timing');
        });
        
        saveBtn.remove();
        alert('Timings updated successfully!');
    });

    timetableDiv.querySelector('.timetable-header').appendChild(saveBtn);
  }

  function enableTimetableEditing(timetableDiv, timetableId) {
    const timetable = currentTimetables.find(t => t.id === timetableId);
    if (!timetable) return;

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
    saveBtn.addEventListener('click', () => {
      cells.forEach(cell => {
        if (cell.textContent !== '-') {
          cell.contentEditable = false;
          cell.classList.remove('editing-class');
          
          const day = cell.parentElement.firstChild.textContent;
          const slotIndex = cell.cellIndex - 1;
          const timeSlot = timetable.timeSlots[slotIndex];
          timetable.schedule[day][timeSlot] = cell.textContent;
        }
      });
      
      saveBtn.remove();
      alert('Class assignments updated successfully!');
    });

    timetableDiv.querySelector('.button-group').appendChild(saveBtn);
  }

  function downloadTimetable(element) {
    const buttons = element.querySelectorAll('button');
    buttons.forEach(btn => btn.style.display = 'none');

    html2canvas(element).then(canvas => {
      const pdf = new jspdf.jsPDF();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 180, 0);
      pdf.save(`${element.querySelector('h3').textContent}.pdf`);
      
      buttons.forEach(btn => btn.style.display = 'inline-block');
    });
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
    }
  });
}); 
