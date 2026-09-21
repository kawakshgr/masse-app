import { redirect } from "next/navigation";

export default function Home() {
  // The coach's job is the product. Land her on the roster.
  redirect("/clients");
}
