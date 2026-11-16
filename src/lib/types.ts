export type Meal = {
  id: string;
  name: string;
  image: string;
  category: string;
  area: string;
  instructions: string;
  ingredients: { name: string; measure: string }[];
  matches?: number;
};

export type Operation = {
  system: "TheMealDB" | "Supabase" | "Gemini";
  endpoint: string;
  method: string;
  status: number;
  ok: boolean;
  duration: number;
};

export type Favorite = { meal: Meal; note: string };
export type Adaptation = {
  id: string;
  meal: Meal;
  request: string;
  result: string;
  createdAt: string;
};
export type Message = { role: "user" | "model"; text: string };
export type Conversation = { id: string; title: string; messages: Message[]; createdAt: string };
export type AccountData = {
  pantry: string[];
  favorites: Record<string, Favorite>;
  adaptations: Adaptation[];
  conversations: Conversation[];
};
