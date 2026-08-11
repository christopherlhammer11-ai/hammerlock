import { redirect } from "next/navigation";

export default function ActivatePage() {
  redirect("/get-app?notice=activation-retired");
}
