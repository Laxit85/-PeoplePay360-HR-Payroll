// src/modules/employee/employee.controller.js
const employeeController = require('../../controllers/employeeController');

module.exports = {
  list: employeeController.getEmployees,
  getById: employeeController.getEmployeeById,
  create: employeeController.createEmployee,
  update: employeeController.updateEmployee,
  delete: employeeController.deleteEmployee
};

