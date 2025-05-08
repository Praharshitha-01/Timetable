<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EduSlotter - Dashboard</title>
  <link rel="stylesheet" href="style.css">
  <link rel="icon" href="logo.png" type="image/png">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
  <div class="dashboard-header">
    <div class="header-left">
      <img src="logo.png" alt="EduSlotter Logo" class="logo">
      <h1>EDUSLOTTER</h1>
    </div>
    <div class="header-right">
      <a href="dashboard.html" class="nav-link active">Dashboard</a>
      <a href="admin-dashboard.html" class="nav-link" id="admin-link" style="display:none;">Admin</a>
      <button id="logout-btn" class="logout-button">Logout</button>
    </div>
  </div>

  <div class="dashboard-container">
    <div class="dashboard-title">
      <h2>EduSlotter</h2>
      <p class="subtitle">Automatic Timetable Generator</p>
    </div>

    <div class="upload-section">
      <div class="form-card">
        <h3>Upload Excel Data</h3>
        <form id="upload-form">
          <div class="form-group">
            <label for="excel-file">Select Excel File:</label>
            <div class="file-input-container">
              <input type="file" id="excel-file" accept=".xlsx, .xls" required>
              <span id="file-name">No file chosen</span>
            </div>
          </div>
          
          <div class="input-row">
            <div class="input-group">
              <label for="num-timetables">Number of Timetables</label>
              <input type="number" id="num-timetables" min="1" required>
            </div>
            <div class="input-group">
              <label for="working-days">Working Days</label>
              <input type="number" id="working-days" min="1" max="7" required>
            </div>
          </div>
          
          <div class="input-group">
            <label for="working-hours">Working Hours per Day</label>
            <input type="number" id="working-hours" min="1" max="9" required>
          </div>
          
          <div class="button-container">
            <button type="submit" class="primary-btn">Upload and Generate</button>
          </div>
        </form>
      </div>
    </div>

    <div class="table-card" id="excel-preview" style="display:none;">
      <h3>Editable Excel Data</h3>
      <div class="table-container">
        <table id="data-table"></table>
      </div>
      <div class="button-container">
        <button id="generate-timetable-btn" class="primary-btn">Generate Timetables</button>
      </div>
    </div>

    <div id="output-section" class="output-container" style="display:none;">
      <h3>Generated Timetables</h3>
      <div id="timetables-container"></div>
    </div>
  </div>

  <script type="module" src="dashboard.js"></script>
  <script>
    // Display selected file name
    document.getElementById('excel-file').addEventListener('change', function(e) {
      const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
      document.getElementById('file-name').textContent = fileName;
    });
  </script>
</body>
</html>
