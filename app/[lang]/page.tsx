import Link from "next/link";
import { PageProps } from "@types";

export default function Page({ params: { lang } }: PageProps) {
  return (
    <>
      <Link href={`/${lang}/placeholder`}>Next Page</Link>
    </>
  );
}
