import dotenv from "dotenv";
dotenv.config();

import { callConfluenceCloudAPI } from "./services/atlassian";

const FAKE_EMPLOYEES = [
  { id: "EMP001", name: "Nguyen Van A", age: 30, department: "Software Development", role: "Senior Engineer", accessLevel: "Admin" },
  { id: "EMP002", name: "Tran Thi B", age: 25, department: "HR", role: "HR Specialist", accessLevel: "User" },
  { id: "EMP003", name: "Le Van C", age: 28, department: "Finance", role: "Accountant", accessLevel: "User" },
  { id: "EMP004", name: "Pham Van D", age: 35, department: "Security", role: "Security Lead", accessLevel: "Restricted" },
  { id: "EMP100", name: "Duong Duc Trong", age: 24, department: "Product", role: "Product Manager", accessLevel: "Admin" }
];

function generateHtmlTable() {
  let rows = FAKE_EMPLOYEES.map(emp => `
    <tr>
      <td>${emp.id}</td>
      <td>${emp.name}</td>
      <td>${emp.age}</td>
      <td>${emp.department}</td>
      <td>${emp.role}</td>
      <td>${emp.accessLevel}</td>
    </tr>
  `).join("");

  return `
    <p>This document contains the official directory of employees and their access levels for verification.</p>
    <table>
      <thead>
        <tr>
          <th>Employee ID</th>
          <th>Full Name</th>
          <th>Age</th>
          <th>Department</th>
          <th>Role</th>
          <th>Access Level</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

async function main() {
  try {
    const spaceKey = "Claw26Team210";
    const title = "Employee Directory";

    console.log(`Checking if page "${title}" exists...`);
    const searchResult = await callConfluenceCloudAPI(`/content?title=${encodeURIComponent(title)}&spaceKey=${spaceKey}`);

    if (searchResult.results && searchResult.results.length > 0) {
      console.log(`Page "${title}" already exists with ID: ${searchResult.results[0].id}`);
      return;
    }

    console.log(`Creating page "${title}" in space "${spaceKey}"...`);
    const bodyHtml = generateHtmlTable();
    const payload = {
      type: "page",
      title: title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: bodyHtml,
          representation: "storage"
        }
      }
    };

    const response = await callConfluenceCloudAPI("/content", "POST", payload);
    console.log(`Successfully created page. ID: ${response.id}`);
  } catch (error) {
    console.error("Error creating Employee Directory:", error);
  }
}

main();
