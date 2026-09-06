// src/modules/attendance/attendance.controller.js
const attendanceController = require('../../controllers/attendanceController');

module.exports = {
  checkIn: attendanceController.checkIn,
  checkOut: attendanceController.checkOut,
  clock: attendanceController.clock,
  list: attendanceController.getAttendances,
  getStats: attendanceController.getStats
};

