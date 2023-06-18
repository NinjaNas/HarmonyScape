import { PageProps } from "@types";
import Link from "next/link";

export default function Page({ params: { lang } }: PageProps) {
  return (
    <>
      <Link href={`/${lang}`}>Back</Link>
    </>
  );
}
