import { redirect } from "next/navigation";

export default function LegacyCheckoutSuccessPage() {
  redirect("/get-app?notice=checkout-retired");
}
