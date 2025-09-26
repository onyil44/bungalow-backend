export const roleHierarchy = {
  receptionist: [],
  manager: ["receptionist"],
  admin: ["receptionist", "manager", "admin"],
  superAdmin: ["receptionist", "manager", "admin", "superAdmin"], // Tüm roller görebilir (filtre yok)
};
