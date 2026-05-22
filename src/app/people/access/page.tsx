import { redirect } from "next/navigation";

export default function PeopleAccessRedirectPage() {
  redirect("/users/access");
}
