export const ingredients = [
  { id: "chicken", label: "Vištiena", emoji: "🍗" },
  { id: "tomato", label: "Pomidorai", emoji: "🍅" },
  { id: "egg", label: "Kiaušiniai", emoji: "🥚" },
  { id: "cheese", label: "Sūris", emoji: "🧀" },
  { id: "potatoes", label: "Bulvės", emoji: "🥔" },
  { id: "rice", label: "Ryžiai", emoji: "🍚" },
  { id: "salmon", label: "Lašiša", emoji: "🐟" },
  { id: "carrots", label: "Morkos", emoji: "🥕" },
  { id: "onion", label: "Svogūnai", emoji: "🧅" },
  { id: "garlic", label: "Česnakai", emoji: "🧄" },
  { id: "pasta", label: "Makaronai", emoji: "🍝" },
  { id: "broccoli", label: "Brokoliai", emoji: "🥦" },
] as const;

export function ingredientLabel(id: string) {
  return ingredients.find((item) => item.id === id)?.label ?? id;
}

export const categories = [
  { id: "", label: "Visi receptai", emoji: "🍽️" },
  { id: "Chicken", label: "Vištiena", emoji: "🍗" },
  { id: "Vegetarian", label: "Vegetariški", emoji: "🥬" },
  { id: "Pasta", label: "Makaronai", emoji: "🍝" },
  { id: "Seafood", label: "Jūros gėrybės", emoji: "🦐" },
  { id: "Dessert", label: "Desertai", emoji: "🍰" },
  { id: "Breakfast", label: "Pusryčiai", emoji: "🥞" },
];
