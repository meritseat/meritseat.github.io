// Store mapping of branch code to full name
let branchMap = {};
let collegeMap = {};
let cutoffData = [];
let rankData = [];
let fullCollegeList = [];

let cutoffMargin = 1.0;
let avgcutOffMargin = 0.5;

let rankMargin = 2000;
let avgRankMargin = 1000;

let sliceLength = 100


// Helper to assign color based on possibility level
function getPossibilityColor(level) {
  switch (level.toUpperCase()) {
    case "LOW": return "red";
    case "MEDIUM": return "goldenrod";
    case "HIGH": return "green";
    default: return "black";
  }
}

function loadCutOffCSV() {
  Papa.parse("/data/cleansed/2024_tnea_cutoff_data.csv", {
    download: true,
    header: true,
    complete: function(results) {
      cutoffData = results.data;
    }
  });
}

function loadRankCSV() {
  Papa.parse("/data/cleansed/2024_tnea_rank_data.csv", {
    download: true,
    header: true,
    complete: function(results) {
      rankData = results.data;
    }
  });
}

function loadBranchListFromCSV() {
  Papa.parse("/data/branch_list.csv", {
    download: true,
    header: true,
    complete: function(results) {
      const branchDropdown = document.getElementById("branch");

      results.data.forEach(row => {
        const code = row.BranchCode?.trim();
        const name = row.Branch?.trim();
        if(code == 'DISABLE'){
          const option = document.createElement("option");
          option.disabled  = true;
          option.textContent = `${name}`
          branchDropdown.appendChild(option);
        }
        if (code && name && !branchMap[code] && code !== 'DISABLE') {
          branchMap[code] = name;
          const option = document.createElement("option");
          option.value = code;
          option.textContent = `[${code}] ${name}`;
          branchDropdown.appendChild(option);
        }
      });
    }
  });
}

/* function loadCollegeListFromCSV() {
  Papa.parse("/data/college_list_w_district.csv", {
    download: true,
    header: true,
    complete: function(results) {
      const collegeCodeDropdown = document.getElementById("collegeCode");

      results.data.forEach(row => {
        const colCode = row.collegeCode?.trim();
        const colName = row.collegeName?.trim();
        const districtName = row.districtName?.trim();
        if (colCode && colName && !collegeMap[colCode]) {
          collegeMap[colCode]  =  {'colName': colName,'districtName':  districtName};
          const option = document.createElement("option");
          option.value = colCode;
          option.textContent = `[${colCode}] ${colName}`;
          collegeCodeDropdown.appendChild(option);
        }
      });
    }
  });
} */



function loadCollegeListFromCSV() {
  Papa.parse("/data/college_list_w_district.csv", {
    download: true,
    header: true,
    complete: function(results) {
      fullCollegeList = results.data;
      fullCollegeList.forEach(row => {
        const colCode = row.collegeCode?.trim();
        const colName = row.collegeName?.trim();
        const districtName = row.districtName?.trim();
        if (colCode && colName && !collegeMap[colCode]) {
          collegeMap[colCode]  =  {'colName': colName,'districtName':  districtName};
        }
      });
    }
  });
}

function loadDistrictListFromCSV() {
  Papa.parse("/data/district_list.csv", {
    download: true,
    header: true,
    complete: function(results) {
      const districtListDropdown = document.getElementById("city");

      results.data.forEach(row => {
        const districtNames = row.districtName?.trim();
          const option = document.createElement("option");
          option.value = districtNames;
          option.textContent = districtNames;
          districtListDropdown.appendChild(option);
        }
      ) ;
    }
  });
}


