import { createClient } from "@/lib/supabase/server";
import PlanningClient from "./PlanningClient";

const WEEKDAY_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "short" });

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function PlanningPage() {
  const supabase = await createClient();

  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const [{ data: entries }, { data: favorites }] = await Promise.all([
    supabase
      .from("meal_plan")
      .select("id, plan_date, meal_slot, title, estimated_calories_per_serving")
      .in("plan_date", dates),
    supabase.from("favorite_recipes").select("id, title, estimated_calories_per_serving").order("created_at", { ascending: false }),
  ]);

  const days = dates.map((date) => {
    const dejeuner = entries?.find((e) => e.plan_date === date && e.meal_slot === "dejeuner") ?? null;
    const diner = entries?.find((e) => e.plan_date === date && e.meal_slot === "diner") ?? null;
    return { date, label: capitalize(WEEKDAY_FMT.format(new Date(date + "T12:00:00"))), dejeuner, diner };
  });

  return <PlanningClient days={days} favorites={favorites ?? []} />;
}
