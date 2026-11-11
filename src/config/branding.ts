import { clinicConfig } from "../../config/clinic.config";

// Re-export the clinic config for convenience
export { clinicConfig };

/**
 * Backward-compatible branding object.
 * Every value now derives from the single clinic config.
 */
export const branding = {
  name: clinicConfig.name,
  description: clinicConfig.description,
  logo: {
    text: clinicConfig.name,
    image: clinicConfig.logo.url,
  },
  company: {
    name: clinicConfig.name,
    address: clinicConfig.contact.address,
    email: clinicConfig.contact.email,
    phone: clinicConfig.contact.phone,
  },
  features: {
    enablePatientPortal: true,
    enableAiAnalysis: true,
  },
};

export const navigation = {
  sidebar: {
    dentist: [
      { href: "/dentist", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/dentist/schedule", label: "Schedule", icon: "Calendar" },
      { href: "/dentist/patients", label: "Patients", icon: "Users" },
      { href: "/dentist/xray-lab", label: "X-Ray Lab", icon: "FileDigit" },
      { href: "/dentist/model-transparency", label: "About Our AI", icon: "Brain" },
      { href: "/dentist/settings", label: "Settings", icon: "Settings" },
    ],
    staff: [
      { href: "/receptionist", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/receptionist/appointments", label: "Appointments", icon: "Calendar" },
      { href: "/receptionist/patients", label: "Patients", icon: "Users" },
      { href: "/receptionist/settings", label: "Settings", icon: "Settings" },
    ],
    admin: [
      { href: "/admin", label: "Admin Dashboard", icon: "LayoutDashboard" },
      { href: "/admin/users", label: "Users", icon: "Users" },
      { href: "/admin/settings", label: "Settings", icon: "Settings" },
      // Access to other dashboards for testing
      { href: "/dentist", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/dentist/schedule", label: "Schedule", icon: "Calendar" },
      { href: "/dentist/patients", label: "Patients", icon: "Users" },
      { href: "/dentist/xray-lab", label: "X-Ray Lab", icon: "FileDigit" },
      { href: "/receptionist", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/receptionist/appointments", label: "Appointments", icon: "Calendar" },
      { href: "/receptionist/patients", label: "Patients", icon: "Users" },
    ],
  },
};