function findCollegesByCutoff() {
  //loadCutOffCSV();
  const rawCutoffInput = document.getElementById("cutoff").value;
  const rawCutoff = parseFloat(rawCutoffInput);

  // Check if the entered cutoff is a valid number
  if (isNaN(rawCutoffInput) || isNaN(rawCutoff) || rawCutoff < 70 || rawCutoff >200) {
    alert("Please enter a valid cutoff mark.");
    return;
  }

  const cutoff = Math.min(rawCutoff + cutoffMargin, 200) || 0;
  const category = document.getElementById("category").value;
  const city = document.getElementById("city").value.toLowerCase();
  const branch = document.getElementById("branch").value;
  const collegeCode = document.getElementById("collegeCode").value;

  if (isNaN(cutoff)) {
    alert("Please enter a valid cutoff mark.");
    return;
  }

//console.log("cutoffData: ", cutoffData);

const filtered = cutoffData
  .map(row => {
    const rawValue = row[category]?.trim();
    const mark = parseFloat(rawValue);
    return { ...row, mark }; // attach the mark
  })
.filter(row => {
  const matchCity = !city || (collegeMap[row.CollegeCode]?.districtName?.toLowerCase() === city);

  if (collegeCode) {
    return row.CollegeCode === collegeCode && matchCity;
  } else {
    const matchCutoff = isNaN(row.mark) || row.mark === 0 || cutoff >= row.mark;
    const matchBranch = !branch || row.BranchCode === branch;
    return matchCutoff && matchBranch && matchCity;
  }
});


  //console.log("filtered records : ", filtered);

  // Sort by cutoff descending for selected category
  filtered.sort((a, b) => parseFloat(b.mark) - parseFloat(a.mark));

  const results = filtered.slice(0, sliceLength);
  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = "";

  if (results.length === 0) {
    resultsContainer.innerHTML = "<p>Try with different College code/Branch Code/City or remove the optional filters for broader suggestion.</p>";
    return;
  }

const table = document.createElement("table");
table.style.width = "100%";
table.style.borderCollapse = "collapse";

const thead = document.createElement("thead");
thead.innerHTML = `
  <tr>
    <th>COLLEGE CODE</th>
    <th>CITY</th>
    <th>COLLEGE NAME</th>
    <th>BRANCH CODE</th>
    <th>BRANCH NAME</th>
    <th>${category} CUTOFF</th>
    <th>POSSIBILITY</th>
  </tr>`;
table.appendChild(thead);

const tbody = document.createElement("tbody");

let possibilityLevel = "LOW"

let displayCutOff = 0

results.forEach(row => {
  

  if( rawCutoff === 200){
     possibilityLevel = "HIGH";
  }
  else if(row[category] > rawCutoff+avgcutOffMargin){
      possibilityLevel = "LOW";
  }
  else if(rawCutoff+avgcutOffMargin >= row[category]  &&   row[category] > rawCutoff){
     possibilityLevel = "MEDIUM";
  }
  else{
     possibilityLevel = "HIGH";
  }

  const possibilityColor = getPossibilityColor(possibilityLevel);


  if(isNaN(row[category]) || row[category] == 0.0) { displayCutOff = "Seat Not Filled" } else { displayCutOff = row[category]}


  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${row.CollegeCode}</td>
    <td>${collegeMap[row.CollegeCode]['districtName']}</td>
    <td>${row.College}</td>
    <td>${row.BranchCode}</td>
    <td>${row.Branch}</td>
    <td>${displayCutOff}</td>
    <td><span style="color:${possibilityColor}; font-weight:bold;">${possibilityLevel}</span></td>
  `;
  tbody.appendChild(tr);
});

table.appendChild(tbody);
resultsContainer.appendChild(table);
}

function findCollegesByRank() {
  //loadRankCSV();
  const rawRankInput = document.getElementById("rank").value;
  const rawRank = parseFloat(rawRankInput);

  // Check if the entered Rank is a valid number and within Range
  if (isNaN(rawRankInput) || isNaN(rawRank) || rawRank < 1 || rawRank >300000) {
    alert("Please enter a valid Rank Assigned by TNEA.");
    return;
  }

  const rank = Math.max(rawRank - rankMargin, 1) || 0;
  const category = document.getElementById("category").value;
  const city = document.getElementById("city").value.toLowerCase();
  const branch = document.getElementById("branch").value;
  const collegeCode = document.getElementById("collegeCode").value;

  if (isNaN(rank)) {
    alert("Please enter a valid Rank Assigned by TNEA.");
    return;
  }

//console.log("rankData: ", rankData);

const filtered = rankData
  .map(row => {
    const rawValue = row[category]?.trim();
    const rank = parseFloat(rawValue) === 0 ? 500000 : parseFloat(rawValue);
    return { ...row, rank }; // attach the rank
  })
  .filter(row => {
    const matchCity = !city || (
      collegeMap[row.CollegeCode] &&
      collegeMap[row.CollegeCode].districtName &&
      collegeMap[row.CollegeCode].districtName.toLowerCase() === city
    );
    
    if (collegeCode) {
      return row.CollegeCode === collegeCode && matchCity;
    } else {
      const matchRank = isNaN(row.rank) || row.rank === 500000 || rank <= row.rank;
      const matchBranch = !branch || row.BranchCode === branch;
      return matchRank && matchBranch && matchCity;
    }
  });

  //console.log("filtered records : ", filtered);

  // Sort by cutoff descending for selected category
  filtered.sort((a, b) => parseFloat(a.rank) - parseFloat(b.rank) );

  const results = filtered.slice(0, sliceLength);
  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = "";

  if (results.length === 0) {
    resultsContainer.innerHTML = "<p>Try with different College code/Branch Code/City or remove the optional filters for broader suggestion.</p>";
    return;
  }

const table = document.createElement("table");
table.style.width = "100%";
table.style.borderCollapse = "collapse";

const thead = document.createElement("thead");
thead.innerHTML = `
  <tr>
    <th>COLLEGE CODE</th>
    <th>CITY</th>
    <th>COLLEGE NAME</th>
    <th>BRANCH CODE</th>
    <th>BRANCH NAME</th>
    <th>${category} RANK</th>
    <th>POSSIBILITY</th>
  </tr>`;
table.appendChild(thead);

const tbody = document.createElement("tbody");

let possibilityLevel = "LOW"

let displayRank = 0

results.forEach(row => {
  

  if( rawRank === 1){
     possibilityLevel = "HIGH";
  }
  else if(row['rank'] < rawRank-avgRankMargin){
      possibilityLevel = "LOW";
  }
  else if(rawRank-avgRankMargin <= row['rank']  &&   row['rank'] < rawRank){
     possibilityLevel = "MEDIUM";
  }
  else{
     possibilityLevel = "HIGH";
  }

  const possibilityColor = getPossibilityColor(possibilityLevel);


  if(isNaN(row['rank']) || row['rank'] === 500000) { displayRank = "Seat Not Filled" } else { displayRank = row['rank']}


  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${row.CollegeCode}</td>
    <td>${collegeMap[row.CollegeCode]['districtName']}</td>
    <td>${row.College}</td>
    <td>${row.BranchCode}</td>
    <td>${row.Branch}</td>
    <td>${displayRank}</td>
    <td><span style="color:${possibilityColor}; font-weight:bold;">${possibilityLevel}</span></td>
  `;
  tbody.appendChild(tr);
});

table.appendChild(tbody);
resultsContainer.appendChild(table);
}

