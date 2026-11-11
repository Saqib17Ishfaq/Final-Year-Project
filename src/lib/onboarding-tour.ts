/**
 * OrthoAI Guided Onboarding Tour — Configuration
 *
 * Defines per-role tour steps and initialization logic for driver.js.
 */

import { driver, type Driver, type DriveStep } from 'driver.js'

export const TOUR_STORAGE_KEY = 'orthoai_has_seen_tour'

/**
 * Helper: triggers navigation when a nav link is clicked, then waits
 * for the new page to render before moving to the next tour step.
 */
const navigateAndProceed = (el: Element | undefined, step: DriveStep, options: { driver: Driver }) => {
  if (el instanceof HTMLElement) {
    el.click()
  }
  // Wait for Next.js to navigate and render the new page
  setTimeout(() => {
    options.driver.moveNext()
  }, 800)
}

/* ── Shared steps ──────────────────────────────────────────────────── */

const STEP_SIDEBAR_TOGGLE: DriveStep = {
  element: '#tour-sidebar-toggle',
  popover: {
    title: 'Navigation',
    description: 'Open the menu to navigate between clinic sections.',
    side: 'bottom',
    align: 'start',
  },
}

const STEP_PROFILE: DriveStep = {
  element: '#tour-profile-menu',
  popover: {
    title: 'Profile & Settings',
    description: 'Access settings, manage your profile picture, replay this tour, or securely log out.',
    side: 'bottom',
    align: 'end',
  },
}

const STEP_FINISH: DriveStep = {
  popover: {
    title: 'You\'re All Set! 🎉',
    description: 'You can replay this tour anytime from the <strong>Settings</strong> page. Enjoy using OrthoAI!',
  },
}

/* ── Dentist steps ─────────────────────────────────────────────────── */

const DENTIST_STEPS: DriveStep[] = [
  STEP_SIDEBAR_TOGGLE,
  
  // Dashboard
  {
    element: '#tour-dentist-dashboard-nav',
    popover: {
      title: 'Dashboard',
      description: 'First, let\'s look at your Dashboard. Click Next to go there.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  {
    element: '#tour-dentist-stats',
    popover: {
      title: 'Daily Summary',
      description: 'At a glance: your total patients, today\'s appointments, and waiting room status.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-dentist-schedule',
    popover: {
      title: 'Today\'s Schedule',
      description: 'Your scheduled appointments for the day are listed here.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#tour-dentist-activity',
    popover: {
      title: 'Recent Activity',
      description: 'A feed of the most recent actions and appointments across the clinic.',
      side: 'left',
      align: 'start',
    },
  },

  // Schedule
  {
    element: '#tour-schedule-nav',
    popover: {
      title: 'Schedule Navigation',
      description: 'Let\'s move to the detailed Schedule page. Click Next to go there.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  {
    element: '#tour-schedule-list',
    popover: {
      title: 'Patient Queue',
      description: 'Manage today\'s patients. You can mark them as "In Treatment" or "Completed" from here.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#tour-schedule-calendar',
    popover: {
      title: 'Calendar View',
      description: 'Drag and drop appointments to reschedule, or click to add new ones.',
      side: 'left',
      align: 'start',
    },
  },

  // Patients
  {
    element: '#tour-patients-nav',
    popover: {
      title: 'Patients Directory',
      description: 'Let\'s check the Patients directory. Click Next to go there.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  {
    element: '#tour-patients-search',
    popover: {
      title: 'Search Patients',
      description: 'Quickly find a patient by name, ID code, phone, or email.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-patients-list',
    popover: {
      title: 'Patient Records',
      description: 'Click on any patient to view their full demographics, treatment history, and past X-rays.',
      side: 'top',
      align: 'start',
    },
  },

  // X-Ray Lab
  {
    element: '#tour-xray-lab-nav',
    popover: {
      title: 'X-Ray Lab ✨',
      description: 'Now for the core feature: The X-Ray Lab. Click Next to go there.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  {
    element: '#tour-xray-canvas',
    popover: {
      title: 'Imaging & AI View',
      description: 'Upload an X-Ray here. OrthoAI will automatically detect anatomical structures and pathologies.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#tour-xray-report',
    popover: {
      title: 'AI Treatment Report',
      description: 'Generate a comprehensive, printable clinical report with a single click after reviewing the AI findings.',
      side: 'bottom',
      align: 'end',
    },
  },

  // About Our AI
  {
    element: '#tour-about-ai-nav',
    popover: {
      title: 'About Our AI',
      description: 'Curious how the AI works? Click Next to see model transparency.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  {
    element: '#tour-ai-limitations',
    popover: {
      title: 'Known Limitations',
      description: 'Review edge cases and limitations so you always know when to trust the AI and when to double-check.',
      side: 'top',
      align: 'start',
    },
  },

  STEP_PROFILE,
  STEP_FINISH,
]

/* ── Staff (Receptionist) steps ────────────────────────────────────── */

const STAFF_STEPS: DriveStep[] = [
  STEP_SIDEBAR_TOGGLE,
  {
    element: '#tour-staff-dashboard-nav',
    popover: {
      title: 'Dashboard',
      description: 'Your home base. Click Next to navigate.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  {
    element: '#tour-appointments-nav',
    popover: {
      title: 'Appointments',
      description: 'Manage the calendar from here. Click Next to navigate.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  {
    element: '#tour-staff-patients-nav',
    popover: {
      title: 'Patients',
      description: 'Register new patients here. Click Next to navigate.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  STEP_PROFILE,
  STEP_FINISH,
]

/* ── Admin steps ──────────────────────────────────────────────────── */

const ADMIN_STEPS: DriveStep[] = [
  STEP_SIDEBAR_TOGGLE,
  {
    element: '#tour-admin-dashboard-nav',
    popover: {
      title: 'Admin Dashboard',
      description: 'Overview of system status. Click Next to navigate.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  {
    element: '#tour-admin-users-nav',
    popover: {
      title: 'User Management',
      description: 'Create and edit accounts. Click Next to navigate.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  {
    element: '#tour-admin-settings-nav',
    popover: {
      title: 'Clinic Settings',
      description: 'Configure global preferences. Click Next to navigate.',
      side: 'right',
      align: 'start',
      onNextClick: navigateAndProceed,
    },
  },
  STEP_PROFILE,
  STEP_FINISH,
]

/* ── Step map by role ──────────────────────────────────────────────── */

const ROLE_STEPS: Record<string, DriveStep[]> = {
  dentist: DENTIST_STEPS,
  staff: STAFF_STEPS,
  admin: ADMIN_STEPS,
}

/* ── Factory ──────────────────────────────────────────────────────── */

export const initTour = (role: string): Driver => {
  const steps = ROLE_STEPS[role] || DENTIST_STEPS
  return driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: 'rgba(0,0,0,0.6)',
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: 'orthoai-tour-popover',
    doneBtnText: 'Finish',
    nextBtnText: 'Next →',
    prevBtnText: '← Prev',
    steps,
  })
}
