// Store mapping of branch code to full name
let branchMap = {};
let collegeMap = {};
let cutoffData = [];

let cutoffMargin = 1.0;
let avgcutOffMargin = 0.5;
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

function loadCSVAndPopulateBranches() {
  Papa.parse("data/cleansed/2024_tnea_cutoff_data.csv", {
    download: true,
    header: true,
    complete: function(results) {
      cutoffData = results.data;

      /* const branchSet = new Set();
      results.data.forEach(row => {
        const BranchCode = row.BranchCode?.trim();
        const name = row.Branch?.trim();
        if (BranchCode && name && !branchMap[BranchCode]) {
          branchMap[BranchCode] = name;
          branchSet.add(BranchCode);
        }
      });

      // Populate dropdown
      const branchDropdown = document.getElementById("branch");
      const sortedCodes = [...branchSet].sort();
      sortedCodes.forEach(BranchCode => {
        const option = document.createElement("option");
        option.value = BranchCode;
        option.textContent = `[${BranchCode}] ${branchMap[BranchCode]}`;
        branchDropdown.appendChild(option);
      } ); */
    }
  });
}

function loadBranchListFromCSV() {
  Papa.parse("data/branch_list.csv", {
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
  Papa.parse("data/college_list_w_district.csv", {
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
  Papa.parse("data/district_list.csv", {
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


function findColleges() {
  const rawCutoffInput = document.getElementById("cutoff").value;
  const rawCutoff = parseFloat(rawCutoffInput);

  // Check if the entered cutoff is a valid number
  if (isNaN(rawCutoffInput) || isNaN(rawCutoff)) {
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

// On page load
window.onload = () => {
  loadCSVAndPopulateBranches();
  loadBranchListFromCSV();
  loadCollegeListFromCSV();
  loadDistrictListFromCSV();
  lucide.createIcons();


  document.addEventListener("DOMContentLoaded", function () {
    const tneaContainer = document.querySelector(".tnea-link");
    if (tneaContainer) {
      tneaContainer.addEventListener("click", function () {
        window.location.href = "TNEA.html";
      });
    }
  });

  // Cutoff input validation + formatting
  const cutoffInput = document.getElementById("cutoff");
  const warningText = document.getElementById("cutoffWarning");

  cutoffInput.addEventListener("input", function () {
    let value = parseFloat(cutoffInput.value);

    if (isNaN(value)) {
      cutoffInput.style.boxShadow = "";
      warningText.style.display = "none";
      return;
    }


    // Validation
    if (value < 70 || value > 200) {
      cutoffInput.style.boxShadow = "0 0 8px 2px red";
      warningText.style.display = "inline";
    } else {
      cutoffInput.style.boxShadow = "0 0 6px 2px #2196f3";
      warningText.style.display = "none";
    }
  });
};