// On page load
window.onload = () => {
  loadCutOffCSV();
  loadRankCSV();
  loadBranchListFromCSV();
  loadCollegeListFromCSV();
  loadDistrictListFromCSV();
  lucide.createIcons();

  // Attach district change listener AFTER college list loads
  const districtDropdown = document.getElementById("city");
  districtDropdown.addEventListener("change", function () {
    const selectedDistrict = this.value.toLowerCase();
    const collegeDropdown = document.getElementById("collegeCode");
    collegeDropdown.innerHTML = '<option value="">-- Select College (optional) --</option>';

    fullCollegeList.forEach(row => {
      if (row.districtName?.trim().toLowerCase() === selectedDistrict) {
        const option = document.createElement("option");
        option.value = row.collegeCode.trim();
        option.textContent = `[${row.collegeCode}] ${row.collegeName}`;
        collegeDropdown.appendChild(option);
      }
    });
  });

  // Disable Branch if college is selected
  document.getElementById("collegeCode").addEventListener("change", function () {
  const branchDropdown = document.getElementById("branch");
  const branchNote = document.getElementById("branchNote");

  if (this.value !== "") {
    branchDropdown.disabled = true;
    branchNote.style.display = "block";
  } else {
    branchDropdown.disabled = false;
    branchNote.style.display = "none";
  }
});


};
