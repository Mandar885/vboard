export type DevPersona = {
  key: string
  name: string
  email: string
  label: string
  description: string
}

export const DEV_PERSONAS: DevPersona[] = [
  {
    key: "super-admin",
    name: "Harshal More",
    email: "harshal.more@vit.edu.in",
    label: "Super admin",
    description: "Manages the platform and assigns community Leads.",
  },
  {
    key: "lead",
    name: "Aarav Mehta",
    email: "aarav.mehta@vit.edu.in",
    label: "Lead",
    description: "Runs GDG, manages its team and appoints Organizers.",
  },
  {
    key: "organizer",
    name: "Sneha Iyer",
    email: "sneha.iyer@vit.edu.in",
    label: "Organizer",
    description: "Runs Coding Club events, registrations and attendance.",
  },
  {
    key: "student",
    name: "Priya Nair",
    email: "priya.nair@vit.edu.in",
    label: "Student",
    description: "Registers for events and manages her own profile.",
  },
]

export function findPersona(key: string | undefined): DevPersona | undefined {
  if (!key) return undefined
  return DEV_PERSONAS.find((p) => p.key === key)
}
