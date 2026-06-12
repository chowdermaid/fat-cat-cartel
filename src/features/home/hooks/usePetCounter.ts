import { useState } from "react";

export function usePetCounter() {
  const [pets, setPets] = useState(0);

  return {
    pets,
    addPet: () => setPets((current) => current + 1),
  };
}
