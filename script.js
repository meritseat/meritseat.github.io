// Store mapping of branch code to full name
let branchMap = {};
let collegeMap = {};
let cutoffData = [];
let rankData = [];

let cutoffMargin = 1.0;
let avgcutOffMargin = 0.5;

let rankMargin = 200;
let avgRankMargin = 100;

let sliceLength = 50


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
        if (code && name && !branchMap[code]) {
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

function loadCollegeListFromCSV() {
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

console.log("cutoffData: ", cutoffData);

const filtered = cutoffData
  .map(row => {
    const rawValue = row[category]?.trim();
    const mark = parseFloat(rawValue);
    return { ...row, mark }; // attach the mark
  })
  .filter(row => {
    if (!collegeMap[row.CollegeCode]) {
      console.warn("Missing college info for code:", row);
    }
    //console.log("mappedData: ", row);
    //const matchCutoff = cutoff >= row.mark;
    const matchCutoff = isNaN(row.mark) || row.mark === 0 || cutoff >= row.mark;
    const matchCity = !city || ( collegeMap[row.CollegeCode] && collegeMap[row.CollegeCode].districtName && collegeMap[row.CollegeCode].districtName.toLowerCase() === city);
    const matchBranch = !branch || row.BranchCode === branch;
    const matchCollegeCode = !collegeCode || row.CollegeCode === collegeCode;
    return matchCutoff && matchBranch && matchCollegeCode  && matchCity;
  });

  console.log("filtered records : ", filtered);

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
    <th>College Code</th>
    <th>City</th>
    <th>College Name</th>
    <th>Branch Code</th>
    <th>Branch Name</th>
    <th>Cutoff</th>
    <th>Possibility</th>
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

console.log("rankData: ", rankData);

const filtered = rankData
  .map(row => {
    const rawValue = row[category]?.trim();
    const rank = parseFloat(rawValue) === 0 ? 500000 : parseFloat(rawValue);
    return { ...row, rank }; // attach the rank
  })
  .filter(row => {
    if (!collegeMap[row.CollegeCode]) {
      console.warn("Missing college info for code:", row);
    }
    //console.log("mappedData: ", row);
    const matchRank = isNaN(row.rank) || row.rank === 500000 || rank <= row.rank;
    const matchCity = !city || ( collegeMap[row.CollegeCode] && collegeMap[row.CollegeCode].districtName && collegeMap[row.CollegeCode].districtName.toLowerCase() === city);
    const matchBranch = !branch || row.BranchCode === branch;
    const matchCollegeCode = !collegeCode || row.CollegeCode === collegeCode;
    return matchRank && matchBranch && matchCollegeCode  && matchCity;
  });

  console.log("filtered records : ", filtered);

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
    <th>College Code</th>
    <th>City</th>
    <th>College Name</th>
    <th>Branch Code</th>
    <th>Branch Name</th>
    <th>Rank</th>
    <th>Possibility</th>
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

/*   // Cutoff input validation + formatting
  const cutoffInput = document.getElementById("cutoff");
  const cutOffWarningText = document.getElementById("cutoffWarning");

  if(cutoffInput){
    cutoffInput.addEventListener("input", function () {
      let value = parseFloat(cutoffInput.value);
      if (isNaN(value)) {
        cutoffInput.style.boxShadow = "";
        cutOffWarningText.style.display = "none";
        return;
      }
      // Validation
      if (value < 70 || value > 200) {
        cutoffInput.style.boxShadow = "0 0 8px 2px red";
        cutOffWarningText.style.display = "inline";
      } else {
        cutoffInput.style.boxShadow = "0 0 6px 2px #2196f3";
        cutOffWarningText.style.display = "none";
      }
    });
  } */


/*   // Rank input validation + formatting
  const rankInput = document.getElementById("rank");
  const rankWarningText = document.getElementById("rankWarning");

  if(rankInput){
    rankInput.addEventListener("input", function () {
      let value = parseFloat(rank.value);
      if (isNaN(value)) {
        rankInput.style.boxShadow = "";
        rankWarningText.style.display = "none";
        return;
      }
      // Validation
      if (value < 1 || value > 300000) {
        rankInput.style.boxShadow = "0 0 8px 2px red";
        rankWarningText.style.display = "inline";
      } else {
        rankInput.style.boxShadow = "0 0 6px 2px #2196f3";
        rankWarningText.style.display = "none";
      }
    });
  } */


};
