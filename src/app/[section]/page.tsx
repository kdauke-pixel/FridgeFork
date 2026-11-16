import { notFound } from "next/navigation";
import { KitchenPage, SavedPage, AdaptationsPage } from "@/components/collections";
import { AssistantPage } from "@/components/assistant";
import { AuthPage } from "@/components/auth";

const titles: Record<string, string> = {
  "mano-virtuve": "Mano virtuvė",
  "mano-receptai": "Mano receptai",
  "mano-ai-receptai": "Mano AI receptai",
  "ai-asistentas": "AI virtuvės asistentas",
  prisijungti: "Prisijungti",
  registruotis: "Registruotis",
  "atkurti-slaptazodi": "Atkurti slaptažodį",
  "naujas-slaptazodis": "Naujas slaptažodis",
};
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: titles[section] ?? "Puslapis nerastas" };
}
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  switch (section) {
    case "mano-virtuve":
      return <KitchenPage />;
    case "mano-receptai":
      return <SavedPage />;
    case "mano-ai-receptai":
      return <AdaptationsPage />;
    case "ai-asistentas":
      return <AssistantPage />;
    case "prisijungti":
    case "registruotis":
    case "atkurti-slaptazodi":
    case "naujas-slaptazodis":
      return <AuthPage mode={section} />;
    default:
      notFound();
  }
}
