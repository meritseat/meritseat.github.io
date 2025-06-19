// Store mapping of branch code to full name
let branchMap = {};
let cutoffData = [];

function loadCSVAndPopulateBranches() {
  Papa.parse("data/2024_tnea_cutoff_data.csv", {
    download: true,
    header: true,
    complete: function(results) {
      cutoffData = results.data;
      const branchSet = new Set();

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
      });
    }
  });
}

function findColleges() {
  const cutoff = parseFloat(document.getElementById("cutoff").value);
  const category = document.getElementById("category").value;
  const city = document.getElementById("city").value.toLowerCase();
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
    const matchCity = !city || row.College.toLowerCase().includes(city);
    const matchBranch = !branch || row.BranchCode === branch;
    const matchCollegeCode = !collegeCode || row.CollegeCode === collegeCode;
    return matchCutoff && matchCity && matchBranch && matchCollegeCode;
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
  lucide.createIcons();
};
