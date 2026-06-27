/** Central React Query keys — avoid shape collisions between fetchers. */

export const queryKeys = {
  patientFields: {
    all: ["fields", "active"] as const,
    invalidate: () => [["fields", "active"], ["fields", "all"], ["fields", "recipe"]] as const,
  },
  fieldsAll: {
    all: ["fields", "all"] as const,
  },
  fieldsRecipe: {
    all: ["fields", "recipe"] as const,
  },
  recipeSettings: {
    all: ["recipe-settings"] as const,
  },
  waitingRoom: {
    all: ["waiting-room"] as const,
  },
  doctorQueue: {
    day: (day: string) => ["doctor-queue", day] as const,
  },
  secretaryDesk: {
    all: ["secretary-desk"] as const,
  },
} as const;
