// Store mapping of branch code to full name
let branchMap = {};
let collegeMap = {};
let cutoffData = [];



function loadCSVAndPopulateBranches() {
  Papa.parse("data/2024_tnea_cutoff_data.csv", {
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
  Papa.parse("data/college_code_list.csv", {
    download: true,
    header: true,
    complete: function(results) {
      const collegeCodeDropdown = document.getElementById("collegeCode");

      results.data.forEach(row => {
        const colCode = row.collegeCode?.trim();
        const colName = row.college?.trim();
        if (colCode && colName && !collegeMap[colCode]) {
          collegeMap[colCode] = colName;
          const option = document.createElement("option");
          option.value = colCode;
          option.textContent = `[${colCode}] ${colName}`;
          collegeCodeDropdown.appendChild(option);
        }
      });
    }
  });
}


function findColleges() {
  const cutoff = parseFloat(document.getElementById("cutoff").value);
  const category = document.getElementById("category").value;
  // const city = document.getElementById("city").value.toLowerCase();
  const branch = document.getElementById("branch").value;
  const collegeCode = document.getElementById("collegeCode").value;

  if (isNaN(cutoff)) {
    alert("Please enter a valid cutoff mark.");
    return;
  }

const filtered = cutoffData
  .map(row => {
    const rawValue = ((row[category]?.replace(/\*/g, "0")) ?? "0").trim();
    const mark = parseFloat(rawValue);
    return { ...row, mark }; // attach the mark
  })
  .filter(row => {
    const matchCutoff = !isNaN(row.mark) && cutoff >= row.mark;
    // const matchCity = !city || row.College.toLowerCase().includes(city);
    const matchBranch = !branch || row.BranchCode === branch;
    const matchCollegeCode = !collegeCode || row.CollegeCode === collegeCode;
    return matchCutoff && matchBranch && matchCollegeCode ; // && matchCity;
  });

  // Sort by cutoff descending for selected category
  filtered.sort((a, b) => parseFloat(b.mark) - parseFloat(a.mark));

  const results = filtered.slice(0, 20);
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
    <th>College Name</th>
    <th>Branch Code</th>
    <th>Branch Name</th>
    <th>Cutoff</th>
  </tr>`;
table.appendChild(thead);

const tbody = document.createElement("tbody");

results.forEach(row => {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${row.CollegeCode}</td>
    <td>${row.College}</td>
    <td>${row.BranchCode}</td>
    <td>${row.Branch}</td>
    <td>${(row[category]?.replace(/\*/g, "0") || "0") }</td>
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